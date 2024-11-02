import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { QuestionService } from '~/modules/system/question/question.service';
import { QuestionEntity } from '~/modules/system/question/entities/question.entity';
import {
  CreateQuestionsDto,
  EnableQuestionsDto,
  QuestionPageOptions,
  UpdateQuestionDto,
  UpdateQuestionStatusDto,
} from '~/modules/system/question/dtos/question-req.dto';
import { plainToClass } from 'class-transformer';
import { Permissions } from '~/common/decorators/permission.decorator';
import { PermissionEnum } from '~/modules/system/permission/permission.constant';
import { CurrentUser } from '~/common/decorators/current-user.decorator';
import { IAuthPayload } from '~/modules/auth/interfaces/IAuthPayload.interface';
import { QuestionPagination } from '~/modules/system/question/dtos/question-res.dto';
import { RoleEnum } from '~/modules/system/role/role.constant';

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
    @Args('chapterId') chapterId: string,
    @Args('questionPageOptions', { nullable: true })
    questionPageOptions: QuestionPageOptions = new QuestionPageOptions(),
  ) {
    const isAdmin = user.roles.some(
      (role: any) => role.value === RoleEnum.ADMIN,
    );

    return this.questionService.findAll(
      isAdmin ? null : user.id,
      chapterId,
      questionPageOptions,
    );
  }

  @Permissions(PermissionEnum.DETAIL_QUESTION)
  @Query(() => QuestionEntity, {
    name: 'questionDetail',
    description: 'Chi tiết câu hỏi',
  })
  async question(
    @Args('questionId') id: string,
    @CurrentUser() user: IAuthPayload,
  ): Promise<QuestionEntity> {
    return this.questionService.detailQuestion(id, user.id);
  }

  @Permissions(PermissionEnum.ADD_QUESTION)
  @Mutation(() => [QuestionEntity], {
    name: 'createQuestion',
    description: 'Khởi tạo câu hỏi',
  })
  async create(
    @CurrentUser() user: IAuthPayload,
    @Args('createQuestionArgs') args: CreateQuestionsDto,
  ): Promise<QuestionEntity[]> {
    args.createBy = user.id;
    return await this.questionService.create(args);
  }

  @Permissions(PermissionEnum.UPDATE_QUESTION)
  @Mutation(() => QuestionEntity, {
    name: 'updateQuestion',
    description: 'Cập nhật câu hỏi',
  })
  async update(
    @Args('id') id: string,
    @CurrentUser() user: IAuthPayload,
    @Args('updateQuestionArgs') dto: UpdateQuestionDto,
  ): Promise<QuestionEntity> {
    const data = plainToClass(UpdateQuestionDto, dto);
    data.updateBy = user.id;
    return await this.questionService.update(id, data);
  }

  @Permissions(PermissionEnum.UPDATE_QUESTION)
  @Mutation(() => [QuestionEntity], {
    name: 'enableQuestions',
    description: 'Kích hoạt danh sách câu hỏi',
  })
  async enableQuestions(
    @CurrentUser() user: IAuthPayload,
    @Args('enableQuestionsArgs') dto: EnableQuestionsDto,
  ) {
    const data = plainToClass(EnableQuestionsDto, dto);
    data.updateBy = user.id;
    return await this.questionService.enableQuestions(data);
  }

  @Permissions(PermissionEnum.UPDATE_QUESTION)
  @Mutation(() => [QuestionEntity], {
    name: 'updateQuestionsStatus',
    description: 'Cập nhật câu hỏi',
  })
  async updateManyStatus(
    @CurrentUser() user: IAuthPayload,
    @Args('updateQuestionStatusArgs') dto: UpdateQuestionStatusDto,
  ): Promise<QuestionEntity[]> {
    const data = plainToClass(UpdateQuestionStatusDto, dto);
    data.updateBy = user.id ? user.id : null;
    return await this.questionService.updateStatus(data);
  }

  @Permissions(PermissionEnum.DELETE_QUESTION)
  @Mutation(() => String, {
    name: 'deleteQuestions',
    description: 'Xóa danh sách câu hỏi',
  })
  async deleteQuestions(
    @CurrentUser() user: IAuthPayload,
    @Args('questionIds', { type: () => [String] }) questionIds: string[],
  ): Promise<string> {
    return await this.questionService.deleteMany(questionIds, user.id);
  }
}
