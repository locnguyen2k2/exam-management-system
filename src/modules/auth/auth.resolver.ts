import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthService } from '~/modules/auth/auth.service';
import {
  ConfirmEmailDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
} from '~/modules/auth/dtos/auth-req.dto';
import { Credential } from '~/modules/auth/dtos/auth-res.dto';
import { Public } from '~/common/decorators/permission.decorator';

@Public()
@Resolver('Authentications')
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => String, { description: 'Xác minh mã xác thực email' })
  async verify(@Args('confirmTokenArgs') args: ConfirmEmailDto) {
    return await this.authService.confirmEmail(args);
  }

  @Mutation(() => String, { description: 'Làm mới mã xác thực email' })
  async refreshConfirmToken(@Args('email') email: string) {
    return await this.authService.refreshConfirmToken(email);
  }

  @Mutation(() => String, { description: 'Quên mật khẩu' })
  async forgotPassword(@Args('email') email: string) {
    return await this.authService.forgotPassword(email);
  }

  @Mutation(() => String, { description: 'Đổi mật khẩu' })
  async resetPassword(@Args('resetPasswordArgs') args: ResetPasswordDto) {
    return await this.authService.resetPassword(args);
  }

  @Mutation(() => Credential, { description: 'Đăng nhập' })
  async login(@Args('loginArgs') args: LoginDto) {
    return await this.authService.credentialByPassword(args);
  }

  @Mutation(() => Credential, { description: 'Đăng nhập với tài khoản google' })
  async loginWithGG(@Args('idTokenArgs') idToken: string) {
    return await this.authService.credentialByGG(idToken);
  }

  @Mutation(() => String, { description: 'Đăng ký tài khoản mới' })
  async registerUser(@Args('registerUserArgs') args: RegisterDto) {
    return await this.authService.register(args);
  }
}
