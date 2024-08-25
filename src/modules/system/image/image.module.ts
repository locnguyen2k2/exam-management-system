import { Module } from '@nestjs/common';
import { ImageService } from './image.service';
import { FirebaseModule } from '~/config/firebase/firebase.module';

@Module({
  imports: [FirebaseModule],
  providers: [ImageService],
  exports: [ImageService],
})
export class ImageModule {}
