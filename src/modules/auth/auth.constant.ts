import { registerEnumType } from '@nestjs/graphql';

export const PUBLIC_KEY = '__is_public__';
export const PERMISSION_KEYS = '__permission_keys__';

export const AuthTypes = {
  LOCAL: 'local',
  JWT: 'jwt',
};

export enum TokenEnum {
  ACCESS_TOKEN = 'access_token',
  REFRESH_TOKEN = 'refresh_token',
  RESET_PASSWORD = 'reset_password',
  CONFIRM_TOKEN = 'confirm_token',
}

registerEnumType(TokenEnum, { name: 'TokenEnum' });
