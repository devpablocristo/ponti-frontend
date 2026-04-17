// node_modules/@devpablocristo/core-browser/src/storage.ts
function resolveStorage(custom) {
  if (custom) {
    return custom;
  }
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage;
}
function resolvePrefix(namespace, hostAware) {
  const cleanNamespace = namespace.trim();
  if (!hostAware || typeof window === "undefined") {
    return `${cleanNamespace}:`;
  }
  return `${cleanNamespace}:${window.location.host}:`;
}
function createBrowserStorageNamespace(options) {
  const storage = resolveStorage(options.storage);
  const hostAware = options.hostAware ?? true;
  const legacyKeys = options.legacyKeys ?? [];
  function prefix() {
    return resolvePrefix(options.namespace, hostAware);
  }
  function key(name) {
    return `${prefix()}${name}`;
  }
  function getString(name) {
    return (storage == null ? void 0 : storage.getItem(key(name))) ?? null;
  }
  function setString(name, value) {
    storage == null ? void 0 : storage.setItem(key(name), value);
  }
  function remove(name) {
    storage == null ? void 0 : storage.removeItem(key(name));
  }
  function getJSON(name) {
    const raw = getString(name);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  function setJSON(name, value) {
    if (value === null || value === void 0) {
      remove(name);
      return;
    }
    setString(name, JSON.stringify(value));
  }
  function clear() {
    if (!storage) {
      return;
    }
    legacyKeys.forEach((legacyKey) => storage.removeItem(legacyKey));
    const prefixValue = prefix();
    const toRemove = [];
    for (let index = 0; index < storage.length; index += 1) {
      const itemKey = storage.key(index);
      if (itemKey && itemKey.startsWith(prefixValue)) {
        toRemove.push(itemKey);
      }
    }
    toRemove.forEach((itemKey) => storage.removeItem(itemKey));
  }
  return {
    key,
    getString,
    setString,
    remove,
    getJSON,
    setJSON,
    clear
  };
}

export {
  createBrowserStorageNamespace
};
//# sourceMappingURL=chunk-QC6SL3B2.js.map
