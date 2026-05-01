import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectJobDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  rejectionReason?: string;
}
