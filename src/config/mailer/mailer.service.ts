import { HttpException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { BusinessException } from '~/common/exceptions/biz.exception';
import { ErrorEnum } from '~/common/enums/error.enum';
import { MailerService as NestedMailerService } from '@nestjs-modules/mailer';
const emailValidator = require('deep-email-validator');

@Injectable()
export class MailerService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly mailService: NestedMailerService,
  ) {}

  async sendConfirmationEmail(email: string, token: string): Promise<any> {
    const text = `${token}`;

    return await this.mailService.sendMail({
      to: email,
      subject: 'Email confirmation',
      template: './confirmation',
      context: {
        content: text,
      },
    });
  }

  async sendResetPasswordEmail(email: string, token: string): Promise<any> {
    const text = `${token}`;

    return await this.mailService.sendMail({
      to: email,
      subject: 'Confirmation reset password email',
      template: './reset-password',
      context: {
        content: text,
      },
    });
  }

  async verifyEmail(email: string): Promise<boolean> {
    const { valid } = await emailValidator.validate(email);
    return valid;
  }

  async isCtuetEmail(email: string): Promise<boolean | HttpException> {
    // const idValid = await this.verifyEmail(email);
    // if (!idValid) throw new BusinessException('400:Email không tồn tại!');
    const teacherEmail = await this.isTeacherCtutEmail(email);
    const studentEmail = await this.isStudentCtuetEmail(email);
    if (!teacherEmail && !studentEmail) {
      throw new BusinessException(ErrorEnum.INVALID_CTUET_EMAIL);
    }
    return true;
  }

  async isStudentCtuetEmail(email: string) {
    let studentEmail = '';
    for (let i = email.length - 21; i < email.length; i++) {
      studentEmail += email[i];
    }
    return studentEmail === '@student.ctuet.edu.vn';
  }

  async isTeacherCtutEmail(email: string) {
    let teacherEmail = '';
    for (let i = email.length - 13; i < email.length; i++) {
      teacherEmail += email[i];
    }
    return teacherEmail === '@ctuet.edu.vn';
  }
}
