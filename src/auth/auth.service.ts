import {
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { AdminRole, AdminStatus, AdminUser } from '../database/entities/admin-user.entity';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    @InjectRepository(AdminUser) private readonly admins: Repository<AdminUser>,
    private readonly jwtService: JwtService,
  ) {}

  async onModuleInit(): Promise<void> {
    const count = await this.admins.count();
    if (count > 0) return;

    const email = (process.env.ADMIN_EMAIL ?? 'admin@jobtap.local').toLowerCase();
    const password = process.env.ADMIN_PASSWORD ?? 'change-me-now';
    const passwordHash = await bcrypt.hash(password, 10);

    await this.admins.save(
      this.admins.create({
        email,
        passwordHash,
        role: AdminRole.Owner,
      }),
    );
  }

  async login(dto: LoginDto): Promise<{ accessToken: string }> {
    const email = dto.email.toLowerCase();
    const admin = await this.admins.findOne({ where: { email } });
    if (!admin) throw new UnauthorizedException('Invalid credentials');
    if (admin.status !== AdminStatus.Active) {
      throw new UnauthorizedException('Admin account disabled');
    }

    const valid = await bcrypt.compare(dto.password, admin.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    admin.lastLoginAt = new Date();
    await this.admins.save(admin);

    return {
      accessToken: await this.jwtService.signAsync({
        sub: admin.id,
        email: admin.email,
        role: admin.role,
      }),
    };
  }

  async listAdmins(): Promise<Array<Omit<AdminUser, 'passwordHash'>>> {
    const admins = await this.admins.find({ order: { createdAt: 'ASC' } });
    return admins.map((admin) => this.serializeAdmin(admin));
  }

  async createAdmin(dto: CreateAdminUserDto): Promise<Omit<AdminUser, 'passwordHash'>> {
    const email = dto.email.toLowerCase();
    const existing = await this.admins.findOne({ where: { email } });
    if (existing) throw new ConflictException('Admin account already exists');

    const admin = await this.admins.save(
      this.admins.create({
        email,
        passwordHash: await bcrypt.hash(dto.password, 10),
        role: dto.role,
        status: dto.status ?? AdminStatus.Active,
      }),
    );
    return this.serializeAdmin(admin);
  }

  async updateAdmin(id: string, dto: UpdateAdminUserDto): Promise<Omit<AdminUser, 'passwordHash'>> {
    const admin = await this.admins.findOne({ where: { id } });
    if (!admin) throw new NotFoundException('Admin account not found');

    if (dto.role) admin.role = dto.role;
    if (dto.status) admin.status = dto.status;

    return this.serializeAdmin(await this.admins.save(admin));
  }

  private serializeAdmin(admin: AdminUser): Omit<AdminUser, 'passwordHash'> {
    return {
      id: admin.id,
      email: admin.email,
      role: admin.role,
      status: admin.status,
      lastLoginAt: admin.lastLoginAt,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
    };
  }
}
