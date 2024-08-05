export interface ICredentialWithGG {
  iss: string;
  azp?: string;
  aud: string;
  sub: string;
  hd?: string; //'student.ctuet.edu.vn';
  email?: string; //'ntloc2001195@student.ctuet.edu.vn';
  email_verified?: boolean;
  name?: string;
  picture?: string;
  given_name?: string; //'Nguyen Tan';
  family_name?: string; //'Loc';
  iat: number;
  exp: number;
}
