import { IsBoolean, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { JobStatus } from '../../database/entities/job.entity';

export class UpdateJobDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  employerName?: string;

  @IsOptional()
  @Matches(/^[A-Z]{2}$/)
  countryCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsBoolean()
  isRemote?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  salaryText?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  workTimeText?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  contactUrl?: string;

  @IsOptional()
  @IsIn([JobStatus.Draft, JobStatus.Pending, JobStatus.Approved, JobStatus.Rejected, JobStatus.Removed])
  status?: JobStatus;
}
