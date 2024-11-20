export function getIp(request: any) {
  const req = request as any;

  let ip: string =
    request.headers['x-Forwarded-for'] ||
    request.headers['X-Forwarded-For'] ||
    request.headers['X-Real-IP'] ||
    request.headers['x-real-ip'] ||
    req?.ip ||
    req?.connection?.remoteAddress ||
    req?.socket?.remoteAddress ||
    undefined;

  if (ip && ip.split(',').length > 0) ip = ip.split(',')[0];
  return ip;
}
