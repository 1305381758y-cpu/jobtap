import { IsIn, IsInt, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { AnalyticsEventType } from '../../database/entities/analytics-event.entity';

export class CreateAnalyticsEventDto {
  @IsIn(Object.values(AnalyticsEventType))
  eventType: AnalyticsEventType;

  @IsInt()
  @IsIn([1])
  eventSchemaVersion: number;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^[A-Za-z0-9._:-]+$/)
  deviceId: string;

  @Matches(/^[A-Z]{2}$/)
  countryCode: string;

  @IsOptional()
  @IsString()
  jobId?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(40)
  platform: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  appVersion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  locale?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  sourceScreen?: string;
}
