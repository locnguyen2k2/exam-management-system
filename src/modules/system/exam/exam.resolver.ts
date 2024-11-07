import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Permissions } from '~/common/decorators/permission.decorator';
import { ExamService } from '~/modules/system/exam/exam.service';
import {
  CreateExamPaperDto,
  EnableExamsDto,
  ExamPaperPageOptions,
  GenerateExamPaperDto,
  UpdateExamPaperDto,
} from '~/modules/system/exam/dtos/exam-req.dto.';
import { ExamEntity } from '~/modules/system/exam/entities/exam.entity';
import { CurrentUser } from '~/common/decorators/current-user.decorator';
import { IAuthPayload } from '~/modules/auth/interfaces/IAuthPayload.interface';
import { PermissionEnum } from '~/modules/system/permission/permission.constant';
import { ExamPaginationDto } from '~/modules/system/exam/dtos/exam-res.dto';
import { plainToClass } from 'class-transformer';
import { RoleEnum } from '~/modules/system/role/role.constant';
import { IdParam } from '~/common/decorators/id.decorator';

@Resolver('Exams')
export class ExamResolver {
  constructor(private readonly examService: ExamService) {}

  @Permissions(PermissionEnum.LIST_EXAM)
  @Query(() => ExamPaginationDto, {
    name: 'exams',
    description: 'Lấy danh sách đề thi',
  })
  async exams(
    @Args('lessonId') @IdParam() lessonId: string,
    @CurrentUser() user: IAuthPayload,
    @Args('examPageOptions', {
      nullable: true,
      description: 'Bộ lọc danh sách đề',
    })
    examPageOptions: ExamPaperPageOptions = new ExamPaperPageOptions(),
  ) {
    const isAdmin = user.roles.some(
      (role: any) => role.value === RoleEnum.ADMIN,
    );
    return this.examService.findAll(
      isAdmin ? null : user.id,
      examPageOptions,
      lessonId,
    );
  }

  @Permissions(PermissionEnum.DETAIL_EXAM)
  @Query(() => ExamEntity, {
    name: 'examDetail',
    description: 'Chi tiết đề thi',
  })
  async detail(
    @Args('id') @IdParam() id: string,
    @CurrentUser() user: IAuthPayload,
  ) {
    return await this.examService.getExamDetail(id, user.id);
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
    data.createBy = user.id;
    return await this.examService.generate(data);
  }

  @Permissions(PermissionEnum.UPDATE_EXAM)
  @Mutation(() => [ExamEntity], {
    name: 'enableExams',
    description: 'Kích hoạt danh sách dề thi',
  })
  async enableExams(
    @CurrentUser() user: IAuthPayload,
    @Args('enableExamsArgs') dto: EnableExamsDto,
  ) {
    const data = plainToClass(EnableExamsDto, dto);
    data.updateBy = user.id;
    return await this.examService.enableExams(data);
  }

  @Permissions(PermissionEnum.UPDATE_EXAM)
  @Mutation(() => ExamEntity, {
    name: 'updateExamPaper',
    description: 'Cập nhật đề thi',
  })
  async update(
    @Args('examId') @IdParam() id: string,
    @CurrentUser() user: IAuthPayload,
    @Args('updateExamPaperArgs') dto: UpdateExamPaperDto,
  ): Promise<ExamEntity> {
    const data = plainToClass(UpdateExamPaperDto, dto);
    data.updateBy = user.id;
    return await this.examService.update(id, data);
  }

  @Permissions(PermissionEnum.DELETE_EXAM)
  @Mutation(() => String, {
    name: 'deleteExamPapers',
    description: 'Xóa danh sách đề thi',
  })
  async delete(
    @Args('examPaperIds', { type: () => [String] }) @IdParam() ids: string[],
    @CurrentUser() user: IAuthPayload,
  ): Promise<string> {
    return await this.examService.deleteMany(ids, user.id);
  }
}
