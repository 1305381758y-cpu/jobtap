import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';
import { CreateAnalyticsEventDto } from './dto/create-analytics-event.dto';

@Controller()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('api/mobile/analytics/events')
  ingest(@Body() dto: CreateAnalyticsEventDto) {
    return this.analyticsService.ingest(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('api/admin/statistics')
  statistics(
    @Query('countryCode') countryCode?: string,
    @Query('jobId') jobId?: string,
    @Query('range') range?: 'all' | 'today' | 'last7' | 'last30',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.statistics({ countryCode, jobId, range, startDate, endDate });
  }
}
