export function getUserAgent(request: any) {
  const userAgent: string =
    request.headers['user-agent'] || request.headers['User-Agent'] || undefined;

  return userAgent;
}
