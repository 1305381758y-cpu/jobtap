import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Job, JobSource, JobStatus } from '../database/entities/job.entity';
import { CreateAdminJobDto, JobFieldsDto } from './dto/job-fields';
import { RejectJobDto } from './dto/reject-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';

const BLOCKED_CONTACT_PROTOCOLS = new Set([
  'javascript:',
  'data:',
  'vbscript:',
  'file:',
  'content:',
  'about:',
  'ftp:',
]);

function isContactLinkValid(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return 'Contact link must not be empty';
  if (/[\u0000-\u001F\u007F\s]/.test(trimmed)) {
    return 'Contact link must not contain whitespace or control characters';
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return 'Contact link must be a valid URL or URI';
  }

  if (BLOCKED_CONTACT_PROTOCOLS.has(parsed.protocol)) {
    return 'Contact link protocol is not allowed';
  }

  const scheme = parsed.protocol.slice(0, -1).toLowerCase();

  if (scheme === 'http' || scheme === 'https') {
    if (!parsed.hostname || parsed.hostname.length === 0) {
      return 'Contact link must have a host';
    }
  } else if (scheme === 'mailto' || scheme === 'tel' || scheme === 'sms') {
    const ssp = trimmed.slice(trimmed.indexOf(':') + 1);
    if (!ssp || ssp.length === 0) {
      return 'Contact link scheme-specific part must not be empty';
    }
  } else {
    const ssp = trimmed.slice(trimmed.indexOf(':') + 1);
    if (!ssp || ssp.length === 0) {
      return 'Contact link scheme-specific part must not be empty';
    }
  }

  return null;
}

@Injectable()
export class JobsService {
  constructor(@InjectRepository(Job) private readonly jobs: Repository<Job>) {}

  async submitEmployerJob(dto: JobFieldsDto): Promise<Job> {
    if (dto.website?.trim()) {
      throw new BadRequestException('Hidden website field must stay empty');
    }
    this.assertAllowedContactUrl(dto.contactUrl);
    return this.jobs.save(
      this.jobs.create({
        ...this.normalizeJobFields(dto),
        status: JobStatus.Pending,
        source: JobSource.EmployerSubmitted,
      }),
    );
  }

  async createAdminJob(dto: CreateAdminJobDto, adminId: string): Promise<Job> {
    this.assertAllowedContactUrl(dto.contactUrl);
    const status = dto.status ?? JobStatus.Approved;
    const now = new Date();

    return this.jobs.save(
      this.jobs.create({
        ...this.normalizeJobFields(dto),
        status,
        source: JobSource.AdminCreated,
        createdByAdminId: adminId,
        reviewedByAdminId: status === JobStatus.Approved ? adminId : null,
        reviewedAt: status === JobStatus.Approved ? now : undefined,
        publishedAt: status === JobStatus.Approved ? now : undefined,
      }),
    );
  }

  async listAdminJobs(filters: {
    countryCode?: string;
    status?: JobStatus;
    source?: JobSource;
    search?: string;
  }): Promise<Job[]> {
    const query = this.jobs.createQueryBuilder('job').orderBy('job.createdAt', 'DESC').take(100);

    if (filters.countryCode) {
      query.andWhere('job.countryCode = :countryCode', { countryCode: filters.countryCode });
    }
    if (filters.status) {
      query.andWhere('job.status = :status', { status: filters.status });
    }
    if (filters.source) {
      query.andWhere('job.source = :source', { source: filters.source });
    }
    if (filters.search?.trim()) {
      const search = `%${filters.search.trim().toLowerCase()}%`;
      query.andWhere(
        new Brackets((qb) => {
          qb.where('LOWER(job.id) LIKE :search', { search })
            .orWhere('LOWER(job.title) LIKE :search', { search })
            .orWhere('LOWER(job.employerName) LIKE :search', { search });
        }),
      );
    }

    return query.getMany();
  }

  async listMobileJobs(countryCode: string, page = 1): Promise<{ items: Job[]; page: number }> {
    const safePage = Math.max(1, page);
    const items = await this.jobs.find({
      where: { countryCode, status: JobStatus.Approved },
      order: { publishedAt: 'DESC', createdAt: 'DESC' },
      skip: (safePage - 1) * 20,
      take: 20,
    });

    return { items, page: safePage };
  }

  async getApprovedJob(id: string, countryCode?: string): Promise<Job> {
    const job = await this.jobs.findOne({
      where: {
        id,
        status: JobStatus.Approved,
        ...(countryCode ? { countryCode } : {}),
      },
    });

    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  async getAdminJob(id: string): Promise<Job> {
    const job = await this.jobs.findOne({ where: { id } });
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  async updateJob(id: string, dto: UpdateJobDto): Promise<Job> {
    const job = await this.getAdminJob(id);
    if (dto.contactUrl) this.assertAllowedContactUrl(dto.contactUrl);
    Object.assign(job, this.normalizeJobFields(dto), dto.status ? { status: dto.status } : {});
    return this.jobs.save(job);
  }

  async approveJob(id: string, adminId: string): Promise<Job> {
    const job = await this.getAdminJob(id);
    const now = new Date();
    job.status = JobStatus.Approved;
    job.reviewedByAdminId = adminId;
    job.reviewedAt = now;
    job.publishedAt = now;
    job.rejectionReason = null;
    return this.jobs.save(job);
  }

  async rejectJob(id: string, dto: RejectJobDto, adminId: string): Promise<Job> {
    const job = await this.getAdminJob(id);
    job.status = JobStatus.Rejected;
    job.reviewedByAdminId = adminId;
    job.reviewedAt = new Date();
    job.rejectionReason = dto.rejectionReason ?? null;
    return this.jobs.save(job);
  }

  async removeJob(id: string, adminId: string): Promise<Job> {
    const job = await this.getAdminJob(id);
    job.status = JobStatus.Removed;
    job.reviewedByAdminId = adminId;
    job.reviewedAt = new Date();
    return this.jobs.save(job);
  }

  private normalizeJobFields<T extends Partial<JobFieldsDto>>(dto: T): Partial<Job> {
    const fields = { ...dto };
    delete fields.website;

    return {
      ...fields,
      countryCode: fields.countryCode?.toUpperCase(),
      city: fields.city?.trim() || null,
      title: fields.title?.trim(),
      employerName: fields.employerName?.trim(),
      salaryText: fields.salaryText?.trim(),
      workTimeText: fields.workTimeText?.trim(),
      description: fields.description?.trim(),
      contactUrl: fields.contactUrl?.trim(),
    };
  }

  private assertAllowedContactUrl(contactUrl: string): void {
    const error = isContactLinkValid(contactUrl);
    if (error) {
      throw new BadRequestException(error);
    }
  }
}
