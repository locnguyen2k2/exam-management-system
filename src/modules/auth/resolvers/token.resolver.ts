import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { Public } from '~/common/decorators/permission.decorator';
import { TokenService } from '~/modules/auth/services/token.service';

@Public()
@Resolver()
export class TokenResolver {
  constructor(private readonly tokenService: TokenService) {}

  @Mutation(() => String || Boolean, { description: 'Làm mới token truy cập' })
  async refreshToken(@Args('token') token: string): Promise<string | boolean> {
    return await this.tokenService.confirmRefreshToken(token);
  }
}
