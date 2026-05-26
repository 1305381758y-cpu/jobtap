import { BadRequestException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import {
  AnalyticsEvent,
  AnalyticsEventType,
} from '../database/entities/analytics-event.entity';
import { WindowedAttemptStore } from '../common/windowed-attempt-store';
import { CreateAnalyticsEventDto } from './dto/create-analytics-event.dto';

type StatisticsQuery = {
  countryCode?: string;
  jobId?: string;
  range?: 'all' | 'today' | 'last7' | 'last30';
  startDate?: string;
  endDate?: string;
};

type StatisticsRow = {
  countryCode: string;
  jobId: string;
  activeUsers: string | number;
  detailViews: string | number;
  contactClicks: string | number;
};

@Injectable()
export class AnalyticsService {
  private readonly deviceWindows = new WindowedAttemptStore(60_000);

  constructor(
    @InjectRepository(AnalyticsEvent)
    private readonly events: Repository<AnalyticsEvent>,
  ) {}

  async ingest(dto: CreateAnalyticsEventDto): Promise<AnalyticsEvent> {
    this.assertAllowedDevice(dto.deviceId);
    this.assertWithinRateLimit(dto.deviceId);

    if (
      [AnalyticsEventType.JobDetailView, AnalyticsEventType.ContactClick].includes(dto.eventType) &&
      !dto.jobId
    ) {
      throw new BadRequestException('jobId is required for job analytics events');
    }

    return this.events.save(
      this.events.create({
        ...dto,
        countryCode: dto.countryCode.toUpperCase(),
        jobId: dto.jobId ?? null,
      }),
    );
  }

  async statistics(query: StatisticsQuery): Promise<{ items: Array<Record<string, unknown>> }> {
    const rows = await this.buildStatisticsQuery(query).getRawMany<StatisticsRow>();

    return {
      items: rows.map((row) => {
        const detailViews = Number(row.detailViews);
        const contactClicks = Number(row.contactClicks);
        return {
          countryCode: row.countryCode,
          activeUsers: Number(row.activeUsers),
          jobId: row.jobId,
          detailViews,
          contactClicks,
          contactClickRate: detailViews === 0 ? null : contactClicks / detailViews,
        };
      }),
    };
  }

  private buildStatisticsQuery(query: StatisticsQuery): SelectQueryBuilder<AnalyticsEvent> {
    const qb = this.events
      .createQueryBuilder('event')
      .select('event.countryCode', 'countryCode')
      .addSelect('event.jobId', 'jobId')
      .addSelect('COUNT(DISTINCT event.deviceId)', 'activeUsers')
      .addSelect(
        'COUNT(DISTINCT CASE WHEN event.eventType = :detailType THEN event.deviceId END)',
        'detailViews',
      )
      .addSelect(
        'COUNT(DISTINCT CASE WHEN event.eventType = :clickType THEN event.deviceId END)',
        'contactClicks',
      )
      .where('event.jobId IS NOT NULL')
      .groupBy('event.countryCode')
      .addGroupBy('event.jobId')
      .orderBy('event.countryCode', 'ASC')
      .addOrderBy('event.jobId', 'ASC')
      .setParameters({
        detailType: AnalyticsEventType.JobDetailView,
        clickType: AnalyticsEventType.ContactClick,
      });

    this.applyStatisticsFilters(qb, query);
    return qb;
  }

  private applyStatisticsFilters(
    qb: SelectQueryBuilder<AnalyticsEvent>,
    query: StatisticsQuery,
  ): void {
    if (query.countryCode) {
      qb.andWhere('event.countryCode = :countryCode', { countryCode: query.countryCode.toUpperCase() });
    }
    if (query.jobId) {
      qb.andWhere('event.jobId = :jobId', { jobId: query.jobId });
    }

    if (query.startDate && query.endDate) {
      const startDate = this.parseDate(query.startDate, 'startDate');
      const endDate = this.parseDate(query.endDate, 'endDate');
      if (endDate < startDate) {
        throw new BadRequestException('endDate must be greater than or equal to startDate');
      }
      qb.andWhere('event.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
      return;
    }

    const startDate = this.resolveStartDate(query);
    if (startDate) qb.andWhere('event.createdAt >= :startDate', { startDate });
  }

  private resolveStartDate(query: StatisticsQuery): Date | undefined {
    const now = new Date();
    if (query.range === 'today') {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return start;
    }
    if (query.range === 'last7') {
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
    if (query.range === 'last30') {
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return undefined;
  }

  private parseDate(value: string, field: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${field} must be a valid date`);
    }
    return date;
  }

  private assertAllowedDevice(deviceId: string): void {
    if (/^(.)\1{7,}$/.test(deviceId)) {
      throw new BadRequestException('suspicious deviceId');
    }
  }

  private assertWithinRateLimit(deviceId: string): void {
    const maxEvents = Number(process.env.ANALYTICS_RATE_LIMIT_PER_MINUTE ?? 60);
    if (!this.deviceWindows.attempt(deviceId, maxEvents)) {
      throw new HttpException('analytics rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
    }
  }
}
