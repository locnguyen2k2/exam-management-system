import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { QuestionService } from '~/modules/system/question/question.service';
import { QuestionEntity } from '~/modules/system/question/entities/question.entity';
import {
  CreateQuestionsDto,
  QuestionPageOptions,
  UpdateQuestionDto,
  UpdateQuestionStatusDto,
} from '~/modules/system/question/dtos/question-req.dto';
import { plainToClass } from 'class-transformer';
import { Permissions } from '~/common/decorators/permission.decorator';
import { PermissionEnum } from '~/modules/system/permission/permission.constant';
import { CurrentUser } from '~/common/decorators/current-user.decorator';
import { IAuthPayload } from '~/modules/auth/interfaces/IAuthPayload.interface';
import {
  QuestionDetailDto,
  QuestionPagination,
} from '~/modules/system/question/dtos/question-res.dto';
import { UpdateChaptersStatusDto } from '~/modules/system/chapter/dtos/chapter-req.dto';

@Resolver('Questions')
export class QuestionResolver {
  constructor(private readonly questionService: QuestionService) {}

  @Permissions(PermissionEnum.LIST_QUESTION)
  @Query(() => QuestionPagination, {
    name: 'questions',
    description: 'Lấy danh sách câu hỏi',
  })
  async questions(
    @CurrentUser() user: IAuthPayload,
    @Args('questionPageOptions', { nullable: true })
    questionPageOptions: QuestionPageOptions = new QuestionPageOptions(),
  ): Promise<QuestionPagination> {
    return this.questionService.findAll(user.id, questionPageOptions);
  }

  @Permissions(PermissionEnum.DETAIL_QUESTION)
  @Query(() => QuestionDetailDto, { name: 'question' })
  async question(@Args('questionId') id: string): Promise<QuestionDetailDto> {
    return this.questionService.detailQuestion(id);
  }

  @Permissions(PermissionEnum.ADD_QUESTION)
  @Mutation(() => [QuestionEntity], { name: 'createQuestions' })
  async create(
    @CurrentUser() user: IAuthPayload,
    @Args('createQuestionArgs') args: CreateQuestionsDto,
  ): Promise<QuestionEntity[]> {
    args.createBy = user.id;
    return await this.questionService.create(args);
  }

  @Permissions(PermissionEnum.UPDATE_QUESTION)
  @Mutation(() => QuestionEntity, { name: 'updateQuestion' })
  async update(
    @Args('id') id: string,
    @Args('updateQuestionArgs') dto: UpdateQuestionDto,
  ): Promise<QuestionEntity> {
    const data = plainToClass(UpdateQuestionDto, dto);
    return await this.questionService.update(id, data);
  }

  @Permissions(PermissionEnum.UPDATE_QUESTION)
  @Mutation(() => String, {
    name: 'updateQuestionsStatus',
  })
  async updateManyStatus(
    @CurrentUser() user: IAuthPayload,
    @Args('updateQuestionStatusArgs') dto: UpdateQuestionStatusDto,
  ): Promise<string> {
    const data = plainToClass(UpdateQuestionStatusDto, dto);
    data.updateBy = user.id ? user.id : null;
    return await this.questionService.updateStatus(data);
  }

  @Permissions(PermissionEnum.UPDATE_CHAPTER)
  @Mutation(() => String, {
    name: 'updateChaptersStatus',
    description: 'Cập nhật trạng thái công khai',
  })
  async updateChaptersStatus(
    @CurrentUser() user: IAuthPayload,
    @Args('updateChaptersStatusArgs') dto: UpdateChaptersStatusDto,
  ): Promise<string> {
    const data = plainToClass(UpdateChaptersStatusDto, dto);
    data.updateBy = user.id ? user.id : null;
    return await this.questionService.updateChaptersStatus(data);
  }

  @Permissions(PermissionEnum.DELETE_ANSWER)
  @Mutation(() => String, { name: 'deleteAnswers' })
  async deleteAnswers(
    @Args('answerIds', { type: () => [String] }) answerIds: [string],
  ): Promise<string> {
    return await this.questionService.deleteAnswers(answerIds);
  }
}
