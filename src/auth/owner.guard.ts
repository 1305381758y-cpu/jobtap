import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { AdminRole } from '../database/entities/admin-user.entity';

type AuthenticatedRequest = Request & { admin?: { role?: string } };

@Injectable()
export class OwnerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (req.admin?.role !== AdminRole.Owner) {
      throw new ForbiddenException('Owner role required');
    }
    return true;
  }
}
