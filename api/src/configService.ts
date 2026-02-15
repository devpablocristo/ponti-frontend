import dotenv from "dotenv";

dotenv.config();

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
  // Legacy only: while user administration is still migrating.
  public readonly baseLoginApi = process.env.BASE_LOGIN_API || "";
  public readonly baseManagerApi = requireEnv("BASE_MANAGER_API");
  public readonly apiKey = requireEnv("X_API_KEY");
  public readonly identityApiKey = process.env.IDENTITY_PLATFORM_API_KEY || "";
  public readonly identityProjectId =
    process.env.IDENTITY_PLATFORM_PROJECT_ID || "";
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
