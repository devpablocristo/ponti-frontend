import dotenv from "dotenv";

dotenv.config();

class ConfigService {
<<<<<<< HEAD
  public readonly baseLoginApi = process.env.BASE_LOGIN_API as string;
  public readonly baseManagerApi = process.env.BASE_MANAGER_API as string;
  public readonly apiKey = process.env.X_API_KEY as string;
=======
  // Legacy only: while user administration is still migrating.
  public readonly baseLoginApi = process.env.BASE_LOGIN_API || "";
  public readonly baseManagerApi = requireEnv("BASE_MANAGER_API");
  public readonly apiKey = requireEnv("X_API_KEY");
  public readonly identityApiKey = requireEnv("IDENTITY_PLATFORM_API_KEY");
  public readonly identityProjectId = requireEnv("IDENTITY_PLATFORM_PROJECT_ID");
>>>>>>> da1c548 (done)
}

export const configService = new ConfigService();
