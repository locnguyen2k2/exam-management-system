import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { UserEntity } from '~/modules/system/user/entities/user.entity';
import { UserProfile } from '~/modules/system/user/dtos/user-res.dto';
import { UserPageOptions } from '~/modules/system/user/dtos/user-req.dto';
import { BusinessException } from '~/common/exceptions/biz.exception';
import { RoleService } from '~/modules/system/role/role.service';
import { ErrorEnum } from '~/common/enums/error.enum';
import { TokenEntity } from '~/modules/auth/entities/token.entity';
import { MailerService } from '~/shared/mailer/mailer.service';
import { TokenEnum } from '~/modules/auth/auth.constant';
import * as _ from 'lodash';
import * as bcrypt from 'bcryptjs';
import { searchIndexes } from '~/utils/search';
import { RoleEntity } from '~/modules/system/role/entities/role.entity';
import { ImageService } from '~/modules/system/image/image.service';
import { paginate } from '~/helpers/paginate/paginate';
import { FileUpload } from '~/modules/system/image/image.interface';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: MongoRepository<UserEntity>,
    private readonly roleService: RoleService,
    private readonly mailService: MailerService,
    private readonly imageService: ImageService,
  ) {}

  async findAll(pageOptions: UserPageOptions = new UserPageOptions()) {
    const emailPatterns =
      !_.isEmpty(pageOptions.email) &&
      pageOptions.email.map((domain) => new RegExp(`${domain}$`, 'i'));
    const filterOptions = [
      {
        $match: {
          ...(!_.isEmpty(pageOptions.gender) && {
            gender: { $in: pageOptions.gender },
          }),
          ...(!_.isEmpty(pageOptions.email) && {
            email: {
              $in: emailPatterns,
            },
          }),
          ...(!_.isNil(pageOptions.userStatus) && {
            status: pageOptions.userStatus,
          }),
          ...(!_.isNil(pageOptions.enable) && {
            enable: pageOptions.enable,
          }),
        },
      },
    ];

    return paginate(
      this.userRepository,
      { pageOptions, filterOptions },
      searchIndexes(pageOptions.keyword),
    );
  }

  async findOne(id: string): Promise<UserEntity> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (user) return user;
    throw new NotFoundException(ErrorEnum.USER_NOT_FOUND);
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    await this.mailService.isCtuetEmail(email);

    const user = await this.userRepository.findOne({ where: { email } });
    if (user) return user;
  }

  async findByRole(roleId: string): Promise<UserEntity[]> {
    return await this.userRepository.find({
      where: {
        'roles.id': {
          $all: [roleId],
        },
      },
    });
  }

  async create(data: any): Promise<UserEntity> {
    const isExisted = await this.findByEmail(data.email);
    const roleIds: string[] = this.handleIds(data.roleIds);
    const roles: RoleEntity[] = await Promise.all(
      roleIds.map(async (roleId) => await this.roleService.findOne(roleId)),
    );

    let hashPassword = null;
    delete data.roleIds;

    if (isExisted && isExisted.password)
      throw new BusinessException(ErrorEnum.USER_IS_EXISTED);

    if (data.password) {
      hashPassword = await bcrypt.hashSync(data.password, 10);
      delete data.password;
    }
    let photo = '';
    if (data.photo) {
      const image: Promise<FileUpload> = new Promise((resolve) =>
        resolve(data.photo),
      );
      photo += await this.imageService.uploadImage(image);
    }

    const user = new UserEntity({
      ...data,
      photo: !_.isEmpty(photo) ? photo : null,
      roles,
      password: hashPassword,
      create_by: data.createBy,
      update_by: data.createBy,
    });
    const newUser = this.userRepository.create(user);
    return await this.userRepository.save(newUser);
  }

  async createUserToken(uid: string, token: TokenEntity): Promise<string> {
    await this.userRepository.findOneAndUpdate(
      { id: uid },
      { $push: { tokens: { ...token } } },
      { returnDocument: 'after', upsert: true },
    );

    return token.value;
  }

  async updatePassword(uid: string, password: string): Promise<UserEntity> {
    const hasPassword = await bcrypt.hashSync(password, 10);
    try {
      await this.userRepository.update({ id: uid }, { password: hasPassword });
      return await this.findOne(uid);
    } catch (err) {
      throw new BusinessException(`400:${err.message}`);
    }
  }

  async updateStatus(uid: string, status: boolean): Promise<UserEntity> {
    const user = await this.userRepository.update({ id: uid }, { status });
    return user && (await this.findOne(uid));
  }

  async update(id: string, args: any): Promise<UserProfile> {
    const user = await this.findOne(id);
    let listRole: RoleEntity[] = [];

    let photo = '';

    if (!_.isNil(args.photo)) {
      !_.isEmpty(user.photo) &&
        (await this.imageService.deleteImage(user.photo));

      const image: Promise<FileUpload> = new Promise((resolve) =>
        resolve(args.picture),
      );

      photo += await this.imageService.uploadImage(image);
    }

    if (!_.isEmpty(args.roleIds)) {
      const roleIds = this.handleIds(args.roleIds);
      listRole = await Promise.all(
        roleIds.map(
          async (roleId: string) => await this.roleService.findOne(roleId),
        ),
      );
    }

    const isUpdated = await this.userRepository.update(
      { id },
      {
        ...(args?.lastName && { lastName: args.lastName }),
        ...(args?.firstName && { firstName: args.firstName }),
        ...(!_.isNil(args?.gender) && { gender: args.gender }),
        ...(!_.isEmpty(photo) && { photo }),
        ...(!_.isNil(args?.phone) && { phone: args.phone }),
        ...(args?.address && { address: args.address }),
        ...(!_.isNil(args?.enable) && { enable: args.enable }),
        ...(!_.isNil(args?.status) && { status: args.status }),
        ...(!_.isEmpty(args?.roleIds) && { roles: listRole }),
        ...(args?.updateBy && { update_by: args.updateBy }),
      },
    );

    return isUpdated && (await this.getProfile(id));
  }

  async deleteUser(uid: string): Promise<string> {
    const user = await this.findOne(uid);

    !_.isEmpty(user.photo) && (await this.imageService.deleteImage(user.photo));

    await this.userRepository.deleteOne({ id: uid });

    return 'Xóa thành công!';
  }

  async deleteUserToken(value: string): Promise<boolean> {
    const isExisted = await this.findTokenByValue(value);
    const isDeleted = await this.userRepository.findOneAndUpdate(
      { 'tokens.value': isExisted.value },
      {
        $pull: {
          tokens: {
            value: isExisted.value,
          },
        },
      },
      {
        returnDocument: 'after',
      },
    );

    return !!isDeleted;
  }

  getUserPermissions(user: UserEntity): any[] {
    const roles: any[] = [];

    const userRoles = user.roles.map((role) => role);

    userRoles.map(async (role) => {
      const permissions = role.permissions;

      roles.push({
        value: role.value,
        permissions: permissions.map((pers) => pers.value),
      });
    });

    return roles;
  }

  async getProfile(uid: string): Promise<UserProfile> {
    const user = await this.findOne(uid);
    const roles = this.getUserPermissions(user);

    return {
      name: `${user.firstName} ${user.lastName}`,
      firstName: `${user.firstName}`,
      lastName: `${user.lastName}`,
      email: user.email,
      photo: user.photo,
      phone: user.phone,
      address: user.address,
      gender: user.gender,
      status: user.status,
      enable: user.enable,
      roles: roles.map((role: any) => role.permissions.flat()).flat(),
    };
  }

  async getByToken(value: string): Promise<UserEntity> {
    const user = await this.userRepository.findOneBy({ 'tokens.value': value });

    if (!user) throw new BusinessException(ErrorEnum.INVALID_TOKEN);

    return user;
  }

  /**
   * Kiểm tra email đã tồn tại và lấy danh sách tokens
   * */
  async getTokens(email: string): Promise<{
    access_token?: TokenEntity;
    refresh_token?: TokenEntity;
    repass_token?: TokenEntity;
    confirm_token?: TokenEntity;
  }> {
    const isExisted = await this.findByEmail(email);

    if (!isExisted)
      throw new BusinessException(ErrorEnum.USER_NOT_FOUND, email);
    if (!isExisted.enable)
      throw new BusinessException(ErrorEnum.USER_UNAVAILABLE, email);

    const { tokens } = isExisted;
    const access_token = tokens.find(
      ({ type }) => type === TokenEnum.ACCESS_TOKEN,
    );
    const refresh_token = tokens.find(
      ({ type }) => type === TokenEnum.REFRESH_TOKEN,
    );
    const confirm_token = tokens.find(
      ({ type }) => type === TokenEnum.CONFIRM_TOKEN,
    );
    const repass_token = tokens.find(
      ({ type }) => type === TokenEnum.RESET_PASSWORD,
    );

    return {
      access_token,
      refresh_token,
      confirm_token,
      repass_token,
    };
  }

  handleIds(ids: string[]): string[] {
    let result: string[] = [];
    ids.map((id) => {
      result = [...result.filter((handleId) => handleId !== id), id];
    });

    return result;
  }

  async resetTokens(email: string): Promise<boolean> {
    const { access_token, repass_token, refresh_token, confirm_token } =
      await this.getTokens(email);

    await this.userRepository.findOneAndUpdate(
      { email },
      {
        $pull: {
          tokens: {
            value: {
              $in: [
                access_token && access_token.value,
                refresh_token && refresh_token.value,
                confirm_token && confirm_token.value,
                repass_token && repass_token.value,
              ],
            },
          },
        },
      },
    );

    return true;
  }

  async findTokenByValue(
    value: string,
    type?: TokenEnum,
  ): Promise<TokenEntity> {
    const isExisted = await this.userRepository.findOneBy({
      'tokens.value': value,
    });

    if (!isExisted) throw new BusinessException(ErrorEnum.INVALID_TOKEN);

    const isToken = isExisted.tokens.find((token) => token.value === value);

    if (!_.isNil(type) && isToken.type !== type)
      throw new BusinessException(ErrorEnum.INVALID_TOKEN);

    return isToken;
  }
}
