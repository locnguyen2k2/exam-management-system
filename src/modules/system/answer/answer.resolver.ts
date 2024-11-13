import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Permissions } from '~/common/decorators/permission.decorator';
import { AnswerService } from '~/modules/system/answer/answer.service';
import { AnswerEntity } from '~/modules/system/answer/entities/answer.entity';
import {
  CreateAnswersDto,
  UpdateAnswerDto,
} from '~/modules/system/answer/dtos/answer-req.dto';
import { plainToClass } from 'class-transformer';
import { CurrentUser } from '~/common/decorators/current-user.decorator';
import { IAuthPayload } from '~/modules/auth/interfaces/IAuthPayload.interface';
import { PermissionEnum } from '~/modules/system/permission/permission.constant';
import { RoleEnum } from '~/modules/system/role/role.constant';
import { AnswerPagination } from '~/modules/system/answer/dtos/answer-res.dto';
import { PageOptionDto } from '~/common/dtos/pagination/page-option.dto';
import { IdParam } from '~/common/decorators/id.decorator';

@Resolver()
export class AnswerResolver {
  constructor(private readonly answerService: AnswerService) {}

  @Permissions(PermissionEnum.DETAIL_ANSWER)
  @Query(() => AnswerEntity, {
    name: 'answer',
    description: 'Lấy chi tiết đáp án',
  })
  async answer(
    @Args('answerId') @IdParam() id: string,
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
    answerPageOptions: PageOptionDto = new PageOptionDto(),
    @CurrentUser() user: IAuthPayload,
  ) {
    const isAdmin = user.roles.some(
      (role: any) => role.value === RoleEnum.ADMIN,
    );
    return this.answerService.findAll(
      isAdmin ? null : user.id,
      answerPageOptions,
    );
  }

  @Permissions(PermissionEnum.ADD_ANSWER)
  @Mutation(() => [AnswerEntity], {
    name: 'createAnswers',
    description: 'Tạo danh sách các câu hỏi',
  })
  async create(
    @CurrentUser() user: IAuthPayload,
    @Args('createAnswersArgs') dto: CreateAnswersDto,
  ): Promise<AnswerEntity[]> {
    dto.createBy = user.id;
    const data = CreateAnswersDto.plainToClass(dto);
    return await this.answerService.create(data);
  }

  @Permissions(PermissionEnum.UPDATE_ANSWER)
  @Mutation(() => AnswerEntity, {
    name: 'updateAnswer',
    description: 'Cập nhật câu hỏi',
  })
  async update(
    @Args('id') @IdParam() id: string,
    @CurrentUser() user: IAuthPayload,
    @Args('updateAnswerArgs') dto: UpdateAnswerDto,
  ) {
    dto.updateBy = user.id;
    const data = plainToClass(UpdateAnswerDto, dto);
    delete data.id;
    return await this.answerService.update(id, data);
  }

  @Permissions(PermissionEnum.DELETE_ANSWER)
  @Mutation(() => String, {
    name: 'deleteAnswers',
    description: 'Xóa danh sách các câu hỏi',
  })
  async deleteAnswers(
    @Args('answerIds', { type: () => [String] }) @IdParam() answerIds: [string],
    @CurrentUser() user: IAuthPayload,
  ) {
    return await this.answerService.deleteMany(answerIds, user.id);
  }
}
