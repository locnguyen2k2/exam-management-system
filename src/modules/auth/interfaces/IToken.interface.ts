import { TokenEnum } from '~/modules/auth/auth.constant';

export interface IToken {
  token: string;
  type: TokenEnum;
}

export interface ICreateUserToken {
  uid: string;
  email: string;
  status: boolean;
  enable: boolean;
  roles: string[];
}
