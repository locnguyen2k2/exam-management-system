import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorEnum } from '~/common/enums/error.enum';

export class BusinessException extends HttpException {
  private readonly errorCode: number;
  constructor(error: ErrorEnum | string) {
    if (!error.includes(':')) {
      super(
        HttpException.createBody({
          code: 200,
          message: error,
        }),
        HttpStatus.OK,
      );
      this.errorCode = 200;
      return;
    }
    const [code, message] = error.split(':');
    super(
      HttpException.createBody({
        message,
      }),
      parseInt(code),
    );
    this.errorCode = Number(code);
  }
  getErrorCode(): number {
    return this.errorCode;
  }
}

export { BusinessException as BizException };
