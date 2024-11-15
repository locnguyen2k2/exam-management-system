import { Injectable } from '@nestjs/common';
import { FileUpload } from './image.interface';
import * as FormData from 'form-data';
import axios from 'axios';
import { BusinessException } from '~/common/exceptions/biz.exception';
import { env } from '~/utils/env';

@Injectable()
export class ImageService {
  // @Inject('FIREBASE_ADMIN') private readonly firebaseAdmin: admin.app.App,
  constructor() {}

  async uploadImage(picture: Promise<FileUpload>): Promise<string> {
    const formData = new FormData();
    try {
      const { createReadStream, filename, mimetype } = await picture;
      formData.append(
        'operations',
        JSON.stringify({
          query: `query($file: Upload!) { uploadImage(file: $file) }`,
          variables: { file: null },
        }),
      );
      formData.append('map', JSON.stringify({ '0': ['variables.file'] }));
      formData.append('0', createReadStream(), {
        filename,
        contentType: mimetype,
      });

      const { data } = await axios({
        method: 'post',
        url: env('FIREBASE_API_UPLOAD_IMAGE'),
        headers: { ...formData.getHeaders(), 'apollo-require-preflight': true },
        data: formData,
      });

      return data.data.uploadImage;
    } catch (error: any) {
      throw new BusinessException(
        `400:Cập nhật hình ảnh thất bại ${error.message}!`,
      );
    }
  }

  async deleteImage(name: string): Promise<boolean> {
    const query = `
    query {
      deleteImage(file: "${name}")
    }
  `;

    try {
      const { data } = await axios({
        method: 'post',
        url: env('FIREBASE_API_UPLOAD_IMAGE'), // Replace with your GraphQL endpoint
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
          query: query,
        },
      });

      return data.data.deleteImage;
    } catch {
      throw new BusinessException('400:Xóa hình ảnh thất bại!');
    }
  }
}
