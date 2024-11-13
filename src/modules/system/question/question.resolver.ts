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
import { Permissions } from '~/common/decorators/permission.decorator';
import { PermissionEnum } from '~/modules/system/permission/permission.constant';
import { CurrentUser } from '~/common/decorators/current-user.decorator';
import { IAuthPayload } from '~/modules/auth/interfaces/IAuthPayload.interface';
import { QuestionPagination } from '~/modules/system/question/dtos/question-res.dto';
import { RoleEnum } from '~/modules/system/role/role.constant';
import { IdParam } from '~/common/decorators/id.decorator';

@Resolver('Questions')
export class QuestionResolver {
  constructor(private readonly questionService: QuestionService) {}

  @Permissions(PermissionEnum.LIST_QUESTION)
  @Query(() => QuestionPagination, {
    name: 'questions',
    description: 'Lấy danh sách câu hỏi',
  })
  async questions(
    @Args('chapterId') @IdParam() chapterId: string,
    @CurrentUser() user: IAuthPayload,
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
    @Args('questionId') @IdParam() id: string,
    @CurrentUser() user: IAuthPayload,
  ) {
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
  ) {
    args.createBy = user.id;
    return await this.questionService.create(args);
  }

  @Permissions(PermissionEnum.UPDATE_QUESTION)
  @Mutation(() => QuestionEntity, {
    name: 'updateQuestion',
    description: 'Cập nhật câu hỏi',
  })
  async update(
    @Args('id') @IdParam() id: string,
    @CurrentUser() user: IAuthPayload,
    @Args('updateQuestionArgs') args: UpdateQuestionDto,
  ) {
    args.updateBy = user.id;
    return await this.questionService.update(id, args);
  }

  @Permissions(PermissionEnum.UPDATE_QUESTION)
  @Mutation(() => [QuestionEntity], {
    name: 'enableQuestions',
    description: 'Kích hoạt danh sách câu hỏi',
  })
  async enableQuestions(
    @CurrentUser() user: IAuthPayload,
    @Args('enableQuestionsArgs') args: EnableQuestionsDto,
  ) {
    args.updateBy = user.id;
    return await this.questionService.enableQuestions(args);
  }

  @Permissions(PermissionEnum.UPDATE_QUESTION)
  @Mutation(() => [QuestionEntity], {
    name: 'updateQuestionsStatus',
    description: 'Cập nhật câu hỏi',
  })
  async updateManyStatus(
    @CurrentUser() user: IAuthPayload,
    @Args('updateQuestionStatusArgs') args: UpdateQuestionStatusDto,
  ) {
    args.updateBy = user.id;
    return await this.questionService.updateStatus(args);
  }

  @Permissions(PermissionEnum.DELETE_QUESTION)
  @Mutation(() => String, {
    name: 'deleteQuestions',
    description: 'Xóa danh sách câu hỏi',
  })
  async deleteQuestions(
    @Args('questionIds', { type: () => [String] })
    @IdParam()
    questionIds: string[],
    @CurrentUser() user: IAuthPayload,
  ) {
    return await this.questionService.deleteMany(questionIds, user.id);
  }
}
