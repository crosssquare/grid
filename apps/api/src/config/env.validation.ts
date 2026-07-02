export interface EnvConfig {
  databaseUrl: string;
  redisUrl: string;
  ageVerificationMode: "stub" | "vendor";
  paymentsMode: "stub" | "vendor";
  jwtSecret: string;
  jwtRefreshSecret: string;
  s3Endpoint?: string;
  s3Region?: string;
  s3Bucket?: string;
  s3AccessKeyId?: string;
  s3SecretAccessKey?: string;
}

export function validateEnv(): EnvConfig {
  const databaseUrl = process.env.DATABASE_URL;
  const redisUrl = process.env.REDIS_URL;
  const jwtSecret = process.env.JWT_SECRET;
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }
  if (!redisUrl) {
    throw new Error("REDIS_URL is required");
  }
  if (!jwtSecret) {
    throw new Error("JWT_SECRET is required");
  }
  if (!jwtRefreshSecret) {
    throw new Error("JWT_REFRESH_SECRET is required");
  }

  return {
    databaseUrl,
    redisUrl,
    ageVerificationMode: (process.env.AGE_VERIFICATION_MODE as "stub" | "vendor") ?? "stub",
    paymentsMode: (process.env.PAYMENTS_MODE as "stub" | "vendor") ?? "stub",
    jwtSecret,
    jwtRefreshSecret,
    s3Endpoint: process.env.S3_ENDPOINT || undefined,
    s3Region: process.env.S3_REGION || undefined,
    s3Bucket: process.env.S3_BUCKET || undefined,
    s3AccessKeyId: process.env.S3_ACCESS_KEY_ID || undefined,
    s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY || undefined
  };
}
