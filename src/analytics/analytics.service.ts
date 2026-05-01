import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, MoreThanOrEqual, Repository } from 'typeorm';
import {
  AnalyticsEvent,
  AnalyticsEventType,
} from '../database/entities/analytics-event.entity';
import { CreateAnalyticsEventDto } from './dto/create-analytics-event.dto';

type StatisticsQuery = {
  countryCode?: string;
  jobId?: string;
  range?: 'all' | 'today' | 'last7' | 'last30';
  startDate?: string;
  endDate?: string;
};

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(AnalyticsEvent)
    private readonly events: Repository<AnalyticsEvent>,
  ) {}

  async ingest(dto: CreateAnalyticsEventDto): Promise<AnalyticsEvent> {
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
    const where = this.buildWhere(query);
    const events = await this.events.find({ where });
    const activeUsersByCountry = new Map<string, Set<string>>();
    const detailDevices = new Map<string, Set<string>>();
    const clickDevices = new Map<string, Set<string>>();

    for (const event of events) {
      this.addToSet(activeUsersByCountry, event.countryCode, event.deviceId);

      if (!event.jobId) continue;
      const key = `${event.countryCode}:${event.jobId}`;

      if (event.eventType === AnalyticsEventType.JobDetailView) {
        this.addToSet(detailDevices, key, event.deviceId);
      }
      if (event.eventType === AnalyticsEventType.ContactClick) {
        this.addToSet(clickDevices, key, event.deviceId);
      }
    }

    const keys = new Set([...detailDevices.keys(), ...clickDevices.keys()]);
    const items = [...keys].sort().map((key) => {
      const [countryCode, jobId] = key.split(':');
      const detailViews = detailDevices.get(key)?.size ?? 0;
      const contactClicks = clickDevices.get(key)?.size ?? 0;
      return {
        countryCode,
        activeUsers: activeUsersByCountry.get(countryCode)?.size ?? 0,
        jobId,
        detailViews,
        contactClicks,
        contactClickRate: detailViews === 0 ? null : contactClicks / detailViews,
      };
    });

    return { items };
  }

  private buildWhere(query: StatisticsQuery): FindOptionsWhere<AnalyticsEvent> {
    const where: FindOptionsWhere<AnalyticsEvent> = {};
    if (query.countryCode) where.countryCode = query.countryCode.toUpperCase();
    if (query.jobId) where.jobId = query.jobId;

    const createdAt = this.resolveDateFilter(query);
    if (createdAt) where.createdAt = createdAt;
    return where;
  }

  private resolveDateFilter(query: StatisticsQuery) {
    if (query.startDate && query.endDate) {
      return Between(new Date(query.startDate), new Date(query.endDate));
    }

    const now = new Date();
    if (query.range === 'today') {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return MoreThanOrEqual(start);
    }
    if (query.range === 'last7') {
      return MoreThanOrEqual(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
    }
    if (query.range === 'last30') {
      return MoreThanOrEqual(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
    }

    return undefined;
  }

  private addToSet(map: Map<string, Set<string>>, key: string, value: string): void {
    const current = map.get(key) ?? new Set<string>();
    current.add(value);
    map.set(key, current);
  }
}
