import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PermissionEntity } from '~/modules/system/permission/entities/permission.entity';
import { MongoRepository } from 'typeorm';
import { PermissionPaginationDto } from '~/modules/system/permission/dtos/permission-res.dto';
import { PageMetaDto } from '~/common/dtos/pagination/page-meta.dto';
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
import { pipeLine } from '~/utils/pagination';
import { RoleService } from '~/modules/system/role/role.service';
import { PermissionEnum } from '~/modules/system/permission/permission.constant';

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
  ): Promise<PermissionPaginationDto> {
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

    const pipes = [
      searchIndexes(pageOptions.keyword),
      ...pipeLine(pageOptions, filterOptions),
    ];

    const [{ data, pageInfo }]: any[] = await this.permissionRepository
      .aggregate(pipes)
      .toArray();

    const entities = data;
    const numberRecords = data.length > 0 && pageInfo[0].numberRecords;
    const pageMetaDto = new PageMetaDto({
      pageOptions,
      numberRecords,
    });

    return new PermissionPaginationDto(entities, pageMetaDto);
  }

  async findOne(id: string): Promise<PermissionEntity> {
    const item = await this.permissionRepository.findOne({ where: { id } });
    if (item) return item;
    throw new BusinessException(ErrorEnum.RECORD_NOT_FOUND);
  }

  async create(data: CreatePermissionDto): Promise<PermissionEntity> {
    const isExisted = await this.isExisted(data.value);

    if (isExisted) throw new BusinessException(ErrorEnum.RECORD_EXISTED);
    const item = new PermissionEntity({
      ...data,
      create_by: data.createBy,
      update_by: data.createBy,
    });
    const newItem = this.permissionRepository.create(item);
    return await this.permissionRepository.save(newItem);
  }

  async update(
    id: string,
    data: UpdatePermissionDto,
  ): Promise<PermissionEntity> {
    const isExisted = await this.findOne(id);
    const { affected } = await this.permissionRepository.update(
      { id },
      {
        ...(data.name && { name: data.name }),
        ...(data.value && { value: data.value }),
        ...(data.remark && { remark: data.remark }),
        ...(!_.isNil(data.enable) && { enable: data.enable }),
        update_by: data.updateBy,
      },
    );
    return affected === 0 ? isExisted : await this.findOne(id);
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
