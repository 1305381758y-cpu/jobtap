import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as express from 'express';
import { NextFunction, Request, Response } from 'express';
import { existsSync } from 'fs';
import { join } from 'path';
import 'reflect-metadata';
import { AppModule } from './app.module';
import { configureCors } from './common/cors';
import { HttpExceptionLoggingFilter } from './common/http-exception-logging.filter';
import { requireProductionEnv } from './config/env';

function serveAdminConsole(app: INestApplication): void {
  const frontendDist = join(process.cwd(), 'frontend', 'dist');
  const indexPath = join(frontendDist, 'index.html');
  if (!existsSync(indexPath)) return;

  app.use(express.static(frontendDist));
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && req.path !== '/health') {
      res.sendFile(indexPath);
      return;
    }
    next();
  });
}

async function bootstrap() {
  requireProductionEnv();
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionLoggingFilter());
  configureCors(app);
  serveAdminConsole(app);
  await app.listen(process.env.PORT ?? 3000);
}

bootstrap().catch((error: unknown) => {
  console.error('JobTap bootstrap failed', error);
  process.exit(1);
});
