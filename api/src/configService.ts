import dotenv from "dotenv";

dotenv.config();

/** true, 1, yes, on (case-insensitive) — resto = false. */
function isTruthyEnvString(value: string | undefined): boolean {
  if (!value || value.trim() === "") {
    return false;
  }
  const v = value.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Please set it in your .env file or environment.`
    );
  }
  return value;
}

class ConfigService {
  public readonly baseManagerApi = requireEnv("BASE_MANAGER_API");
  public readonly apiKey = requireEnv("X_API_KEY");
  public readonly appEnv =
    process.env.APP_ENV || process.env.NODE_ENV || "local";
  public readonly identityApiKey = process.env.IDENTITY_PLATFORM_API_KEY || "";
  public readonly identityProjectId =
    process.env.IDENTITY_PLATFORM_PROJECT_ID || "";
  /** Errores genéricos del BFF incluyen detalle seguro en JSON (p. ej. proxy chat/stream). */
  public readonly bffVerboseErrors = isTruthyEnvString(
    process.env.BFF_VERBOSE_ERRORS
  );
  public readonly localDevAuth = isTruthyEnvString(process.env.LOCAL_DEV_AUTH);
  public readonly localDevUserId = process.env.LOCAL_DEV_USER_ID || "1";
  public readonly localDevPassword = process.env.LOCAL_DEV_PASSWORD || "";
  public readonly bffRequireTenant = isTruthyEnvString(
    process.env.BFF_REQUIRE_TENANT
  );

  public isLocalLikeEnv(): boolean {
    const env = this.appEnv.trim().toLowerCase();
    return (
      env === "" ||
      env === "local" ||
      env === "localhost" ||
      env === "dev" ||
      env === "development" ||
      env === "test" ||
      env === "testing"
    );
  }

  public allowLocalDevAuth(): boolean {
    return this.localDevAuth && this.isLocalLikeEnv();
  }
}

export const configService = new ConfigService();

// Default pagination
export const DEFAULT_PER_PAGE = 1000;
export const DEFAULT_SMALL_PER_PAGE = 100;

// Cache TTLs (in seconds)
export const CACHE_TTL_SHORT = 300; // 5 minutes
export const CACHE_TTL_DEFAULT = 1800; // 30 minutes

// Timeouts
export const API_TIMEOUT = 30000;
export const LONG_API_TIMEOUT = 60000;
