import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { getUserAgent } from '~/utils/user-agent';

export const UserAgent = createParamDecorator(
  (_, context: ExecutionContext) => {
    const request = GqlExecutionContext.create(context).getContext().req;
    return getUserAgent(request);
  },
);
