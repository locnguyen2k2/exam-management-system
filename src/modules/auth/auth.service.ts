import { Injectable } from '@nestjs/common';
import { UserService } from '~/modules/system/user/user.service';
import {
  BaseRegisterDto,
  ConfirmEmailDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
} from '~/modules/auth/dtos/auth-req.dto';
import { ErrorEnum } from '~/common/enums/error.enum';
import { BusinessException } from '~/common/exceptions/biz.exception';
import { TokenEnum } from '~/modules/auth/auth.constant';
import { TokenService } from '~/modules/auth/services/token.service';
import { ICredential } from '~/modules/auth/interfaces/ICredential.interface';
import { MailerService } from '~/shared/mailer/mailer.service';
import { ICredentialWithGG } from '~/modules/auth/interfaces/ICredentialWithGG.interface';
import { RoleEnum } from '~/modules/system/role/role.constant';
import { plainToClass } from 'class-transformer';
import { RoleService } from '~/modules/system/role/role.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly tokenService: TokenService,
    private readonly roleService: RoleService,
    private readonly mailService: MailerService,
  ) {}

  async refreshConfirmToken(email: string): Promise<string> {
    const { confirm_token } = await this.userService.getTokens(email);
    const { id } = await this.userService.findByEmail(email);
    const isValid =
      confirm_token && (await this.tokenService.verifyUuidToken(confirm_token));

    if (isValid) return 'Vui lòng nhập mã xác nhận đã gửi qua email!';

    await this.userService.resetTokens(email);

    const { value } = await this.tokenService.generateUuidToken(
      id,
      TokenEnum.CONFIRM_TOKEN,
    );

    await this.mailService.sendConfirmationEmail(email, value);

    return `Mã xác nhận mới đã được gửi qua email!`;
  }

  async confirmEmail(data: ConfirmEmailDto): Promise<string> {
    const { confirm_token } = await this.userService.getTokens(data.email);
    const { id } = await this.userService.findByEmail(data.email);
    const isValid =
      confirm_token &&
      confirm_token.value === data.confirmToken &&
      (await this.tokenService.verifyUuidToken(confirm_token));

    if (!isValid) throw new BusinessException(ErrorEnum.INVALID_TOKEN);

    await this.userService.deleteUserToken(confirm_token.value);
    await this.userService.update(id, {
      id: id,
      status: true,
      updateBy: id,
    });

    return 'Xác thực email thành công';
  }

  async forgotPassword(email: string): Promise<string> {
    const { repass_token } = await this.userService.getTokens(email);
    const user = await this.userService.findByEmail(email);
    const isValid =
      repass_token && (await this.tokenService.verifyUuidToken(repass_token));

    if (!user.password) throw new BusinessException(ErrorEnum.USER_NOT_FOUND);
    if (!user.status) throw new BusinessException(ErrorEnum.USER_UNAVAILABLE);
    if (isValid) return 'Vui lòng nhập mã xác thực đã gửi qua email!';

    const { value } = await this.tokenService.generateUuidToken(
      user.id,
      TokenEnum.RESET_PASSWORD,
    );

    await this.mailService.sendResetPasswordEmail(email, value);
    if (repass_token)
      await this.userService.deleteUserToken(repass_token.value);

    return 'Mã xác thực để đổi lại mật khẩu đã được gửi vào email!';
  }

  async resetPassword(data: ResetPasswordDto): Promise<string> {
    const { repass_token } = await this.userService.getTokens(data.email);
    const isValid =
      repass_token &&
      repass_token.value === data.confirmToken &&
      (await this.tokenService.verifyUuidToken(repass_token));

    const { id } = await this.userService.findByEmail(data.email);

    if (!isValid) throw new BusinessException(ErrorEnum.INVALID_TOKEN);

    await this.userService.updatePassword(id, data.newPassword);
    await this.userService.resetTokens(data.email);

    return 'Mật khẩu của bạn dã được cập nhật!';
  }

  async register(data: RegisterDto): Promise<any> {
    const { email } = data;
    // Kiểm trả tính hợp lệ của email
    await this.mailService.isCtuetEmail(email);

    let user = await this.userService.findByEmail(email);

    // Kiểm tra email đã được đăng ký với mật khẩu
    if (user && user.password)
      throw new BusinessException(ErrorEnum.USER_IS_EXISTED);

    if (user && !user.password) {
      await this.userService.resetTokens(email);
      await this.userService.update(user.id, { ...data, status: false });
      await this.userService.updatePassword(user.id, data.password);
    } else {
      // Khởi tạo
      const roleUser = await this.roleService.findByValue(RoleEnum.USER);
      const roleTeacher = await this.roleService.findByValue(RoleEnum.TEACHER);
      user = await this.userService.create({
        ...data,
        enable: true,
        roleIds: [roleUser.id, roleTeacher.id],
      });
    }

    const { value } = await this.tokenService.generateUuidToken(
      user.id,
      TokenEnum.CONFIRM_TOKEN,
    );

    await this.mailService.sendConfirmationEmail(email, value);

    throw new BusinessException(
      '200:Xác thực email trước để hoàn tất đăng ký!',
    );
  }

  async credentialByPassword(data: LoginDto): Promise<ICredential> {
    const { email, password } = data;
    const user = await this.userService.findByEmail(email);

    if (!user || !user.password)
      throw new BusinessException(ErrorEnum.INVALID_LOGIN);

    const isMatchPassword = bcrypt.compareSync(password, user.password);

    if (!isMatchPassword) throw new BusinessException(ErrorEnum.INVALID_LOGIN);
    if (!user.enable || !user.status)
      throw new BusinessException(ErrorEnum.USER_UNAVAILABLE);

    const accessToken = await this.tokenService.getAccessToken(user.id);
    const refreshToken = await this.tokenService.getRefreshToken(user.id);
    const profile = await this.userService.getProfile(user.id);

    return {
      access_token: accessToken.value,
      refresh_token: refreshToken.value,
      profile,
    };
  }

  async credentialByGG(idToken: string): Promise<ICredential> {
    const isValidToken: ICredentialWithGG =
      await this.tokenService.verifyGGToken(idToken);

    if (!isValidToken.email_verified)
      throw new BusinessException(ErrorEnum.INVALID_TOKEN);

    const { email, given_name, family_name } = isValidToken;
    let user = await this.userService.findByEmail(email);

    if (user && !user.enable)
      throw new BusinessException(ErrorEnum.USER_UNAVAILABLE);

    if (!user) {
      const userRole = await this.roleService.findByValue(RoleEnum.USER);
      const intial = {
        firstName: given_name,
        lastName: family_name,
        email: email,
        // photo: picture,
        photo: null,
        roleIds: [userRole.id],
        createBy: 0,
      };
      const newUser = plainToClass(BaseRegisterDto, intial);

      user = await this.userService.create({
        ...newUser,
        enable: true,
        status: true,
      });
    } else {
      const { confirm_token } = await this.userService.getTokens(email);
      if (confirm_token)
        await this.userService.deleteUserToken(confirm_token.value);

      await this.userService.updateStatus(user.id, true);
    }

    const accessToken = await this.tokenService.getAccessToken(user.id);
    const refreshToken = await this.tokenService.getRefreshToken(user.id);
    const profile = await this.userService.getProfile(user.id);

    return {
      profile,
      access_token: accessToken.value,
      refresh_token: refreshToken.value,
    };
  }
}
