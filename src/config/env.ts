const REQUIRED_PRODUCTION_ENV = [
  'JWT_SECRET',
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD',
  'DATABASE_URL',
] as const;

const DEFAULT_JWT_SECRETS = ['dev-secret-change-me', 'replace-with-a-long-random-secret'];
const DEFAULT_ADMIN_EMAIL = 'admin@jobtap.local';
const DEFAULT_ADMIN_PASSWORDS = ['replace-this-password', 'change-me-now'];
const DEFAULT_DATABASE_URLS = [
  'postgres://jobtap:jobtap@localhost:5432/jobtap',
  'postgresql://jobtap:jobtap@localhost:5432/jobtap',
];

export function isProductionRuntime(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV === 'production';
}

export function requireProductionEnv(env: NodeJS.ProcessEnv = process.env): void {
  if (!isProductionRuntime(env)) return;

  const errors: string[] = [];
  const missing = REQUIRED_PRODUCTION_ENV.filter((key) => !env[key]?.trim());
  if (missing.length) {
    errors.push(`Missing required production environment variables: ${missing.join(', ')}`);
  }
  if (env.JWT_SECRET && DEFAULT_JWT_SECRETS.includes(env.JWT_SECRET.trim())) {
    errors.push('JWT_SECRET must not use a known default value');
  }
  if (env.JWT_SECRET && env.JWT_SECRET.trim().length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters in production');
  }
  if (env.ADMIN_EMAIL?.trim() === DEFAULT_ADMIN_EMAIL) {
    errors.push('ADMIN_EMAIL must not use the default admin address');
  }
  if (env.ADMIN_EMAIL && !env.ADMIN_EMAIL.includes('@')) {
    errors.push('ADMIN_EMAIL must be a valid email address');
  }
  if (env.ADMIN_PASSWORD && DEFAULT_ADMIN_PASSWORDS.includes(env.ADMIN_PASSWORD.trim())) {
    errors.push('ADMIN_PASSWORD must not use a known default value');
  }
  if (env.ADMIN_PASSWORD && env.ADMIN_PASSWORD.trim().length < 12) {
    errors.push('ADMIN_PASSWORD must be at least 12 characters in production');
  }
  if (env.DATABASE_URL && DEFAULT_DATABASE_URLS.includes(env.DATABASE_URL.trim())) {
    errors.push('DATABASE_URL must not use the local default database credentials');
  }
  if (env.POSTGRES_PASSWORD && env.POSTGRES_PASSWORD.trim() === 'jobtap') {
    errors.push('POSTGRES_PASSWORD must not use the local default password in production');
  }
  if (env.TYPEORM_SYNCHRONIZE?.trim().toLowerCase() === 'true') {
    errors.push('TYPEORM_SYNCHRONIZE must not be true in production');
  }
  if (env.PORT && !isPositiveInteger(env.PORT)) {
    errors.push('PORT must be a positive integer');
  }
  if (
    env.ANALYTICS_RATE_LIMIT_PER_MINUTE &&
    !isPositiveInteger(env.ANALYTICS_RATE_LIMIT_PER_MINUTE)
  ) {
    errors.push('ANALYTICS_RATE_LIMIT_PER_MINUTE must be a positive integer');
  }
  if (env.ADMIN_FRONTEND_ORIGINS && !hasOnlyHttpOrigins(env.ADMIN_FRONTEND_ORIGINS)) {
    errors.push('ADMIN_FRONTEND_ORIGINS must be a comma-separated list of http(s) origins');
  }

  if (errors.length > 0) {
    throw new Error(`Production environment validation failed: ${errors.join('; ')}`);
  }
}

export function requiredProductionEnvKeys(): string[] {
  return [...REQUIRED_PRODUCTION_ENV];
}

function isPositiveInteger(value: string): boolean {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0;
}

function hasOnlyHttpOrigins(value: string): boolean {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .every((origin) => {
      try {
        const url = new URL(origin);
        return ['http:', 'https:'].includes(url.protocol) && url.origin === origin;
      } catch {
        return false;
      }
    });
}
