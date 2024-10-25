import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '~/modules/auth/guards/jwt-auth.guard';
import { AuthService } from '~/modules/auth/auth.service';
import { UserService } from '~/modules/system/user/user.service';
import { UserProfile } from '~/modules/system/user/dtos/user-res.dto';
import { CurrentUser } from '~/common/decorators/current-user.decorator';
import { IAuthPayload } from '~/modules/auth/interfaces/IAuthPayload.interface';
import { TokenService } from '~/modules/auth/services/token.service';
import { UpdateInfoDto } from '~/modules/system/user/dtos/user-req.dto';
import { plainToClass } from 'class-transformer';

@Resolver()
@UseGuards(JwtAuthGuard)
export class AccountResolver {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly tokenService: TokenService,
  ) {}

  @Query(() => UserProfile)
  async myProfile(@CurrentUser() user: IAuthPayload): Promise<UserProfile> {
    return await this.userService.getProfile(user.id);
  }

  @Query(() => Boolean)
  async logout(@CurrentUser() user: IAuthPayload): Promise<boolean> {
    return await this.tokenService.deleteAuthTokensByUid(user.email);
  }

  @Mutation(() => UserProfile)
  async updateInfo(
    @CurrentUser() user: IAuthPayload,
    @Args('updateAccountArgs') args: UpdateInfoDto,
  ): Promise<UserProfile> {
    const data = plainToClass(UpdateInfoDto, args);
    return await this.userService.update(user.id, { ...data });
  }
}
