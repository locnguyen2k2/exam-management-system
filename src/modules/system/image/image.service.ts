import { Inject, Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import { env } from '~/utils/env';
import * as GraphQLUpload from 'graphql-upload/GraphQLUpload.js';

@Injectable()
export class ImageService {
  constructor(
    @Inject('FIREBASE_ADMIN') private readonly firebaseAdmin: admin.app.App,
  ) {}

  async handleImage(file: GraphQLUpload): Promise<Express.Multer.File> {
    const { createReadStream, mimetype, filename } = file;

    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      createReadStream()
        .on('data', (chunk: any) => chunks.push(chunk))
        .on('end', () => resolve(Buffer.concat(chunks)))
        .on('error', reject);
    });

    return {
      originalname: filename,
      mimetype,
      buffer,
    } as Express.Multer.File;
  }

  async uploadImage(picture: GraphQLUpload): Promise<string> {
    const file = await this.handleImage(await picture);
    const bucket = this.firebaseAdmin.storage().bucket(env('FIREBASE_BUCKET'));
    const filename = `${uuidv4()}-${file.originalname}`;
    const fileUpload = bucket.file(`uploads/imgs/${filename}`);

    await fileUpload.save(file.buffer, {
      metadata: {
        contentType: file.mimetype,
      },
      public: true,
    });

    return `${filename}`;
  }
}