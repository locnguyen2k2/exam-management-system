import { Inject, Injectable } from '@nestjs/common';
import { IJwtConfig, JwtConfig } from '~/config';
import { IAuthPayload } from '~/modules/auth/interfaces/IAuthPayload.interface';
import { TokenEntity } from '~/modules/auth/entities/token.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { UserService } from '~/modules/system/user/user.service';
import { JwtService } from '@nestjs/jwt';
import { TokenEnum } from '~/modules/auth/auth.constant';
import { env } from '~/utils/env';
import { BusinessException } from '~/common/exceptions/biz.exception';
import { ErrorEnum } from '~/common/enums/error.enum';
import {
  ICreateUserToken,
  IToken,
} from '~/modules/auth/interfaces/IToken.interface';
import { OAuth2Client } from 'google-auth-library';
import { ICredentialWithGG } from '~/modules/auth/interfaces/ICredentialWithGG.interface';
import { v4 as uuid } from 'uuid';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    @InjectRepository(TokenEntity)
    private readonly tokenRepository: MongoRepository<TokenEntity>,
    @Inject(JwtConfig.KEY) private readonly jwtConfig: IJwtConfig,
  ) {}

  async findOne(value: string): Promise<TokenEntity> {
    const token = await this.tokenRepository.findOneBy({ value });

    if (!token) throw new BusinessException(ErrorEnum.INVALID_TOKEN);
    return token;
  }

  /**
   * Lấy và tạo mới Access token (nếu không có hoặc hết hạn)
   * */
  async getAccessToken(uid: string): Promise<TokenEntity> {
    const user = await this.userService.findOne(uid);
    const accessToken = user.tokens.find(
      (token) => token.type === TokenEnum.ACCESS_TOKEN,
    );

    try {
      await this.verifyAccessToken(accessToken?.value);
      return accessToken;
    } catch {
      accessToken && (await this.deleteUserTokenByVal(accessToken.value));

      return await this.createUserAT({
        uid: user.id,
        email: user.email,
        enable: user.enable,
        status: user.status,
        roles: this.userService.getUserPermissions(user),
      });
    }
  }

  /**
   * Lấy và tạo mới Refresh token (nếu không có hoặc hết hạn)
   * */
  async getRefreshToken(uid: string): Promise<TokenEntity> {
    const user = await this.userService.findOne(uid);
    const refreshToken = user.tokens.find(
      (token) => token.type === TokenEnum.REFRESH_TOKEN,
    );

    const checkRT = refreshToken?.expired_at >= new Date();
    if (!checkRT) {
      refreshToken && (await this.deleteUserTokenByVal(refreshToken.value));

      return await this.createUserUuidToken(user.id, TokenEnum.REFRESH_TOKEN);
    } else {
      return refreshToken;
    }
  }

  /**
   * Tạo Uuid Token (Confirm, refresh, repass) và thêm vào User
   * */
  async createUserUuidToken(
    uid: string,
    type: TokenEnum,
  ): Promise<TokenEntity> {
    const token =
      type === TokenEnum.CONFIRM_TOKEN || type === TokenEnum.RESET_PASSWORD
        ? uuid().split('-')[0]
        : uuid();

    const newToken = await this.createUuidToken({ token, type });

    await this.userService.createUserToken(uid, newToken);

    return newToken;
  }

  /**
   * Tạo UUid Tokens (Confirm, refresh, repass)
   * */
  async createUuidToken(data: IToken): Promise<TokenEntity> {
    const currentTime = new Date();
    const expire =
      data.type === TokenEnum.CONFIRM_TOKEN ||
      data.type === TokenEnum.RESET_PASSWORD
        ? currentTime.setDate(currentTime.getDate() + 1)
        : currentTime.setFullYear(currentTime.getFullYear() + 1);

    const token = new TokenEntity({
      id: uuid(),
      value: data.token,
      type: data.type,
      ...(data.type !== TokenEnum.ACCESS_TOKEN && {
        expired_at: new Date(expire),
      }),
    });
    const initToken = this.tokenRepository.create(token);

    return await this.tokenRepository.save(initToken);
  }

  /*
   * Xóa Access token và Refresh token của User
   * */
  async deleteAuthTokensByUid(email: string): Promise<boolean> {
    const { access_token, refresh_token } =
      await this.userService.getTokens(email);

    access_token && (await this.deleteUserTokenByVal(access_token.value));
    refresh_token && (await this.deleteUserTokenByVal(refresh_token.value));
    return true;
  }

  /**
   * Xóa token trong token entity và user entity bằng value
   * */
  async deleteUserTokenByVal(value: string): Promise<boolean> {
    try {
      await this.delToken(value);
      await this.userService.deleteUserToken(value);
    } catch (err) {
      throw new BusinessException(`400:${err.message}`);
    }
    return true;
  }

  /*
   * Xác thực Google token bằng lib: OAuth2Client
   * */
  async verifyGGToken(token: string): Promise<ICredentialWithGG> {
    const client = new OAuth2Client(env('GG_CLIENT_ID'));
    let ggCredential = null;
    try {
      const ticket = await client.verifyIdToken({
        idToken: token, // audience: clientId,
      });
      ggCredential = ticket.getPayload();
    } catch (err) {
      throw new BusinessException(`400:${err.message}`);
    }
    return ggCredential;
  }

  /**
   * Kiểm tra tính hợp lệ của token
   * IToken: token, type
   * */
  async checkToken(data: IToken) {
    try {
      const token = await this.findOne(data.token);

      if (token.type !== data.type) return false;

      if (token.type !== TokenEnum.ACCESS_TOKEN) {
        return await this.verifyUuidToken(token);
      } else {
        await this.verifyAccessToken(token.value);
        return Boolean(token);
      }
    } catch (error) {
      return false;
    }
  }

  async resetAllUserTokens(email: string): Promise<boolean> {
    const { access_token, repass_token, refresh_token, confirm_token } =
      await this.userService.getTokens(email);

    await this.userService.resetTokens(email);

    await this.tokenRepository.deleteMany({
      value: {
        $in: [
          access_token && access_token.value,
          refresh_token && refresh_token.value,
          confirm_token && confirm_token.value,
          repass_token && repass_token.value,
        ],
      },
    });

    return true;
  }

  async confirmRefreshToken(token: string): Promise<string | boolean> {
    const isValid = await this.checkToken({
      token: token,
      type: TokenEnum.REFRESH_TOKEN,
    });

    if (!isValid) throw new BusinessException(ErrorEnum.INVALID_TOKEN);

    const user = await this.userService.getByToken(token);
    const { access_token } = await this.userService.getTokens(user.email);
    access_token && (await this.deleteUserTokenByVal(access_token.value));

    const payload = {
      id: user.id,
      email: user.email,
      enable: user.enable,
      status: user.status,
      roles: this.userService.getUserPermissions(user),
    };

    const newAT = await this.createUuidToken({
      token: await this.generateAT(payload),
      type: TokenEnum.ACCESS_TOKEN,
    });

    return await this.userService.createUserToken(user.id, newAT);
  }

  /**
   * Tạo Access Token và thêm vào User
   * */
  async createUserAT(data: ICreateUserToken): Promise<TokenEntity> {
    const newAT = await this.generateAT({
      id: data.uid,
      email: data.email,
      status: data.status,
      enable: data.enable,
      roles: data.roles,
    });

    const accessToken = await this.createUuidToken({
      token: newAT,
      type: TokenEnum.ACCESS_TOKEN,
    });

    await this.userService.createUserToken(data.uid, accessToken);

    return accessToken;
  }

  async verifyUuidToken(token: TokenEntity): Promise<boolean> {
    return token.expired_at >= new Date();
  }

  async verifyAccessToken(token: string): Promise<IAuthPayload> {
    return await this.jwtService.verifyAsync(token);
  }

  async generateAT(payload: IAuthPayload): Promise<string> {
    return await this.jwtService.signAsync(payload);
  }

  async delToken(value: string): Promise<boolean> {
    let result = false;
    try {
      await this.tokenRepository.delete({ value });
      result = true;
    } catch {}
    return result;
  }
}
