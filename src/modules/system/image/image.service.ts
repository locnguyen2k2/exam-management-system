import { Injectable } from '@nestjs/common';
import { FileUpload } from '~/modules/system/question/dtos/question-req.dto';
import * as FormData from 'form-data';
import axios from 'axios';
import * as fs from 'fs';
import { createWriteStream } from 'fs';
import * as path from 'path';
import { BusinessException } from '~/common/exceptions/biz.exception';
import { env } from "~/utils/env";

@Injectable()
export class ImageService {
  // @Inject('FIREBASE_ADMIN') private readonly firebaseAdmin: admin.app.App,
  constructor() {}

  async saveFile(file: FileUpload): Promise<string> {
    const { createReadStream, filename } = file;
    const filePath = path.join(__dirname, filename);

    return new Promise((resolve, reject) => {
      createReadStream()
        .pipe(createWriteStream(filePath))
        .on('finish', () => resolve(filePath))
        .on('error', reject);
    });
  }

  async uploadImage(picture: Promise<FileUpload>): Promise<string> {
    const formData = new FormData();
    const file = await picture;
    const filePath = await this.saveFile(file);

    formData.append(
      'operations',
      JSON.stringify({
        query: `query($file: Upload!) { uploadImage(file: $file) }`,
      }),
    );
    formData.append('map', JSON.stringify({ '0': ['variables.file'] }));
    formData.append('0', fs.createReadStream(filePath), file.filename);

    try {
      const { data } = await axios({
        method: 'post',
        url: env('FIREBASE_API_UPLOAD_IMAGE'),
        headers: { ...formData.getHeaders(), 'apollo-require-preflight': true },
        data: formData,
      });

      const fileName = data.data.uploadImage;
      return fileName;
    } catch {
      throw new BusinessException('400:Cập nhật hình ảnh thất bại!');
    }
  }
}
