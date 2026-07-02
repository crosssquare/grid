export interface EnvConfig {
  databaseUrl: string;
  redisUrl: string;
  ageVerificationMode: "stub" | "vendor";
  paymentsMode: "stub" | "vendor";
}

export function validateEnv(): EnvConfig {
  const databaseUrl = process.env.DATABASE_URL;
  const redisUrl = process.env.REDIS_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }
  if (!redisUrl) {
    throw new Error("REDIS_URL is required");
  }

  return {
    databaseUrl,
    redisUrl,
    ageVerificationMode: (process.env.AGE_VERIFICATION_MODE as "stub" | "vendor") ?? "stub",
    paymentsMode: (process.env.PAYMENTS_MODE as "stub" | "vendor") ?? "stub"
  };
}
