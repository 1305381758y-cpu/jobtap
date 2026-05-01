import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { JobStatus } from '../../database/entities/job.entity';

export class JobFieldsDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  employerName: string;

  @Matches(/^[A-Z]{2}$/)
  countryCode: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsBoolean()
  isRemote: boolean;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  salaryText: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  workTimeText: string;

  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  description: string;

  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  contactUrl: string;
}

export class CreateAdminJobDto extends JobFieldsDto {
  @IsOptional()
  @IsIn([JobStatus.Draft, JobStatus.Pending, JobStatus.Approved])
  status?: JobStatus;
}
