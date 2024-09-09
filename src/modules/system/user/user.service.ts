import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { UserEntity } from '~/modules/system/user/entities/user.entity';
import { PageMetaDto } from '~/common/dtos/pagination/page-meta.dto';
import {
  UserPagination,
  UserProfile,
} from '~/modules/system/user/dtos/user-res.dto';
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
import { PermissionEntity } from '~/modules/system/permission/entities/permission.entity';
import { pipeLine } from '~/utils/pipe-line';
import { ImageService } from '~/modules/system/image/image.service';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: MongoRepository<UserEntity>,
    private readonly roleService: RoleService,
    private readonly mailService: MailerService,
    private readonly imageService: ImageService,
  ) {}

  async findAll(
    pageOptions: UserPageOptions = new UserPageOptions(),
  ): Promise<UserPagination> {
    const emailPatterns =
      !_.isEmpty(pageOptions.email) &&
      pageOptions.email.map((domain) => new RegExp(`${domain}$`, 'i'));
    const filterOptions = {
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
    };

    const pipes = [
      searchIndexes(pageOptions.keyword),
      ...pipeLine(pageOptions, filterOptions),
    ];

    const [{ data, pageInfo }]: any[] = await this.userRepository
      .aggregate(pipes)
      .toArray();

    const entities = data;
    const numberRecords = data.length > 0 && pageInfo[0].numberRecords;
    const pageMetaDto = new PageMetaDto({
      pageOptions,
      numberRecords,
    });

    return new UserPagination(entities, pageMetaDto);
  }

  async findOne(id: string): Promise<UserEntity> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (user) return user;
    throw new NotFoundException(`Người dùng không tồn tại!`);
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    await this.mailService.isCtuetEmail(email);

    const user = await this.userRepository.findOne({ where: { email } });
    if (user) return user;
  }

  async findByRole(roleId: string): Promise<UserEntity[]> {
    return await this.userRepository.find({
      where: {
        roleIds: {
          $all: [roleId],
        },
      },
    });
  }

  async create(data: any): Promise<UserEntity> {
    const isExisted = await this.findByEmail(data.email);
    const roleIds: string[] = await this.handleRoleIds(data.roleIds);
    let hashPassword = null;
    delete data.roleIds;

    if (isExisted && isExisted.password)
      throw new BusinessException('400:User is existed!');

    if (data.password) {
      hashPassword = await bcrypt.hashSync(data.password, 10);
      delete data.password;
    }

    const user = new UserEntity({
      ...data,
      roleIds,
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
    await this.findOne(id);

    let photo = '';

    if (!_.isNil(args.photo)) {
      photo += await this.imageService.uploadImage(args.photo);
    }

    const isUpdated = await this.userRepository.update(
      { id },
      {
        ...(args?.lastName && { lastName: args.lastName }),
        ...(args?.firstName && { firstName: args.firstName }),
        ...(!_.isEmpty(photo) && { photo }),
        ...(args?.phone && { phone: args.phone }),
        ...(args?.address && { address: args.address }),
        ...(!_.isNil(args?.enable) && { enable: args.enable }),
        ...(!_.isNil(args?.status) && { status: args.status }),
        ...(args?.updateBy && { update_by: args.updateBy }),
      },
    );

    return isUpdated && (await this.getProfile(id));
  }

  async deleteUserToken(token: string): Promise<boolean> {
    const userToken = await this.userRepository.findOne({
      where: { 'tokens.value': token },
    });

    if (!userToken) throw new BusinessException(ErrorEnum.INVALID_TOKEN);

    await this.userRepository.findOneAndUpdate(
      { 'tokens.value': token },
      {
        $pull: {
          tokens: {
            value: token,
          },
        },
      },
    );

    return true;
  }

  async getUserPermissions(id: string): Promise<any[]> {
    const isExisted = await this.findOne(id);
    const roles: any[] = [];

    const userRoles = await Promise.all(
      isExisted.roleIds.map(async (rid) => await this.roleService.findOne(rid)),
    );

    await Promise.all(
      userRoles.map(async (role: RoleEntity) => {
        const permissions = (await this.roleService.getPermissions(role.id))
          .permissions;

        roles.push({
          value: role.value,
          permissions: permissions.map((pers: PermissionEntity) => pers.value),
        });
      }),
    );

    return roles;

    // const permissions = (
    //   await Promise.all(
    //     userRoles.map(
    //       async (role) =>
    //         (await this.roleService.getPermissions(role.id)).permissions,
    //     ),
    //   )
    // )
    //   .flat()
    //   .map((permission) => permission.value);
    //
    // return permissions;
  }

  async getProfile(uid: string): Promise<UserProfile> {
    const user = await this.findOne(uid);

    return {
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      photo: user.photo,
      phone: user.phone,
      address: user.address,
      gender: user.gender,
      status: user.status,
      enable: user.enable,
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

    if (!isExisted) throw new BusinessException(ErrorEnum.USER_NOT_FOUND);
    if (!isExisted.enable)
      throw new BusinessException(ErrorEnum.USER_UNAVAILABLE);

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

  async handleRoleIds(ids: string[]): Promise<string[]> {
    const roleIds: string[] = [];
    await Promise.all(
      ids.map(async (roleId) => {
        const isRole = await this.roleService.findOne(roleId);
        const index = roleIds.indexOf(isRole.id);
        index === -1 && roleIds.push(roleId);
      }),
    );

    return roleIds;
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

  async userHasToken(
    uid: string,
    value: string,
    type?: TokenEnum,
  ): Promise<TokenEntity> {
    const user = await this.findOne(uid);
    const index = user.tokens.findIndex(
      (token) => token.value === value && token.type === type,
    );
    return user.tokens[index];
  }
}
