import {
  createBrowserStorageNamespace
} from "./chunk-QC6SL3B2.js";
import "./chunk-DC5AMYBS.js";

// node_modules/@devpablocristo/core-authn/src/browser/storage.ts
function createBrowserTokenStorage(options) {
  const accessTokenKey = options.accessTokenKey ?? "access_token";
  const refreshTokenKey = options.refreshTokenKey ?? "refresh_token";
  const storage = createBrowserStorageNamespace({
    namespace: options.namespace,
    storage: options.storage,
    hostAware: options.hostAware,
    legacyKeys: options.legacyKeys ?? [accessTokenKey, refreshTokenKey]
  });
  return {
    key: storage.key,
    getAccessToken: () => storage.getString(accessTokenKey),
    getRefreshToken: () => storage.getString(refreshTokenKey),
    setAccessToken: (token) => storage.setString(accessTokenKey, token),
    setRefreshToken: (token) => storage.setString(refreshTokenKey, token),
    setTokens: (tokens) => {
      storage.setString(accessTokenKey, tokens.access_token);
      if (tokens.refresh_token) {
        storage.setString(refreshTokenKey, tokens.refresh_token);
      }
    },
    clear: storage.clear
  };
}
export {
  createBrowserTokenStorage
};
//# sourceMappingURL=@devpablocristo_core-authn_browser_storage.js.map
