import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum JobStatus {
  Draft = 'draft',
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected',
  Removed = 'removed',
}

export enum JobSource {
  EmployerSubmitted = 'employer_submitted',
  AdminCreated = 'admin_created',
}

@Entity('jobs')
@Index('idx_jobs_country_status_published', ['countryCode', 'status', 'publishedAt'])
@Index('idx_jobs_status_source_created', ['status', 'source', 'createdAt'])
export class Job {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column()
  employerName: string;

  @Column({ length: 2 })
  countryCode: string;

  @Column({ type: 'varchar', nullable: true })
  city?: string | null;

  @Column()
  isRemote: boolean;

  @Column()
  salaryText: string;

  @Column()
  workTimeText: string;

  @Column('text')
  description: string;

  @Column()
  contactUrl: string;

  @Column({ type: 'varchar', default: JobStatus.Pending })
  status: JobStatus;

  @Column({ type: 'varchar', default: JobSource.EmployerSubmitted })
  source: JobSource;

  @Column({ type: 'varchar', nullable: true })
  createdByAdminId?: string | null;

  @Column({ type: 'varchar', nullable: true })
  reviewedByAdminId?: string | null;

  @Column({ type: 'text', nullable: true })
  rejectionReason?: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  reviewedAt?: Date;

  @Column({ nullable: true })
  publishedAt?: Date;
}
