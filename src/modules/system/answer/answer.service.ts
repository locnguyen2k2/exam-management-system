import { forwardRef, Inject, Injectable } from '@nestjs/common';
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
import { pipeLine } from '~/utils/pipe-line';
import { QuestionService } from '~/modules/system/question/question.service';

@Injectable()
export class AnswerService {
  constructor(
    @InjectRepository(AnswerEntity)
    private readonly answerRepo: MongoRepository<AnswerEntity>,
    @Inject(forwardRef(() => QuestionService))
    private readonly questionService: QuestionService,
  ) {}

  async findAll(
    uid: string = null,
    pageOptions: AnswerPageOptions = new AnswerPageOptions(),
  ): Promise<AnswerPagination> {
    const filterOptions = {
      ...(!_.isNil(pageOptions.enable) && {
        enable: pageOptions.enable,
      }),
      ...(uid && {
        $or: [{ create_by: uid }],
      }),
    };

    const pipes = [
      searchIndexes(pageOptions.keyword),
      ...pipeLine(pageOptions, filterOptions),
    ];

    const [{ data, pageInfo }]: any[] = await this.answerRepo
      .aggregate(pipes)
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
    throw new BusinessException(ErrorEnum.RECORD_NOT_FOUND, value);
  }

  async findAvailable(): Promise<AnswerEntity[]> {
    return await this.answerRepo.findBy({ enable: true });
  }

  async findAvailableById(id: string, uid: string): Promise<AnswerEntity> {
    const isExisted = await this.findOne(id);

    if (isExisted && isExisted.create_by === uid) return isExisted;
    throw new BusinessException(ErrorEnum.RECORD_UNAVAILABLE, id);
  }

  async findOne(id: string): Promise<AnswerEntity> {
    const isExisted = await this.answerRepo.findOneBy({ id });
    if (isExisted) return isExisted;
    throw new BusinessException(ErrorEnum.RECORD_NOT_FOUND, id);
  }

  async create(data: CreateAnswersDto): Promise<AnswerEntity[]> {
    const answers: AnswerEntity[] = new Array(data.items.length);
    await Promise.all(
      data.items.map(async (item, index) => {
        const answer = new AnswerEntity({
          ...item,
          create_by: data.createBy,
          update_by: data.createBy,
        });
        const newAnswer = this.answerRepo.create(answer);

        answers[index] = await this.answerRepo.save(newAnswer);
      }),
    );
    return answers;
  }

  async update(id: string, data: UpdateAnswerDto): Promise<AnswerEntity> {
    const isExisted = await this.findOne(id);

    if (isExisted.create_by !== data.updateBy) {
      throw new BusinessException(ErrorEnum.NO_PERMISSON);
    }

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

  async deleteMany(ids: string[], uid: string): Promise<string> {
    const listIds = [];
    await Promise.all(
      ids.map(async (id) => {
        const isExisted = await this.findOne(id);
        if (isExisted.create_by !== uid)
          throw new BusinessException(ErrorEnum.NO_PERMISSON, id);
        const isValid = await this.questionService.findByAnswerId(id);
        if (isValid.length !== 0)
          throw new BusinessException(ErrorEnum.RECORD_IN_USED, id);
        listIds.push(id);
      }),
    );

    await Promise.all(
      ids.map(async (id) => {
        await this.findOne(id);
      }),
    );
    await this.answerRepo.deleteMany({ id: { $in: ids } });

    throw new BusinessException('200:Xóa thành công!');
  }
}
