import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { Repository } from 'typeorm';
import { AdminStatus, AdminUser } from '../database/entities/admin-user.entity';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(AdminUser) private readonly admins: Repository<AdminUser>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { admin?: unknown }>();
    const header = req.headers.authorization;
    const [scheme, token] = header?.split(' ') ?? [];

    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string; email: string; role: string }>(token);
      const admin = await this.admins.findOne({ where: { id: payload.sub } });
      if (!admin || admin.status !== AdminStatus.Active) {
        throw new UnauthorizedException('Invalid bearer token');
      }
      req.admin = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid bearer token');
    }
  }
}
