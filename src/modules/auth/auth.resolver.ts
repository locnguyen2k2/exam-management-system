import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthService } from '~/modules/auth/auth.service';
import {
  ConfirmEmailDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
} from '~/modules/auth/dtos/auth-req.dto';
import { ICredential } from '~/modules/auth/interfaces/ICredential.interface';
import { Credential } from '~/modules/auth/dtos/auth-res.dto';
import { Public } from '~/common/decorators/permission.decorator';

@Public()
@Resolver('Authentications')
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => String, { description: 'Xác minh mã xác thực email' })
  async verify(
    @Args('confirmTokenArgs') confirmTokenArgs: ConfirmEmailDto,
  ): Promise<string> {
    const data = ConfirmEmailDto.plainToClass(confirmTokenArgs);
    return await this.authService.confirmEmail(data);
  }

  @Mutation(() => String, { description: 'Làm mới mã xác thực email' })
  async refreshConfirmToken(@Args('email') email: string): Promise<string> {
    return await this.authService.refreshConfirmToken(email);
  }

  @Mutation(() => String, { description: 'Quên mật khẩu' })
  async forgotPassword(@Args('email') email: string): Promise<string> {
    return await this.authService.forgotPassword(email);
  }

  @Mutation(() => String, { description: 'Đổi mật khẩu' })
  async resetPassword(
    @Args('resetPasswordArgs') dto: ResetPasswordDto,
  ): Promise<string> {
    const data = ResetPasswordDto.plainToClass(dto);
    return await this.authService.resetPassword(data);
  }

  @Mutation(() => Credential, { description: 'Đăng nhập' })
  async login(@Args('loginArgs') dto: LoginDto): Promise<ICredential> {
    const data = LoginDto.plainToClass(dto);
    return await this.authService.credentialByPassword(data);
  }

  @Mutation(() => Credential, { description: 'Đăng nhập với tài khoản google' })
  async loginWithGG(
    @Args('idTokenArgs') idToken: string,
  ): Promise<ICredential> {
    return await this.authService.credentialByGG(idToken);
  }

  @Mutation(() => String, { description: 'Đăng ký tài khoản mới' })
  async registerUser(@Args('registerUserArgs') dto: RegisterDto): Promise<any> {
    const data = RegisterDto.plainToClass(dto);

    return await this.authService.register(data);
  }
}
