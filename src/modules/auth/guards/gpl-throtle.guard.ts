import { GqlExecutionContext } from '@nestjs/graphql';
import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class GqlThrottlerGuard extends ThrottlerGuard {
  getRequestResponse(context: ExecutionContext) {
    // Chuyển đổi Graphql Execution Context
    const ctx = GqlExecutionContext.create(context);
    // Lấy request từ context
    const req = ctx.getContext().req;
    const res = ctx.getContext().res;

    return { req, res };
  }
}
