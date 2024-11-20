import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { getIp } from '~/utils/ip';

export const Ip = createParamDecorator((_, context: ExecutionContext) => {
  const request = GqlExecutionContext.create(context).getContext().req;
  return getIp(request);
});
