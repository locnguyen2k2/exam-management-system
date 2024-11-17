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
import { BusinessException } from '~/common/exceptions/biz.exception';
import { PermissionService } from '~/modules/system/permission/permission.service';
import { PermissionEntity } from '~/modules/system/permission/entities/permission.entity';
import { ErrorEnum } from '~/common/enums/error.enum';

import * as _ from 'lodash';
import { searchIndexes } from '~/utils/search';
import { RoleEnum } from '~/modules/system/role/role.constant';
import { UserService } from '~/modules/system/user/user.service';
import { paginate } from '~/helpers/paginate/paginate';
import { PermissionPageOptions } from '~/modules/system/permission/dtos/permission-req.dto';
import {
  regSpecialChars,
  regWhiteSpace,
} from '~/common/constants/regex.constant';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly roleRepository: MongoRepository<RoleEntity>,
    @Inject(forwardRef(() => UserService))
    @Inject(forwardRef(() => PermissionService))
    private readonly userService: UserService,
    private readonly permissionService: PermissionService,
  ) {}

  async findAll(pageOptions: RolePageOptions = new RolePageOptions()) {
    const filterOptions = [
      {
        $match: {
          ...(!_.isEmpty(pageOptions.value) && {
            value: { $in: pageOptions.value },
          }),
          ...(!_.isNil(pageOptions.enable) && {
            enable: pageOptions.enable,
          }),
        },
      },
    ];

    return paginate(
      this.roleRepository,
      { pageOptions, filterOptions },
      searchIndexes(pageOptions.keyword),
    );
  }

  async findOne(id: string): Promise<RoleEntity> {
    const role = await this.roleRepository.findOne({ where: { id } });
    if (role) return role;
    throw new BusinessException(ErrorEnum.RECORD_NOT_FOUND, id);
  }

  async findByValue(value: string): Promise<RoleEntity> {
    const isExisted = await this.roleRepository.findOne({ where: { value } });
    if (isExisted) return isExisted;
    throw new NotFoundException(ErrorEnum.RECORD_NOT_FOUND, value);
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
        'permissions.id': {
          $all: [perId],
        },
      },
    });
  }

  async create(data: RoleCreateDto): Promise<RoleEntity> {
    const perIds = this.handleIds(data.permissionIds);
    const permissions: PermissionEntity[] = [];

    const isExisted = await this.findByName(data.name);
    if (isExisted)
      throw new BusinessException(ErrorEnum.RECORD_EXISTED, data.name);

    await Promise.all(
      perIds.map(async (perId) => {
        const isPermission = await this.permissionService.findOne(perId);
        permissions.push(isPermission);
      }),
    );

    delete data.permissionIds;
    const role = new RoleEntity({
      ...data,
      permissions,
      create_by: data.createBy,
      update_by: data.createBy,
    });
    const newRole = this.roleRepository.create(role);
    return await this.roleRepository.save(newRole);
  }

  handleIds(ids: string[]): string[] {
    let result: string[] = [];
    ids.map((id) => {
      result = [...result.filter((handleId) => handleId !== id), id];
    });

    return result;
  }

  async update(id: string, data: UpdateRoleDto): Promise<RoleEntity> {
    await this.findOne(id);
    let permissions: PermissionEntity[] = [];

    if (!_.isNil(data?.permissionIds)) {
      const perIds = this.handleIds(data.permissionIds);
      permissions = await this.permissionService.getList(perIds);
    }

    await this.roleRepository.update(
      { id },
      {
        ...(data.name && { name: data.name }),
        ...(data.value && { value: data.value }),
        ...(data.remark && { remark: data.remark }),
        ...(!_.isNil(data?.enable) && { enable: data.enable }),
        ...(!_.isNil(data?.permissionIds) && { permissions: permissions }),
        ...(data?.updateBy && { update_by: data.updateBy }),
        updated_at: data.updated_at,
      },
    );

    const result = await this.findOne(id);
    const users = await this.userService.findByRole(id);

    await Promise.all(
      users.map(async (user) => {
        await this.userService.update(user.id, {
          roleIds: [id],
        });
      }),
    );

    return result;
  }

  async deleteMany(ids: string[]): Promise<string> {
    const roleIds = this.handleIds(ids);

    await Promise.all(
      ids.map(async (id) => {
        const isExisted = await this.findOne(id);
        if (RoleEnum[`${isExisted.value.toUpperCase()}`])
          throw new BusinessException(
            `400:Không thể xóa quyền này! "${isExisted.value}"`,
          );
      }),
    );

    await Promise.all(
      roleIds.map(async (roleId) => {
        const isExisted = await this.userService.findByRole(roleId);

        if (isExisted.length !== 0)
          throw new BusinessException(ErrorEnum.RECORD_IN_USED, roleId);
      }),
    );

    await this.roleRepository.deleteMany({
      id: {
        $in: roleIds,
      },
    });

    throw new BusinessException('200:Thao tác thành công');
  }
}
