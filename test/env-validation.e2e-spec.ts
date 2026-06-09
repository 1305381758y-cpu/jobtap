import { requireProductionEnv } from '../src/config/env';

describe('production environment validation', () => {
  it('rejects production startup when required variables are missing', () => {
    expect(() => requireProductionEnv({ NODE_ENV: 'production' })).toThrow(
      /JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, DATABASE_URL/,
    );
  });

  it('accepts production startup when required variables are present', () => {
    expect(() =>
      requireProductionEnv({
        NODE_ENV: 'production',
        JWT_SECRET: 'prod-secret-not-default-with-32-chars',
        ADMIN_EMAIL: 'owner@example.com',
        ADMIN_PASSWORD: 'strong-password-not-default',
        DATABASE_URL: 'postgres://user:pass@host:5432/db',
        TYPEORM_SYNCHRONIZE: 'false',
      }),
    ).not.toThrow();
  });

  it('rejects invalid optional production environment values', () => {
    const validProductionEnv = {
      NODE_ENV: 'production',
      JWT_SECRET: 'prod-secret-not-default-with-32-chars',
      ADMIN_EMAIL: 'owner@example.com',
      ADMIN_PASSWORD: 'strong-password-not-default',
      DATABASE_URL: 'postgres://user:pass@host:5432/db',
      TYPEORM_SYNCHRONIZE: 'false',
    };

    expect(() => requireProductionEnv({ ...validProductionEnv, PORT: 'abc' })).toThrow(/PORT/);
    expect(() =>
      requireProductionEnv({ ...validProductionEnv, ANALYTICS_RATE_LIMIT_PER_MINUTE: '0' }),
    ).toThrow(/ANALYTICS_RATE_LIMIT_PER_MINUTE/);
    expect(() =>
      requireProductionEnv({ ...validProductionEnv, ADMIN_FRONTEND_ORIGINS: 'not-a-url' }),
    ).toThrow(/ADMIN_FRONTEND_ORIGINS/);
  });

  it('rejects production startup with local default database credentials', () => {
    expect(() =>
      requireProductionEnv({
        NODE_ENV: 'production',
        JWT_SECRET: 'prod-secret-not-default-with-32-chars',
        ADMIN_EMAIL: 'owner@example.com',
        ADMIN_PASSWORD: 'strong-password-not-default',
        DATABASE_URL: 'postgres://jobtap:jobtap@localhost:5432/jobtap',
        TYPEORM_SYNCHRONIZE: 'false',
      }),
    ).toThrow(/DATABASE_URL/);
  });

  it('rejects production startup with synchronize enabled', () => {
    expect(() =>
      requireProductionEnv({
        NODE_ENV: 'production',
        JWT_SECRET: 'prod-secret-not-default-with-32-chars',
        ADMIN_EMAIL: 'owner@example.com',
        ADMIN_PASSWORD: 'strong-password-not-default',
        DATABASE_URL: 'postgres://user:pass@host:5432/db',
        TYPEORM_SYNCHRONIZE: 'true',
      }),
    ).toThrow(/TYPEORM_SYNCHRONIZE/);
  });
});
