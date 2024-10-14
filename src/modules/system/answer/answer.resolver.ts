import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Permissions } from '~/common/decorators/permission.decorator';
import { AnswerService } from '~/modules/system/answer/answer.service';
import { AnswerEntity } from '~/modules/system/answer/entities/answer.entity';
import {
  AnswerPageOptions,
  CreateAnswersDto,
  UpdateAnswerDto,
} from '~/modules/system/answer/dtos/answer-req.dto';
import { plainToClass } from 'class-transformer';
import { CurrentUser } from '~/common/decorators/current-user.decorator';
import { IAuthPayload } from '~/modules/auth/interfaces/IAuthPayload.interface';
import { PermissionEnum } from '~/modules/system/permission/permission.constant';
import { AnswerPagination } from '~/modules/system/answer/dtos/answer-res.dto';

@Resolver()
export class AnswerResolver {
  constructor(private readonly answerService: AnswerService) {}

  @Permissions(PermissionEnum.DETAIL_ANSWER)
  @Query(() => AnswerEntity, { name: 'answer' })
  async answer(
    @Args('answerId') id: string,
    @CurrentUser() user: IAuthPayload,
  ): Promise<AnswerEntity> {
    return this.answerService.findAvailableById(id, user.id);
  }

  @Permissions(PermissionEnum.LIST_ANSWER)
  @Query(() => AnswerPagination, {
    name: 'answers',
    description: 'Lấy danh sách đáp án',
  })
  async answers(
    @Args('answerPageOptions', { nullable: true })
    chapterPageOptions: AnswerPageOptions = new AnswerPageOptions(),
  ): Promise<AnswerPagination> {
    return this.answerService.findAll(chapterPageOptions);
  }

  @Permissions(PermissionEnum.ADD_ANSWER)
  @Mutation(() => [AnswerEntity], { name: 'createAnswers' })
  async create(
    @CurrentUser() user: IAuthPayload,
    @Args('createAnswersArgs') dto: CreateAnswersDto,
  ): Promise<AnswerEntity[]> {
    dto.createBy = user.id;
    const data = CreateAnswersDto.plainToClass(dto);
    return await this.answerService.create(data);
  }

  @Permissions(PermissionEnum.UPDATE_ANSWER)
  @Mutation(() => AnswerEntity, { name: 'updateAnswer' })
  async update(
    @CurrentUser() user: IAuthPayload,
    @Args('id') id: string,
    @Args('updateAnswerArgs') dto: UpdateAnswerDto,
  ): Promise<AnswerEntity> {
    dto.updateBy = user.id;
    const data = plainToClass(UpdateAnswerDto, dto);
    delete data.id;
    return await this.answerService.update(id, data);
  }

  @Permissions(PermissionEnum.DELETE_ANSWER)
  @Mutation(() => String, { name: 'deleteAnswers' })
  async deleteAnswers(
    @CurrentUser() user: IAuthPayload,
    @Args('answerIds', { type: () => [String] }) answerIds: [string],
  ): Promise<string> {
    return await this.answerService.deleteMany(answerIds, user.id);
  }
}
