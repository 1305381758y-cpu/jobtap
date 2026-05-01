import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { AdminRole, AdminStatus } from '../../database/entities/admin-user.entity';

export class CreateAdminUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsEnum(AdminRole)
  role: AdminRole;

  @IsOptional()
  @IsEnum(AdminStatus)
  status?: AdminStatus;
}
