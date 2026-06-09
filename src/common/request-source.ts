import { Request } from 'express';

export function resolveRequestSource(req: Request): string {
  const forwardedFor = req.header('x-forwarded-for')?.split(',')[0]?.trim();
  return (
    forwardedFor ||
    req.header('cf-connecting-ip') ||
    req.header('x-real-ip') ||
    req.ip ||
    req.socket.remoteAddress ||
    'unknown'
  );
}
