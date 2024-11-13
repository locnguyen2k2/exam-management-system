import { Injectable } from '@nestjs/common';
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
  ) {}

  async findOne(value: string): Promise<TokenEntity> {
    return await this.userService.findTokenByValue(value);
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
      accessToken &&
        (await this.userService.deleteUserToken(accessToken.value));

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
      refreshToken &&
        (await this.userService.deleteUserToken(refreshToken.value));

      return await this.generateUuidToken(user.id, TokenEnum.REFRESH_TOKEN);
    } else {
      return refreshToken;
    }
  }

  /**
   * Tạo Uuid Token (Confirm, refresh, repass) và thêm vào User
   * */
  async generateUuidToken(uid: string, type: TokenEnum): Promise<TokenEntity> {
    const token =
      type === TokenEnum.CONFIRM_TOKEN || type === TokenEnum.RESET_PASSWORD
        ? uuid().split('-')[0]
        : uuid();

    return await this.createUuidToken(uid, { token, type });
  }

  /**
   * Tạo UUid Tokens (Confirm, refresh, repass)
   * */
  async createUuidToken(uid: string, data: IToken): Promise<TokenEntity> {
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

    const newToken = this.tokenRepository.create(token);

    await this.userService.createUserToken(uid, newToken);

    return newToken;
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
    const token = await this.userService.findTokenByValue(
      data.token,
      data.type,
    );

    try {
      if (token.type !== TokenEnum.ACCESS_TOKEN) {
        return await this.verifyUuidToken(token);
      } else {
        return await this.verifyAccessToken(token.value);
      }
    } catch (error) {
      throw new BusinessException(ErrorEnum.INVALID_TOKEN);
    }
  }

  async confirmRefreshToken(token: string): Promise<string | boolean> {
    await this.checkToken({
      token: token,
      type: TokenEnum.REFRESH_TOKEN,
    });

    const user = await this.userService.getByToken(token);
    const { access_token } = await this.userService.getTokens(user.email);
    access_token &&
      (await this.userService.deleteUserToken(access_token.value));

    const payload = {
      id: user.id,
      email: user.email,
      enable: user.enable,
      status: user.status,
      roles: this.userService.getUserPermissions(user),
    };

    const newAT = await this.createUuidToken(user.id, {
      token: await this.generateAT(payload),
      type: TokenEnum.ACCESS_TOKEN,
    });

    return newAT.value;
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

    return await this.createUuidToken(data.uid, {
      token: newAT,
      type: TokenEnum.ACCESS_TOKEN,
    });
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
}
