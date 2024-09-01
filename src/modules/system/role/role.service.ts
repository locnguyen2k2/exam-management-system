import {
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { RoleEntity } from '~/modules/system/role/entities/role.entity';
import {
  RoleCreateDto,
  RolePageOptions,
  UpdateRoleDto,
} from '~/modules/system/role/dtos/role-req.dto';
import { RolePagination } from '~/modules/system/role/dtos/role-res.dto';
import { PageMetaDto } from '~/common/dtos/pagination/page-meta.dto';
import { BusinessException } from '~/common/exceptions/biz.exception';
import { PermissionService } from '~/modules/system/permission/permission.service';
import { PermissionEntity } from '~/modules/system/permission/entities/permission.entity';
import { ErrorEnum } from '~/common/enums/error.enum';

import * as _ from 'lodash';
import { searchIndexes } from '~/utils/search';
import { pipeLine } from '~/utils/pagination';
import { RoleEnum } from '~/modules/system/role/role.constant';
import { UserService } from '~/modules/system/user/user.service';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly roleRepository: MongoRepository<RoleEntity>,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    private readonly permissionService: PermissionService,
  ) {}

  async findAll(
    pageOptions: RolePageOptions = new RolePageOptions(),
  ): Promise<RolePagination> {
    const filterOptions = {
      ...(!_.isEmpty(pageOptions.value) && {
        value: { $in: pageOptions.value },
      }),
      ...(!_.isNil(pageOptions.enable) && {
        enable: pageOptions.enable,
      }),
    };

    const pipes = [
      searchIndexes(pageOptions.keyword),
      ...pipeLine(pageOptions, filterOptions),
    ];

    const [{ data, pageInfo }]: any[] = await this.roleRepository
      .aggregate(pipes)
      .toArray();

    const entities = data;
    const numberRecords = data.length > 0 && pageInfo[0].numberRecords;
    const pageMetaDto = new PageMetaDto({
      pageOptions,
      numberRecords,
    });
    return new RolePagination(entities, pageMetaDto);
  }

  async findOne(id: string): Promise<RoleEntity> {
    const role = await this.roleRepository.findOne({ where: { id } });
    if (role) return role;
    throw new BusinessException(ErrorEnum.RECORD_NOT_FOUND);
  }

  async findByValue(value: string): Promise<RoleEntity> {
    const isExisted = await this.roleRepository.findOne({ where: { value } });
    if (isExisted) return isExisted;
    throw new NotFoundException(ErrorEnum.RECORD_NOT_FOUND);
  }

  async findByName(name: string): Promise<RoleEntity> {
    const isExisted = await this.roleRepository.findOneBy({
      name: { $regex: new RegExp(name.replace(/\s+/g, '\\s*'), 'i') },
    });
    if (isExisted) return isExisted;
  }

  async findByPermission(perId: string): Promise<RoleEntity[]> {
    return await this.roleRepository.find({
      where: {
        perIds: {
          $all: [perId],
        },
      },
    });
  }

  async getPermissions(id: string): Promise<any> {
    const isRole = await this.findOne(id);
    const permissions: PermissionEntity[] = await Promise.all(
      isRole.perIds.map(
        async (perId) => await this.permissionService.findOne(perId),
      ),
    );
    return { ...isRole, permissions };
  }

  async create(data: RoleCreateDto): Promise<RoleEntity> {
    const perIds: string[] = [];

    const isExisted = await this.findByName(data.name);
    if (isExisted) throw new BusinessException(ErrorEnum.RECORD_EXISTED);

    await Promise.all(
      data.permissionIds.map(async (perId) => {
        const isExisted = await this.permissionService.findOne(perId);
        if (isExisted) {
          try {
            const role = await this.findByValue(data.value);
            if (!(await this.roleHasPermission(role.id, isExisted.id))) {
              perIds.push(isExisted.id);
            }
          } catch {
            perIds.push(isExisted.id);
          }
        }
      }),
    );

    delete data.permissionIds;
    const role = new RoleEntity({
      ...data,
      perIds: perIds,
      create_by: data.createBy,
      update_by: data.createBy,
    });
    const newRole = this.roleRepository.create(role);
    return await this.roleRepository.save(newRole);
  }

  async update(id: string, data: UpdateRoleDto): Promise<RoleEntity> {
    const isExisted = await this.findOne(id);
    const listPermissions: string[] = [];

    data?.permissionIds &&
      (await Promise.all(
        data.permissionIds.map(async (perId) => {
          await this.permissionService.findOne(perId);
          const index = listPermissions.findIndex((per) => per === perId);
          index === -1 && listPermissions.push(perId);
        }),
      ));

    const { affected } = await this.roleRepository.update(
      { id },
      {
        ...(data.name && { name: data.name }),
        ...(data.value && { value: data.value }),
        ...(data.remark && { remark: data.remark }),
        ...(!_.isNil(data?.enable) && { enable: data.enable }),
        ...(listPermissions.length > 0 && { perIds: listPermissions }),
        ...(data?.updateBy && { update_by: data.updateBy }),
      },
    );

    return affected === 0 ? isExisted : await this.findOne(id);
  }

  async deleteMany(ids: string[]): Promise<string> {
    await Promise.all(
      ids.map(async (id) => {
        const isExisted = await this.findOne(id);
        if (RoleEnum[`${isExisted.value.toUpperCase()}`])
          throw new BusinessException(
            `400:Không thể xóa quyền này! "${isExisted.value}"`,
          );
      }),
    );
    const listRoles: string[] = [];

    await Promise.all(
      ids.map(async (roleId) => {
        const isExisted = await this.userService.findByRole(roleId);

        isExisted.length === 0 &&
          listRoles.findIndex((rid) => rid === roleId) === -1 &&
          listRoles.push(roleId);
      }),
    );

    if (listRoles.length === 0)
      throw new BusinessException(ErrorEnum.RECORD_IN_USED);

    await this.roleRepository.deleteMany({
      id: {
        $in: listRoles,
      },
    });

    throw new BusinessException('200:Thao tác thành công');
  }

  async roleHasPermission(rid: string, perId: string): Promise<boolean> {
    const role = await this.roleRepository.findOne({
      where: { id: rid, perIds: perId },
    });
    return !!role;
  }
}
