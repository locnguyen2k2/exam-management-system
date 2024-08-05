import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AnswerEntity } from '~/modules/system/answer/entities/answer.entity';
import { MongoRepository } from 'typeorm';
import {
  AnswerPageOptions,
  CreateAnswersDto,
  UpdateAnswerDto,
} from '~/modules/system/answer/dtos/answer-req.dto';
import { BusinessException } from '~/common/exceptions/biz.exception';
import { ErrorEnum } from '~/common/enums/error.enum';
import {
  regSpecialChars,
  regWhiteSpace,
} from '~/common/constants/regex.constant';

import * as _ from 'lodash';
import { PageMetaDto } from '~/common/dtos/pagination/page-meta.dto';
import { AnswerPagination } from '~/modules/system/answer/dtos/answer-res.dto';
import { searchIndexes } from '~/utils/search';

@Injectable()
export class AnswerService {
  constructor(
    @InjectRepository(AnswerEntity)
    private readonly answerRepo: MongoRepository<AnswerEntity>,
  ) {}

  async findAll(
    pageOptions: AnswerPageOptions = new AnswerPageOptions(),
  ): Promise<AnswerPagination> {
    const filterOptions = {
      ...(!_.isNil(pageOptions.enable) && {
        enable: pageOptions.enable,
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

    const [{ data, pageInfo }]: any[] = await this.answerRepo
      .aggregate([...pipeLine])
      .toArray();

    const entities = data;
    const numberRecords = data.length > 0 && pageInfo[0].numberRecords;
    const pageMetaDto = new PageMetaDto({
      pageOptions,
      numberRecords,
    });
    return new AnswerPagination(entities, pageMetaDto);
  }

  async findByValue(value: string): Promise<AnswerEntity[]> {
    const handleName = value
      .replace(regSpecialChars, '\\$&')
      .replace(regWhiteSpace, '\\s*');
    const isExisted = await this.answerRepo.find({
      where: { value: { $regex: handleName, $options: 'i' } },
    });
    if (isExisted) return isExisted;
    throw new BusinessException(ErrorEnum.RECORD_NOT_FOUND);
  }

  async findAvailable(): Promise<AnswerEntity[]> {
    return await this.answerRepo.findBy({ enable: true });
  }

  async findOne(id: string): Promise<AnswerEntity> {
    const isExisted = await this.answerRepo.findOneBy({ id });
    if (isExisted) return isExisted;
    throw new BusinessException(ErrorEnum.RECORD_NOT_FOUND);
  }

  async create(data: CreateAnswersDto): Promise<string[]> {
    const answers: string[] = new Array(data.items.length);
    await Promise.all(
      data.items.map(async (item, index) => {
        const isExisted = await this.findByValue(item.value);

        if (isExisted.length > 0) {
          answers[index] = isExisted[0].id;
        } else {
          const answer = new AnswerEntity({
            ...item,
            create_by: data.createBy,
            update_by: data.createBy,
          });
          const newAnswer = this.answerRepo.create(answer);

          await this.answerRepo.save(newAnswer);

          answers[index] = newAnswer.id;
        }
      }),
    );
    return answers;
  }

  async update(id: string, data: UpdateAnswerDto): Promise<AnswerEntity> {
    const isExisted = await this.findOne(id);

    const { affected } = await this.answerRepo.update(
      { id },
      {
        ...(data?.value && { name: data.value }),
        // ...(data?.label && { label: data.label }),
        ...(data?.updateBy && { update_by: data.updateBy }),
        ...(!_.isNil(data?.enable) && { enable: data.enable }),
        ...(data?.remark && { description: data.remark }),
        update_by: data.updateBy,
      },
    );
    return affected ? await this.findOne(id) : isExisted;
  }

  async deleteMany(ids: string[]): Promise<string> {
    await Promise.all(
      ids.map(async (id) => {
        await this.findOne(id);
      }),
    );
    await this.answerRepo.deleteMany({ id: { $in: ids } });
    throw new BusinessException('200:Delete successfull!');
  }
}
