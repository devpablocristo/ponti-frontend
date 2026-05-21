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
    "workspace_all_selection",
  ],
});

export const getAccessToken = (): string | null => {
  return authTokenStorage.getAccessToken();
};

export const getRefreshToken = (): string | null => {
  return authTokenStorage.getRefreshToken();
};

export const clearLocalStorage = () => {
  authTokenStorage.clear();
};

export const clearWorkspaceSelectionStorage = () => {
  [
    "customer",
    "project",
    "project_id",
    "campaign",
    "field",
    "workspace_all_selection",
  ].forEach((key) => {
    localStorage.removeItem(`ponti:${key}`);
    localStorage.removeItem(key);
    sessionStorage.removeItem(`ponti:${key}`);
    sessionStorage.removeItem(key);
  });
  window.dispatchEvent(new CustomEvent("ponti:workspace-selection-reset"));
};

export const setLocalStorage = (token: TokenPair) => {
  authTokenStorage.setTokens(token);
};
