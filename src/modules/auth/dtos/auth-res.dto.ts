import { Field, ObjectType } from '@nestjs/graphql';
import { ICredential } from '~/modules/auth/interfaces/ICredential.interface';

@ObjectType()
export class Credential implements ICredential {
  @Field(() => String)
  access_token: string;
  @Field(() => String)
  refresh_token: string;
}
