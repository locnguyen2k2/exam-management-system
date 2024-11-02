import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PermissionEntity } from '~/modules/system/permission/entities/permission.entity';
import { MongoRepository } from 'typeorm';
import {
  CreatePermissionDto,
  PermissionPageOptions,
  UpdatePermissionDto,
} from '~/modules/system/permission/dtos/permission-req.dto';
import { BusinessException } from '~/common/exceptions/biz.exception';
import { ErrorEnum } from '~/common/enums/error.enum';

import * as _ from 'lodash';
import { searchIndexes } from '~/utils/search';
import {
  regSpecialChars,
  regWhiteSpace,
} from '~/common/constants/regex.constant';
import { RoleService } from '~/modules/system/role/role.service';
import { PermissionEnum } from '~/modules/system/permission/permission.constant';
import { paginate } from '~/helpers/paginate/paginate';

@Injectable()
export class PermissionService {
  constructor(
    @InjectRepository(PermissionEntity)
    private readonly permissionRepository: MongoRepository<PermissionEntity>,
    @Inject(forwardRef(() => RoleService))
    private readonly roleService: RoleService,
  ) {}

  async findAll(
    pageOptions: PermissionPageOptions = new PermissionPageOptions(),
  ) {
    const filterOptions = {
      ...(!_.isEmpty(pageOptions.value) && {
        value: {
          $regex: pageOptions.value
            .replace(regSpecialChars, '\\$&')
            .replace(regWhiteSpace, '\\s*'),
          $options: 'i',
        },
      }),
      ...(!_.isNil(pageOptions.enable) && {
        enable: pageOptions.enable,
      }),
      ...(!_.isNil(pageOptions.permissionStatus) && {
        status: pageOptions.permissionStatus,
      }),
    };

    return paginate(
      this.permissionRepository,
      { pageOptions, filterOptions },
      searchIndexes(pageOptions.keyword),
    );
  }

  async findOne(id: string): Promise<PermissionEntity> {
    const item = await this.permissionRepository.findOne({ where: { id } });
    if (item) return item;
    throw new BusinessException(ErrorEnum.RECORD_NOT_FOUND, id);
  }

  async create(data: CreatePermissionDto): Promise<PermissionEntity> {
    const isExisted = await this.isExisted(data.value);

    if (isExisted)
      throw new BusinessException(ErrorEnum.RECORD_EXISTED, data.value);
    const item = new PermissionEntity({
      ...data,
      create_by: data.createBy,
      update_by: data.createBy,
    });
    const newItem = this.permissionRepository.create(item);
    return await this.permissionRepository.save(newItem);
  }

  async getList(ids: string[]): Promise<PermissionEntity[]> {
    return await Promise.all(ids.map(async (id) => await this.findOne(id)));
  }

  async update(
    id: string,
    data: UpdatePermissionDto,
  ): Promise<PermissionEntity> {
    await this.findOne(id);
    const roles = await this.roleService.findByPermission(id);

    await this.permissionRepository.update(
      { id },
      {
        ...(data.name && { name: data.name }),
        ...(data.value && { value: data.value }),
        ...(data.remark && { remark: data.remark }),
        ...(!_.isNil(data.enable) && { enable: data.enable }),
        update_by: data.updateBy,
      },
    );
    const result = await this.findOne(id);

    await Promise.all(
      roles.map(async (role) => {
        await this.roleService.update(role.id, {
          updateBy: data.updateBy,
          permissionIds: role.permissions.map((permission) => permission.id),
        });
      }),
    );

    return result;
  }

  async deleteMany(ids: string[]): Promise<string> {
    await Promise.all(
      ids.map(async (id) => {
        const isExisted = await this.findOne(id);
        if (PermissionEnum[`${isExisted.value.toUpperCase()}`])
          throw new BusinessException(
            `400:Không thể xóa phân quyền này "${isExisted.value}"!`,
          );
      }),
    );

    const permissions: string[] = [];

    await Promise.all(
      ids.map(async (perId) => {
        const isExisted = await this.roleService.findByPermission(perId);

        isExisted.length === 0 &&
          permissions.findIndex((id) => id === perId) === -1 &&
          permissions.push(perId);
      }),
    );

    if (permissions.length === 0)
      throw new BusinessException(ErrorEnum.RECORD_IN_USED);

    await this.permissionRepository.deleteMany({
      id: {
        $in: ids,
      },
    });

    throw new BusinessException('200:Xóa thành công!');
  }

  async isExisted(value: string): Promise<boolean> {
    const isExisted = await this.permissionRepository.findOne({
      where: {
        value,
      },
    });
    return !!isExisted;
  }
}
