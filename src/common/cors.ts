import { INestApplication } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

function parseOrigins(value?: string): Set<string> {
  return new Set(
    (value ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}

export function configureCors(app: INestApplication): void {
  const allowedAdminOrigins = parseOrigins(
    process.env.ADMIN_FRONTEND_ORIGINS ?? process.env.ADMIN_FRONTEND_ORIGIN,
  );

  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.header('origin');
    const isAdminApi = req.path.startsWith('/api/admin');
    // Admin APIs are locked to the configured console origins. Public mobile/employer
    // APIs intentionally remain CORS-accessible because they are unauthenticated entrypoints.
    const adminOriginAllowed = !isAdminApi || !origin || allowedAdminOrigins.has(origin);

    if (origin && adminOriginAllowed) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Vary', 'Origin');
    }

    res.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Max-Age', '86400');

    if (req.method === 'OPTIONS') {
      res.status(adminOriginAllowed ? 204 : 403).send();
      return;
    }

    next();
  });
}
