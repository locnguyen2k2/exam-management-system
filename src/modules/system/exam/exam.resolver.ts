import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Permissions } from '~/common/decorators/permission.decorator';
import { ExamService } from '~/modules/system/exam/exam.service';
import {
  CreateExamPaperDto,
  ExamPaperPageOptions,
  GenerateExamPaperDto,
  UpdateExamPaperDto,
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
    examPageOptions: ExamPaperPageOptions = new ExamPaperPageOptions(),
  ): Promise<ExamPaginationDto> {
    const isAdmin = user.roles.some(
      (role: any) => role.value === RoleEnum.ADMIN,
    );

    return this.examService.findAll(isAdmin ? null : user.id, examPageOptions);
  }

  @Permissions(PermissionEnum.DETAIL_EXAM)
  @Query(() => ExamDetailDto, {
    name: 'examDetail',
    description: 'Chi tiết đề thi',
  })
  async detail(@Args('id') id: string) {
    return await this.examService.getExamDetail(id);
  }

  @Permissions(PermissionEnum.ADD_EXAM)
  @Mutation(() => [ExamEntity], {
    name: 'createExamPapers',
    description: 'Tạo đề thi',
  })
  async create(
    @CurrentUser() user: IAuthPayload,
    @Args('createExamPaperArgs') dto: CreateExamPaperDto,
  ): Promise<ExamEntity[]> {
    const data = CreateExamPaperDto.plainToClass(dto);
    data.createBy = user.id;
    return await this.examService.create(data);
  }

  @Permissions(PermissionEnum.ADD_EXAM)
  @Mutation(() => [ExamEntity], {
    name: 'generateExamPapers',
    description: 'Khởi tạo đề thi từ ngân hàng câu hỏi',
  })
  async generate(
    @CurrentUser() user: IAuthPayload,
    @Args('generateExamPaperArgs') dto: GenerateExamPaperDto,
  ): Promise<ExamEntity[]> {
    const data = GenerateExamPaperDto.plainToClass(dto);
    return await this.examService.generate(user.id, data);
  }

  @Permissions(PermissionEnum.UPDATE_EXAM)
  @Mutation(() => ExamEntity, {
    name: 'updateExamPaper',
    description: 'Cập nhật đề thi',
  })
  async update(
    @CurrentUser() user: IAuthPayload,
    @Args('examId') id: string,
    @Args('updateExamPaperArgs') dto: UpdateExamPaperDto,
  ): Promise<ExamEntity> {
    const data = plainToClass(UpdateExamPaperDto, dto);
    data.updateBy = user.id;
    return await this.examService.update(id, data);
  }

  @Permissions(PermissionEnum.DELETE_EXAM)
  @Mutation(() => String, { name: 'deleteExamPaper' })
  async delete(@Args('examPaperId') id: string): Promise<string> {
    return await this.examService.delete(id);
  }
}
