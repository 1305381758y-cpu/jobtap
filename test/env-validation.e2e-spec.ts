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
