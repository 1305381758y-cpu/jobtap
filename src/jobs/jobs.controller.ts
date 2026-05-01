import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JobSource, JobStatus } from '../database/entities/job.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateAdminJobDto, JobFieldsDto } from './dto/job-fields';
import { RejectJobDto } from './dto/reject-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { JobsService } from './jobs.service';

type AuthenticatedRequest = Request & { admin: { sub: string; email: string } };

@Controller('api/employer/jobs')
export class EmployerJobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  submit(@Body() dto: JobFieldsDto) {
    return this.jobsService.submitEmployerJob(dto);
  }
}

@Controller('api/mobile')
export class MobileJobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get('bootstrap')
  bootstrap(@Query('countryCode') countryCode?: string) {
    return {
      countryCode: countryCode?.toUpperCase() ?? null,
      supportedLocales: ['en', 'zh', 'es', 'fr', 'de', 'pt', 'ja', 'ko', 'ar', 'hi'],
      appConfig: { contactLinkMode: 'external' },
    };
  }

  @Get('jobs')
  list(@Query('countryCode') countryCode: string, @Query('page') page?: string) {
    return this.jobsService.listMobileJobs(countryCode.toUpperCase(), Number(page ?? 1));
  }

  @Get('jobs/:id')
  detail(@Param('id') id: string, @Query('countryCode') countryCode?: string) {
    return this.jobsService.getApprovedJob(id, countryCode?.toUpperCase());
  }
}

@UseGuards(JwtAuthGuard)
@Controller('api/admin/jobs')
export class AdminJobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  list(
    @Query('countryCode') countryCode?: string,
    @Query('status') status?: JobStatus,
    @Query('source') source?: JobSource,
    @Query('search') search?: string,
  ) {
    return this.jobsService.listAdminJobs({
      countryCode: countryCode?.toUpperCase(),
      status,
      source,
      search,
    });
  }

  @Post()
  create(@Body() dto: CreateAdminJobDto, @Req() req: AuthenticatedRequest) {
    return this.jobsService.createAdminJob(dto, req.admin.sub);
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.jobsService.getAdminJob(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateJobDto) {
    return this.jobsService.updateJob(id, dto);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.jobsService.approveJob(id, req.admin.sub);
  }

  @Post(':id/reject')
  reject(@Param('id') id: string, @Body() dto: RejectJobDto, @Req() req: AuthenticatedRequest) {
    return this.jobsService.rejectJob(id, dto, req.admin.sub);
  }

  @Post(':id/remove')
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.jobsService.removeJob(id, req.admin.sub);
  }
}
