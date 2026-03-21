import {
  createBrowserTokenStorage,
  type TokenPair,
} from "@devpablocristo/core-authn/browser/storage";

export const authTokenStorage = createBrowserTokenStorage({
  namespace: "ponti",
  legacyKeys: [
    "access_token",
    "refresh_token",
    "customer",
    "project",
    "project_id",
    "campaign",
    "field",
  ],
});

export const getAccessToken = (): string | null => {
  return authTokenStorage.getAccessToken();
};

export const setAccessToken = (token: string) => {
  authTokenStorage.setAccessToken(token);
};

export const setRefreshToken = (token: string) => {
  authTokenStorage.setRefreshToken(token);
};

export const getRefreshToken = (): string | null => {
  return authTokenStorage.getRefreshToken();
};

export const clearLocalStorage = () => {
  authTokenStorage.clear();
};

export const setLocalStorage = (token: TokenPair) => {
  authTokenStorage.setTokens(token);
};
