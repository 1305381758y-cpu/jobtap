import { IsEnum, IsOptional } from 'class-validator';
import { AdminRole, AdminStatus } from '../../database/entities/admin-user.entity';

export class UpdateAdminUserDto {
  @IsOptional()
  @IsEnum(AdminRole)
  role?: AdminRole;

  @IsOptional()
  @IsEnum(AdminStatus)
  status?: AdminStatus;
}
