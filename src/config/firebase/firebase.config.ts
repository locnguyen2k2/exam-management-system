import { ConfigType, registerAs } from '@nestjs/config';

import { env } from './../../utils/env';

export const firebaseKey = 'firebase';

export const FirebaseConfig = registerAs(firebaseKey, () => ({
  projectId: env('FIREBASE_PROJECT_ID'),
  privateKey: env('FIREBASE_PRIVATE_KEY'),
  clientEmail: env('FIREBASE_CLIENT_EMAIL'),
}));

export type IFirebaseConfig = ConfigType<typeof FirebaseConfig>;
