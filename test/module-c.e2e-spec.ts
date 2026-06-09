import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { configureCors } from '../src/common/cors';

describe('JobTap Module C', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-secret';
    process.env.ADMIN_EMAIL = 'admin@jobtap.test';
    process.env.ADMIN_PASSWORD = 'password1234';
    process.env.ADMIN_FRONTEND_ORIGINS = 'https://admin.jobtap.test';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureCors(app);
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
      .send({ email: 'admin@jobtap.test', password: 'password1234' })
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

  it('returns health status for deployment probes', async () => {
    await request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({ status: 'ok', service: 'jobtap-module-c', database: 'ok' });
        expect(body.timestamp).toEqual(expect.any(String));
      });
  });

  it('keeps admin CORS restricted while public mobile CORS remains available', async () => {
    await request(app.getHttpServer())
      .options('/api/admin/jobs')
      .set('Origin', 'https://evil.example')
      .expect(403)
      .expect((res) => {
        expect(res.headers['access-control-allow-origin']).toBeUndefined();
      });

    await request(app.getHttpServer())
      .options('/api/admin/jobs')
      .set('Origin', 'https://admin.jobtap.test')
      .expect(204)
      .expect('Access-Control-Allow-Origin', 'https://admin.jobtap.test');

    await request(app.getHttpServer())
      .options('/api/mobile/jobs')
      .set('Origin', 'https://public-client.example')
      .expect(204)
      .expect('Access-Control-Allow-Origin', 'https://public-client.example');
  });

  it('rate-limits repeated failed admin logins by source and account', async () => {
    const sourceIp = '198.51.100.24';

    for (let index = 0; index < 5; index += 1) {
      await request(app.getHttpServer())
        .post('/api/admin/login')
        .set('x-forwarded-for', sourceIp)
        .send({ email: 'admin@jobtap.test', password: 'wrong-password' })
        .expect(401);
    }

    await request(app.getHttpServer())
      .post('/api/admin/login')
      .set('x-forwarded-for', sourceIp)
      .send({ email: 'admin@jobtap.test', password: 'wrong-password' })
      .expect(429);
  });

  it('rejects employer submissions that fill the hidden website field', async () => {
    await request(app.getHttpServer())
      .post('/api/employer/jobs')
      .send({
        title: 'Hidden field check',
        employerName: 'Bot Filter Inc',
        countryCode: 'US',
        isRemote: true,
        salaryText: '$20/hour',
        workTimeText: 'Flexible',
        description: 'This submission should be rejected by the honeypot field.',
        contactUrl: 'https://example.com/contact',
        website: 'https://spam.example',
      })
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toContain('Hidden website field must stay empty');
      });
  });

  it('rate-limits noisy employer submissions from the same source', async () => {
    const sourceIp = '203.0.113.77';
    const payload = {
      title: 'Rate limited helper',
      employerName: 'Queue Guard',
      countryCode: 'US',
      isRemote: false,
      salaryText: '$18/hour',
      workTimeText: 'Weekends',
      description: 'Repeated test submission for rate limiting behavior.',
      contactUrl: 'https://example.com/rate-limit',
    };

    for (let index = 0; index < 20; index += 1) {
      await request(app.getHttpServer())
        .post('/api/employer/jobs')
        .set('x-forwarded-for', sourceIp)
        .send({ ...payload, title: `Rate limited helper ${index}` })
        .expect(201);
    }

    await request(app.getHttpServer())
      .post('/api/employer/jobs')
      .set('x-forwarded-for', sourceIp)
      .send({ ...payload, title: 'Rate limited helper overflow' })
      .expect(429);
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
      eventSchemaVersion: 1,
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

  it('reports country active users and counts contact clicks only after same-job detail views', async () => {
    const job = await request(app.getHttpServer())
      .post('/api/admin/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Launch statistics check',
        employerName: 'MetricWorks',
        countryCode: 'BR',
        isRemote: true,
        salaryText: '$22/hour',
        workTimeText: 'Flexible',
        description: 'Temporary job used to verify final launch statistics semantics.',
        contactUrl: 'https://example.com/statistics-check',
        status: 'approved',
      })
      .expect(201);

    const baseEvent = {
      countryCode: 'BR',
      platform: 'android',
      eventSchemaVersion: 1,
    };

    await request(app.getHttpServer())
      .post('/api/mobile/analytics/events')
      .send({ ...baseEvent, eventType: 'app_open', deviceId: 'country-active-a' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/mobile/analytics/events')
      .send({ ...baseEvent, eventType: 'app_open', deviceId: 'country-active-b' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/mobile/analytics/events')
      .send({ ...baseEvent, eventType: 'job_detail_view', deviceId: 'country-active-a', jobId: job.body.id })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/mobile/analytics/events')
      .send({ ...baseEvent, eventType: 'contact_click', deviceId: 'country-active-a', jobId: job.body.id })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/mobile/analytics/events')
      .send({ ...baseEvent, eventType: 'contact_click', deviceId: 'country-active-b', jobId: job.body.id })
      .expect(201);

    const stats = await request(app.getHttpServer())
      .get('/api/admin/statistics')
      .set('Authorization', `Bearer ${token}`)
      .query({ countryCode: 'BR', jobId: job.body.id })
      .expect(200);

    expect(stats.body.items).toHaveLength(1);
    expect(stats.body.items[0]).toMatchObject({
      countryCode: 'BR',
      jobId: job.body.id,
      activeUsers: 2,
      detailViews: 1,
      contactClicks: 1,
      contactClickRate: 1,
    });
  });

  it('rejects invalid analytics statistics date filters', async () => {
    await request(app.getHttpServer())
      .get('/api/admin/statistics')
      .set('Authorization', `Bearer ${token}`)
      .query({ startDate: 'not-a-date', endDate: '2026-05-26T00:00:00.000Z' })
      .expect(400);

    await request(app.getHttpServer())
      .get('/api/admin/statistics')
      .set('Authorization', `Bearer ${token}`)
      .query({
        startDate: '2026-05-27T00:00:00.000Z',
        endDate: '2026-05-26T00:00:00.000Z',
      })
      .expect(400);
  });

  it('accepts Android MVP analytics events with schema version 1', async () => {
    const job = await request(app.getHttpServer())
      .post('/api/admin/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Analytics contract check',
        employerName: 'SignalWorks',
        countryCode: 'US',
        isRemote: true,
        salaryText: '$24/hour',
        workTimeText: 'Flexible',
        description: 'Temporary job used to verify mobile analytics payloads.',
        contactUrl: 'https://example.com/analytics-contract',
        status: 'approved',
      })
      .expect(201);

    const baseEvent = {
      countryCode: 'US',
      platform: 'android',
      appVersion: '1.0.0',
      locale: 'en-US',
      eventSchemaVersion: 1,
    };

    await request(app.getHttpServer())
      .post('/api/mobile/analytics/events')
      .send({ ...baseEvent, eventType: 'app_open', deviceId: 'android-app-open' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/mobile/analytics/events')
      .send({ ...baseEvent, eventType: 'job_list_view', deviceId: 'android-job-list' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/mobile/analytics/events')
      .send({
        ...baseEvent,
        eventType: 'job_detail_view',
        deviceId: 'android-job-detail',
        jobId: job.body.id,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/mobile/analytics/events')
      .send({
        ...baseEvent,
        eventType: 'contact_click',
        deviceId: 'android-contact-click',
        jobId: job.body.id,
      })
      .expect(201);
  });

  it('supports admin account creation, listing, and disabling login', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${token}`)
      .send({
        email: 'ops@jobtap.test',
        password: 'password1234',
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
      .send({ email: 'ops@jobtap.test', password: 'password1234' })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/admin/users/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'disabled' })
      .expect(200)
      .expect(({ body }) => expect(body.status).toBe('disabled'));

    await request(app.getHttpServer())
      .post('/api/admin/login')
      .send({ email: 'ops@jobtap.test', password: 'password1234' })
      .expect(401);

    await request(app.getHttpServer())
      .get('/api/admin/jobs')
      .set('Authorization', `Bearer ${opsLogin.body.accessToken}`)
      .expect(401);
  });

  it('rejects unsupported or suspicious analytics events and rate-limits noisy devices', async () => {
    const validEvent = {
      eventType: 'app_open',
      deviceId: 'rate-device-1',
      countryCode: 'US',
      platform: 'ios',
      eventSchemaVersion: 1,
    };

    await request(app.getHttpServer())
      .post('/api/mobile/analytics/events')
      .send({ ...validEvent, eventSchemaVersion: 99 })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/mobile/analytics/events')
      .send({ ...validEvent, deviceId: 'bot' })
      .expect(400);

    for (let index = 0; index < 60; index += 1) {
      await request(app.getHttpServer())
        .post('/api/mobile/analytics/events')
        .send(validEvent)
        .expect(201);
    }

    await request(app.getHttpServer())
      .post('/api/mobile/analytics/events')
      .send(validEvent)
      .expect(429);
  });

  it('keeps operator admins away from owner-only account and destructive job actions', async () => {
    const operator = await request(app.getHttpServer())
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${token}`)
      .send({
        email: 'limited-ops@jobtap.test',
        password: 'password1234',
        role: 'operator',
        status: 'active',
      })
      .expect(201);

    const operatorLogin = await request(app.getHttpServer())
      .post('/api/admin/login')
      .send({ email: 'limited-ops@jobtap.test', password: 'password1234' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${operatorLogin.body.accessToken}`)
      .send({
        email: 'blocked@jobtap.test',
        password: 'password1234',
        role: 'operator',
        status: 'active',
      })
      .expect(403);

    const job = await request(app.getHttpServer())
      .post('/api/admin/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Owner removal check',
        employerName: 'AccessWorks',
        countryCode: 'US',
        isRemote: false,
        salaryText: '$19/hour',
        workTimeText: 'Weekdays',
        description: 'Temporary job for permission testing.',
        contactUrl: 'https://example.com/remove-check',
        status: 'approved',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/admin/jobs/${job.body.id}/remove`)
      .set('Authorization', `Bearer ${operatorLogin.body.accessToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/api/admin/users/${operator.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'disabled' })
      .expect(200);
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

  it('rejects invalid mobile jobs query parameters with 400', async () => {
    await request(app.getHttpServer())
      .get('/api/mobile/jobs')
      .query({ page: 1 })
      .expect(400);

    await request(app.getHttpServer())
      .get('/api/mobile/jobs')
      .query({ countryCode: 'US', page: 'zero' })
      .expect(400);

    await request(app.getHttpServer())
      .get('/api/mobile/jobs')
      .query({ countryCode: 'USA', page: 1 })
      .expect(400);
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

  describe('GET /api/mobile/bootstrap country detection', () => {
    it('device query countryCode wins over IP header', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/mobile/bootstrap')
        .query({ countryCode: 'DE' })
        .set('cf-ipcountry', 'US')
        .expect(200);

      expect(res.body).toMatchObject({
        countryCode: 'DE',
        countrySource: 'device',
      });
      expect(res.body.supportedLocales).toBeDefined();
      expect(res.body.appConfig).toBeDefined();
    });

    it('device countryCode normalizes to uppercase', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/mobile/bootstrap')
        .query({ countryCode: 'gb' })
        .expect(200);

      expect(res.body.countryCode).toBe('GB');
      expect(res.body.countrySource).toBe('device');
    });

    it('deviceCountryCode query param is accepted as fallback', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/mobile/bootstrap')
        .query({ deviceCountryCode: 'JP' })
        .expect(200);

      expect(res.body.countryCode).toBe('JP');
      expect(res.body.countrySource).toBe('device');
    });

    it('IP header fallback works when no query param provided', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/mobile/bootstrap')
        .set('cf-ipcountry', 'FR')
        .expect(200);

      expect(res.body.countryCode).toBe('FR');
      expect(res.body.countrySource).toBe('ip');
    });

    it('x-vercel-ip-country header fallback works', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/mobile/bootstrap')
        .set('x-vercel-ip-country', 'BR')
        .expect(200);

      expect(res.body.countryCode).toBe('BR');
      expect(res.body.countrySource).toBe('ip');
    });

    it('cloudfront-viewer-country header fallback works', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/mobile/bootstrap')
        .set('cloudfront-viewer-country', 'AU')
        .expect(200);

      expect(res.body.countryCode).toBe('AU');
      expect(res.body.countrySource).toBe('ip');
    });

    it('x-appengine-country header fallback works', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/mobile/bootstrap')
        .set('x-appengine-country', 'IN')
        .expect(200);

      expect(res.body.countryCode).toBe('IN');
      expect(res.body.countrySource).toBe('ip');
    });

    it('x-country-code header fallback works', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/mobile/bootstrap')
        .set('x-country-code', 'KR')
        .expect(200);

      expect(res.body.countryCode).toBe('KR');
      expect(res.body.countrySource).toBe('ip');
    });

    it('invalid XX country code returns null', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/mobile/bootstrap')
        .query({ countryCode: 'XX' })
        .expect(200);

      expect(res.body.countryCode).toBeNull();
      expect(res.body.countrySource).toBeNull();
    });

    it('invalid T1 country code returns null', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/mobile/bootstrap')
        .query({ countryCode: 'T1' })
        .expect(200);

      expect(res.body.countryCode).toBeNull();
      expect(res.body.countrySource).toBeNull();
    });

    it('empty country code returns null', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/mobile/bootstrap')
        .query({ countryCode: '' })
        .expect(200);

      expect(res.body.countryCode).toBeNull();
      expect(res.body.countrySource).toBeNull();
    });

    it('single-char country code returns null', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/mobile/bootstrap')
        .query({ countryCode: 'U' })
        .expect(200);

      expect(res.body.countryCode).toBeNull();
      expect(res.body.countrySource).toBeNull();
    });

    it('three-char country code returns null', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/mobile/bootstrap')
        .query({ countryCode: 'USA' })
        .expect(200);

      expect(res.body.countryCode).toBeNull();
      expect(res.body.countrySource).toBeNull();
    });

    it('non-alpha country code returns null', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/mobile/bootstrap')
        .query({ countryCode: '1!' })
        .expect(200);

      expect(res.body.countryCode).toBeNull();
      expect(res.body.countrySource).toBeNull();
    });

    it('no query param and no IP headers returns null', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/mobile/bootstrap')
        .expect(200);

      expect(res.body.countryCode).toBeNull();
      expect(res.body.countrySource).toBeNull();
    });
  });

  describe('contact link validation', () => {
    const validJob = {
      title: 'Test position',
      employerName: 'Test Corp',
      countryCode: 'US',
      isRemote: false,
      salaryText: '$20/hr',
      workTimeText: 'Weekdays',
      description: 'A test job with enough characters to pass.',
    };

    it('rejects ftp://', async () => {
      await request(app.getHttpServer())
        .post('/api/employer/jobs')
        .send({ ...validJob, contactUrl: 'ftp://files.example.com' })
        .expect(400);
    });

    it('rejects content://', async () => {
      await request(app.getHttpServer())
        .post('/api/employer/jobs')
        .send({ ...validJob, contactUrl: 'content://com.android.contacts' })
        .expect(400);
    });

    it('rejects about:blank', async () => {
      await request(app.getHttpServer())
        .post('/api/employer/jobs')
        .send({ ...validJob, contactUrl: 'about:blank' })
        .expect(400);
    });

    it('rejects vbscript:', async () => {
      await request(app.getHttpServer())
        .post('/api/employer/jobs')
        .send({ ...validJob, contactUrl: "vbscript:msgbox('xss')" })
        .expect(400);
    });

    it('rejects http with missing host', async () => {
      await request(app.getHttpServer())
        .post('/api/employer/jobs')
        .send({ ...validJob, contactUrl: 'http:' })
        .expect(400);
    });

    it('rejects links with embedded whitespace or control characters', async () => {
      await request(app.getHttpServer())
        .post('/api/employer/jobs')
        .send({ ...validJob, contactUrl: 'https://example.com/unsafe path' })
        .expect(400);

      await request(app.getHttpServer())
        .post('/api/employer/jobs')
        .send({ ...validJob, contactUrl: 'java\nscript:alert(1)' })
        .expect(400);
    });

    it('accepts sms:+123', async () => {
      await request(app.getHttpServer())
        .post('/api/employer/jobs')
        .send({ ...validJob, contactUrl: 'sms:+1234567890' })
        .expect(201);
    });

    it('accepts custom app deep link (whatsapp://)', async () => {
      await request(app.getHttpServer())
        .post('/api/employer/jobs')
        .send({ ...validJob, contactUrl: 'whatsapp://send?phone=123' })
        .expect(201);
    });
  });

  describe('input validation hardening', () => {
    it('rejects non-UUID job id parameters with 400', async () => {
      await request(app.getHttpServer())
        .get('/api/mobile/jobs/not-a-uuid')
        .expect(400);

      await request(app.getHttpServer())
        .get('/api/admin/jobs/not-a-uuid')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      await request(app.getHttpServer())
        .patch('/api/admin/users/not-a-uuid')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'disabled' })
        .expect(400);
    });

    it('rejects invalid status and source enum values on admin job list', async () => {
      await request(app.getHttpServer())
        .get('/api/admin/jobs')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      await request(app.getHttpServer())
        .get('/api/admin/jobs')
        .set('Authorization', `Bearer ${token}`)
        .query({ status: 'invalid_status' })
        .expect(400);

      await request(app.getHttpServer())
        .get('/api/admin/jobs')
        .set('Authorization', `Bearer ${token}`)
        .query({ source: 'invalid_source' })
        .expect(400);
    });

    it('rejects invalid countryCode filters on admin and mobile job detail endpoints', async () => {
      await request(app.getHttpServer())
        .get('/api/admin/jobs')
        .set('Authorization', `Bearer ${token}`)
        .query({ countryCode: 'USA' })
        .expect(400);

      await request(app.getHttpServer())
        .get('/api/mobile/jobs/00000000-0000-4000-8000-000000000001')
        .query({ countryCode: 'USA' })
        .expect(400);
    });

    it('rejects mobile job list when countryCode is missing', async () => {
      await request(app.getHttpServer())
        .get('/api/mobile/jobs')
        .query({ page: 1 })
        .expect(400)
        .expect(({ body }) => {
          expect(body.message).toContain('countryCode');
        });
    });
  });
});
