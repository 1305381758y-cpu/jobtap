import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum AnalyticsEventType {
  AppOpen = 'app_open',
  JobListView = 'job_list_view',
  JobDetailView = 'job_detail_view',
  ContactClick = 'contact_click',
}

@Entity('analytics_events')
@Index('idx_analytics_type_country_created', ['eventType', 'countryCode', 'createdAt'])
@Index('idx_analytics_type_country_job_created', ['eventType', 'countryCode', 'jobId', 'createdAt'])
@Index('idx_analytics_country_device_created', ['countryCode', 'deviceId', 'createdAt'])
@Index('idx_analytics_country_job_device_type', ['countryCode', 'jobId', 'deviceId', 'eventType'])
export class AnalyticsEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  eventType: AnalyticsEventType;

  @Column({ default: 1 })
  eventSchemaVersion: number;

  @Column()
  deviceId: string;

  @Column({ length: 2 })
  countryCode: string;

  @Column({ type: 'varchar', nullable: true })
  jobId?: string | null;

  @Column()
  platform: string;

  @Column({ type: 'varchar', nullable: true })
  appVersion?: string | null;

  @Column({ type: 'varchar', nullable: true })
  locale?: string | null;

  @Column({ type: 'varchar', nullable: true })
  sourceScreen?: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
