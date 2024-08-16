import { Field, ObjectType } from '@nestjs/graphql';
import { ICredential } from '~/modules/auth/interfaces/ICredential.interface';
import { UserProfile } from '~/modules/system/user/dtos/user-res.dto';

@ObjectType()
export class Credential implements ICredential {
  @Field(() => UserProfile)
  profile: UserProfile;
  @Field(() => String)
  access_token: string;
  @Field(() => String)
  refresh_token: string;
}
