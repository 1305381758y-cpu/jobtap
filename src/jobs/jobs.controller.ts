import {
  Body,
  BadRequestException,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { resolveRequestSource } from '../common/request-source';
import { WindowedAttemptStore } from '../common/windowed-attempt-store';
import { JobSource, JobStatus } from '../database/entities/job.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OwnerGuard } from '../auth/owner.guard';
import { CreateAdminJobDto, JobFieldsDto } from './dto/job-fields';
import { RejectJobDto } from './dto/reject-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { JobsService } from './jobs.service';

type AuthenticatedRequest = Request & { admin: { sub: string; email: string; role: string } };

const EMPLOYER_SUBMISSION_LIMIT = 20;
const EMPLOYER_SUBMISSION_WINDOW_MS = 10 * 60 * 1000;

function normalizeOptionalCountryCode(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const normalized = value.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) {
    throw new BadRequestException('countryCode must be a 2-letter country code');
  }
  return normalized;
}

function parseOptionalEnum<T extends Record<string, string>>(
  value: string | undefined,
  allowed: T,
  field: string,
): T[keyof T] | undefined {
  if (value === undefined) return undefined;
  if (Object.values(allowed).includes(value)) return value as T[keyof T];
  throw new BadRequestException(`${field} must be one of: ${Object.values(allowed).join(', ')}`);
}

@Controller('api/employer/jobs')
export class EmployerJobsController {
  private readonly submissionAttempts = new WindowedAttemptStore(EMPLOYER_SUBMISSION_WINDOW_MS);

  constructor(private readonly jobsService: JobsService) {}

  @Post()
  submit(@Body() dto: JobFieldsDto, @Req() req: Request) {
    this.assertWithinRateLimit(req);
    return this.jobsService.submitEmployerJob(dto);
  }

  private assertWithinRateLimit(req: Request): void {
    const source = resolveRequestSource(req);
    if (!this.submissionAttempts.attempt(source, EMPLOYER_SUBMISSION_LIMIT)) {
      throw new HttpException('Too many employer submissions from this source', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

}

@Controller('api/mobile')
export class MobileJobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get('bootstrap')
  bootstrap(
    @Query('countryCode') countryCode?: string,
    @Query('deviceCountryCode') deviceCountryCode?: string,
    @Req() req?: Request,
  ) {
    const normalizeCountryCode = (value: string | undefined | null): string | null => {
      if (!value || value.trim().length === 0) return null;
      const upper = value.trim().toUpperCase();
      if (upper.length !== 2) return null;
      if (!/^[A-Z]{2}$/.test(upper)) return null;
      if (upper === 'XX' || upper === 'T1') return null;
      return upper;
    };

    const deviceQuery = normalizeCountryCode(countryCode) ?? normalizeCountryCode(deviceCountryCode);
    if (deviceQuery) {
      return {
        countryCode: deviceQuery,
        countrySource: 'device',
        supportedLocales: ['en', 'zh', 'es', 'fr', 'de', 'pt', 'ja', 'ko', 'ar', 'hi'],
        appConfig: { contactLinkMode: 'external' },
      };
    }

    const ipHeaderKeys = [
      'cf-ipcountry',
      'x-vercel-ip-country',
      'cloudfront-viewer-country',
      'x-appengine-country',
      'x-country-code',
    ];
    const headers = req?.headers ?? {};
    for (const key of ipHeaderKeys) {
      const headerValue = headers[key];
      const headerCountry = normalizeCountryCode(
        typeof headerValue === 'string' ? headerValue : undefined,
      );
      if (headerCountry) {
        return {
          countryCode: headerCountry,
          countrySource: 'ip',
          supportedLocales: ['en', 'zh', 'es', 'fr', 'de', 'pt', 'ja', 'ko', 'ar', 'hi'],
          appConfig: { contactLinkMode: 'external' },
        };
      }
    }

    return {
      countryCode: null,
      countrySource: null,
      supportedLocales: ['en', 'zh', 'es', 'fr', 'de', 'pt', 'ja', 'ko', 'ar', 'hi'],
      appConfig: { contactLinkMode: 'external' },
    };
  }

  @Get('jobs')
  list(@Query('countryCode') countryCode: string, @Query('page') page?: string) {
    const normalizedCountryCode = countryCode?.trim()?.toUpperCase();
    const parsedPage = page === undefined ? 1 : Number(page);
    if (!normalizedCountryCode || !/^[A-Z]{2}$/.test(normalizedCountryCode)) {
      throw new BadRequestException('countryCode must be a 2-letter country code');
    }
    if (!Number.isInteger(parsedPage) || parsedPage < 1) {
      throw new BadRequestException('page must be a positive integer');
    }

    return this.jobsService.listMobileJobs(normalizedCountryCode, parsedPage);
  }

  @Get('jobs/:id')
  detail(@Param('id', ParseUUIDPipe) id: string, @Query('countryCode') countryCode?: string) {
    return this.jobsService.getApprovedJob(id, normalizeOptionalCountryCode(countryCode));
  }
}

@UseGuards(JwtAuthGuard)
@Controller('api/admin/jobs')
export class AdminJobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  list(
    @Query('countryCode') countryCode?: string,
    @Query('status') status?: string,
    @Query('source') source?: string,
    @Query('search') search?: string,
  ) {
    return this.jobsService.listAdminJobs({
      countryCode: normalizeOptionalCountryCode(countryCode),
      status: parseOptionalEnum(status, JobStatus, 'status'),
      source: parseOptionalEnum(source, JobSource, 'source'),
      search,
    });
  }

  @Post()
  create(@Body() dto: CreateAdminJobDto, @Req() req: AuthenticatedRequest) {
    return this.jobsService.createAdminJob(dto, req.admin.sub);
  }

  @Get(':id')
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.jobsService.getAdminJob(id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateJobDto) {
    return this.jobsService.updateJob(id, dto);
  }

  @Post(':id/approve')
  approve(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequest) {
    return this.jobsService.approveJob(id, req.admin.sub);
  }

  @Post(':id/reject')
  reject(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RejectJobDto, @Req() req: AuthenticatedRequest) {
    return this.jobsService.rejectJob(id, dto, req.admin.sub);
  }

  @Post(':id/remove')
  @UseGuards(JwtAuthGuard, OwnerGuard)
  remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequest) {
    return this.jobsService.removeJob(id, req.admin.sub);
  }
}
