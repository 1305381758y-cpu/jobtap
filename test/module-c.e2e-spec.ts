import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request = require('supertest');
import { AppModule } from '../src/app.module';

describe('JobTap Module C', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-secret';
    process.env.ADMIN_EMAIL = 'admin@jobtap.test';
    process.env.ADMIN_PASSWORD = 'password123';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects clearly invalid employer contact links', async () => {
    await request(app.getHttpServer())
      .post('/api/employer/jobs')
      .send({
        title: 'Evening cashier',
        employerName: 'Corner Market',
        countryCode: 'US',
        isRemote: false,
        salaryText: '$18/hour',
        workTimeText: 'Weeknights',
        description: 'Help with register and closing tasks.',
        contactUrl: 'javascript:alert(1)',
      })
      .expect(400);
  });

  it('keeps employer submissions hidden until an admin approves them', async () => {
    const submission = await request(app.getHttpServer())
      .post('/api/employer/jobs')
      .send({
        title: 'Evening cashier',
        employerName: 'Corner Market',
        countryCode: 'US',
        city: 'Seattle',
        isRemote: false,
        salaryText: '$18/hour',
        workTimeText: 'Weeknights',
        description: 'Help with register and closing tasks.',
        contactUrl: 'https://example.com/contact',
      })
      .expect(201);

    expect(submission.body.status).toBe('pending');

    const hidden = await request(app.getHttpServer())
      .get('/api/mobile/jobs')
      .query({ countryCode: 'US', page: 1 })
      .expect(200);

    expect(hidden.body.items).toHaveLength(0);

    const login = await request(app.getHttpServer())
      .post('/api/admin/login')
      .send({ email: 'admin@jobtap.test', password: 'password123' })
      .expect(201);

    token = login.body.accessToken;
    expect(token).toEqual(expect.any(String));

    const approved = await request(app.getHttpServer())
      .post(`/api/admin/jobs/${submission.body.id}/approve`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    expect(approved.body.status).toBe('approved');
    expect(approved.body.publishedAt).toEqual(expect.any(String));

    const visible = await request(app.getHttpServer())
      .get('/api/mobile/jobs')
      .query({ countryCode: 'US', page: 1 })
      .expect(200);

    expect(visible.body.items).toHaveLength(1);
    expect(visible.body.items[0]).toMatchObject({
      id: submission.body.id,
      title: 'Evening cashier',
      countryCode: 'US',
    });
  });

  it('deduplicates analytics statistics by country, job, and device', async () => {
    const job = await request(app.getHttpServer())
      .post('/api/admin/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Remote data labeling',
        employerName: 'LabelWorks',
        countryCode: 'US',
        isRemote: true,
        salaryText: '$20/hour',
        workTimeText: 'Flexible',
        description: 'Review short text snippets.',
        contactUrl: 'mailto:hiring@example.com',
        status: 'approved',
      })
      .expect(201);

    const event = {
      deviceId: 'device-a',
      countryCode: 'US',
      platform: 'ios',
      jobId: job.body.id,
    };

    await request(app.getHttpServer())
      .post('/api/mobile/analytics/events')
      .send({ ...event, eventType: 'app_open' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/mobile/analytics/events')
      .send({ ...event, eventType: 'job_detail_view' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/mobile/analytics/events')
      .send({ ...event, eventType: 'job_detail_view' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/mobile/analytics/events')
      .send({ ...event, eventType: 'contact_click' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/mobile/analytics/events')
      .send({ ...event, eventType: 'contact_click' })
      .expect(201);

    const stats = await request(app.getHttpServer())
      .get('/api/admin/statistics')
      .set('Authorization', `Bearer ${token}`)
      .query({ countryCode: 'US', jobId: job.body.id })
      .expect(200);

    expect(stats.body.items).toHaveLength(1);
    expect(stats.body.items[0]).toMatchObject({
      countryCode: 'US',
      jobId: job.body.id,
      activeUsers: 1,
      detailViews: 1,
      contactClicks: 1,
      contactClickRate: 1,
    });
  });

  it('supports admin account creation, listing, and disabling login', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${token}`)
      .send({
        email: 'ops@jobtap.test',
        password: 'password123',
        role: 'operator',
        status: 'active',
      })
      .expect(201);

    expect(created.body).toMatchObject({
      email: 'ops@jobtap.test',
      role: 'operator',
      status: 'active',
    });
    expect(created.body.passwordHash).toBeUndefined();

    const users = await request(app.getHttpServer())
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(users.body.map((user: { email: string }) => user.email)).toContain('ops@jobtap.test');

    const opsLogin = await request(app.getHttpServer())
      .post('/api/admin/login')
      .send({ email: 'ops@jobtap.test', password: 'password123' })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/admin/users/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'disabled' })
      .expect(200)
      .expect(({ body }) => expect(body.status).toBe('disabled'));

    await request(app.getHttpServer())
      .post('/api/admin/login')
      .send({ email: 'ops@jobtap.test', password: 'password123' })
      .expect(401);

    await request(app.getHttpServer())
      .get('/api/admin/jobs')
      .set('Authorization', `Bearer ${opsLogin.body.accessToken}`)
      .expect(401);
  });

  it('protects admin jobs and supports review filters plus partial job id search', async () => {
    await request(app.getHttpServer()).get('/api/admin/jobs').expect(401);

    const pending = await request(app.getHttpServer())
      .post('/api/employer/jobs')
      .send({
        title: 'Weekend event helper',
        employerName: 'City Events',
        countryCode: 'CA',
        city: 'Toronto',
        isRemote: false,
        salaryText: 'CAD 22/hour',
        workTimeText: 'Saturday and Sunday',
        description: 'Support guest check-in and venue reset.',
        contactUrl: 'tel:+14165550100',
      })
      .expect(201);

    const rejected = await request(app.getHttpServer())
      .post(`/api/admin/jobs/${pending.body.id}/reject`)
      .set('Authorization', `Bearer ${token}`)
      .send({ rejectionReason: 'Duplicate submission' })
      .expect(201);

    expect(rejected.body).toMatchObject({
      id: pending.body.id,
      status: 'rejected',
      rejectionReason: 'Duplicate submission',
    });

    const mobileList = await request(app.getHttpServer())
      .get('/api/mobile/jobs')
      .query({ countryCode: 'CA' })
      .expect(200);

    expect(mobileList.body.items).toHaveLength(0);

    const partialJobId = pending.body.id.slice(0, 8);
    const filtered = await request(app.getHttpServer())
      .get('/api/admin/jobs')
      .set('Authorization', `Bearer ${token}`)
      .query({
        status: 'rejected',
        source: 'employer_submitted',
        search: partialJobId,
      })
      .expect(200);

    expect(filtered.body).toHaveLength(1);
    expect(filtered.body[0]).toMatchObject({
      id: pending.body.id,
      title: 'Weekend event helper',
      status: 'rejected',
      source: 'employer_submitted',
    });
  });

  it('removes approved jobs from mobile visibility', async () => {
    const job = await request(app.getHttpServer())
      .post('/api/admin/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Cafe opener',
        employerName: 'Morning Cup',
        countryCode: 'GB',
        city: 'London',
        isRemote: false,
        salaryText: 'GBP 16/hour',
        workTimeText: 'Weekday mornings',
        description: 'Open the cafe and prepare early orders.',
        contactUrl: 'https://example.co.uk/jobs/cafe-opener',
        status: 'approved',
      })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/mobile/jobs')
      .query({ countryCode: 'GB' })
      .expect(200)
      .expect(({ body }) => expect(body.items).toHaveLength(1));

    await request(app.getHttpServer())
      .post(`/api/admin/jobs/${job.body.id}/remove`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201)
      .expect(({ body }) => expect(body.status).toBe('removed'));

    await request(app.getHttpServer())
      .get('/api/mobile/jobs')
      .query({ countryCode: 'GB' })
      .expect(200)
      .expect(({ body }) => expect(body.items).toHaveLength(0));
  });
});
