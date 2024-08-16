import { UserProfile } from '~/modules/system/user/dtos/user-res.dto';

export interface ICredential {
  profile: UserProfile;
  access_token: string;
  refresh_token: string;
}
