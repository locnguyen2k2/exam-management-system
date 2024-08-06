import { Injectable } from '@nestjs/common';
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

@Injectable()
export class PermissionService {
  constructor(
    @InjectRepository(PermissionEntity)
    private readonly permissionRepository: MongoRepository<PermissionEntity>,
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

    const pipeLine = [
      searchIndexes(pageOptions.keyword),
      {
        $facet: {
          data: [
            { $match: filterOptions },
            { $skip: pageOptions.skip },
            { $limit: pageOptions.take },
            { $sort: { [pageOptions.sort]: !pageOptions.sorted ? -1 : 1 } },
          ],
          pageInfo: [{ $match: filterOptions }, { $count: 'numberRecords' }],
        },
      },
    ];

    const [{ data, pageInfo }]: any[] = await this.permissionRepository
      .aggregate([...pipeLine])
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
        await this.findOne(id);
      }),
    );

    await this.permissionRepository.deleteMany({
      id: {
        $in: ids,
      },
    });

    throw new BusinessException('200:Thao tác thành công');
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
