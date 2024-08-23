import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Permissions } from '~/common/decorators/permission.decorator';
import { ExamService } from '~/modules/system/exam/exam.service';
import {
  CreateExamDto,
  ExamPageOptions,
  GenerateExamDto,
  UpdateExamDto,
} from '~/modules/system/exam/dtos/exam-req.dto.';
import { ExamEntity } from '~/modules/system/exam/entities/exam.entity';
import { CurrentUser } from '~/common/decorators/current-user.decorator';
import { IAuthPayload } from '~/modules/auth/interfaces/IAuthPayload.interface';
import { PermissionEnum } from '~/modules/system/permission/permission.constant';
import {
  ExamDetailDto,
  ExamPaginationDto,
} from '~/modules/system/exam/dtos/exam-res.dto';
import { plainToClass } from 'class-transformer';
import { RoleEnum } from '~/modules/system/role/role.constant';

@Resolver('Exams')
export class ExamResolver {
  constructor(private readonly examService: ExamService) {}

  @Permissions(PermissionEnum.LIST_EXAM)
  @Query(() => ExamPaginationDto, {
    name: 'exams',
    description: 'Lấy danh sách đề thi',
  })
  async exams(
    @CurrentUser() user: IAuthPayload,
    @Args('examPageOptions', { nullable: true })
    examPageOptions: ExamPageOptions = new ExamPageOptions(),
  ): Promise<ExamPaginationDto> {
    const isAdmin = user.roles.some(
      (role: any) => role.value === RoleEnum.ADMIN,
    );

    return this.examService.findAll(isAdmin ? null : user.id, examPageOptions);
  }

  @Permissions(PermissionEnum.DETAIL_EXAM)
  @Query(() => ExamDetailDto, { name: 'examDetail' })
  async detail(@Args('id') id: string) {
    return await this.examService.getExamDetail(id);
  }

  @Permissions(PermissionEnum.ADD_EXAM)
  @Mutation(() => [ExamEntity], { name: 'createExamination' })
  async create(
    @CurrentUser() user: IAuthPayload,
    @Args('createExamArgs') dto: CreateExamDto,
  ): Promise<ExamEntity[]> {
    const data = CreateExamDto.plainToClass(dto);
    data.createBy = user.id;
    return await this.examService.create(data);
  }

  @Permissions(PermissionEnum.ADD_EXAM)
  @Mutation(() => [ExamEntity], { name: 'generateExams' })
  async generate(
    @CurrentUser() user: IAuthPayload,
    @Args('generateExamArgs') dto: GenerateExamDto,
  ): Promise<ExamEntity[]> {
    const data = GenerateExamDto.plainToClass(dto);
    return await this.examService.generate(user.id, data);
  }

  @Permissions(PermissionEnum.UPDATE_EXAM)
  @Mutation(() => ExamEntity, { name: 'updateExam' })
  async update(
    @CurrentUser() user: IAuthPayload,
    @Args('examId') id: string,
    @Args('updateExamArgs') dto: UpdateExamDto,
  ): Promise<ExamEntity> {
    const data = plainToClass(UpdateExamDto, dto);
    data.updateBy = user.id;
    return await this.examService.update(id, data);
  }

  @Permissions(PermissionEnum.DELETE_EXAM)
  @Mutation(() => String, { name: 'deleteExam' })
  async delete(@Args('examinationId') id: string): Promise<string> {
    return await this.examService.delete(id);
  }

  @Permissions(PermissionEnum.DELETE_QUESTION)
  @Mutation(() => String, { name: 'deleteQuestions' })
  async deleteQuestions(
    @Args('questionIds', { type: () => [String] }) questionIds: string[],
  ): Promise<string> {
    return await this.examService.deleteQuestions(questionIds);
  }
}
