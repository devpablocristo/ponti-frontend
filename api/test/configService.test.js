const test = require("node:test");
const assert = require("node:assert/strict");

function loadConfigWith(env) {
  const previous = { ...process.env };
  Object.assign(process.env, {
    BASE_MANAGER_API: "http://backend.local",
    X_API_KEY: "test-key",
    ...env,
  });
  delete require.cache[require.resolve("../dist/configService")];
  const loaded = require("../dist/configService");
  for (const key of Object.keys(process.env)) {
    if (!(key in previous)) {
      delete process.env[key];
    }
  }
  Object.assign(process.env, previous);
  return loaded.configService;
}

test("LOCAL_DEV_AUTH is ignored outside local/test environments", () => {
  const config = loadConfigWith({
    APP_ENV: "production",
    LOCAL_DEV_AUTH: "1",
  });
  assert.equal(config.allowLocalDevAuth(), false);
});

test("LOCAL_DEV_AUTH is allowed in local environments", () => {
  const config = loadConfigWith({
    APP_ENV: "local",
    LOCAL_DEV_AUTH: "1",
  });
  assert.equal(config.allowLocalDevAuth(), true);
});

test("BFF_REQUIRE_TENANT activa el guard de tenant explícito", () => {
  const config = loadConfigWith({
    BFF_REQUIRE_TENANT: "true",
  });
  assert.equal(config.bffRequireTenant, true);
});
