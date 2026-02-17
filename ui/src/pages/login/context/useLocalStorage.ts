import { TokenResponse } from "../types";

function prefix() {
  // Prevent DEV/STG tabs from overwriting each other's session.
  // Example key: ponti:stg---ponti-frontend-...a.run.app:access_token
  return `ponti:${window.location.host}:`;
}

function key(name: string) {
  return `${prefix()}${name}`;
}

export const getAccessToken = (): string | null => {
  return localStorage.getItem(key("access_token"));
};

export const setAccessToken = (token: string) => {
  localStorage.setItem(key("access_token"), token);
};

export const getRefreshToken = (): string | null => {
  return localStorage.getItem(key("refresh_token"));
};

export const clearLocalStorage = () => {
  // Clear only our app keys for this hostname and legacy keys (older builds).
  const legacyKeys = [
    "access_token",
    "refresh_token",
    "customer",
    "project",
    "project_id",
    "campaign",
    "field",
  ];
  for (const k of legacyKeys) localStorage.removeItem(k);

  const hostPrefix = prefix();
  const toRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(hostPrefix)) toRemove.push(k);
  }
  toRemove.forEach((k) => localStorage.removeItem(k));
};

export const setLocalStorage = (token: TokenResponse) => {
  localStorage.setItem(key("access_token"), token.access_token);
  localStorage.setItem(key("refresh_token"), token.refresh_token);
};
