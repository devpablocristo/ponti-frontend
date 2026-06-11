const test = require("node:test");
const assert = require("node:assert/strict");

// configService instancia la clase al importar; garantizamos los env requeridos.
process.env.BASE_MANAGER_API = process.env.BASE_MANAGER_API || "http://localhost:9999";
process.env.X_API_KEY = process.env.X_API_KEY || "test-key";

const { positiveMsEnv } = require("../dist/configService");

test("positiveMsEnv devuelve el fallback ante ausencia, NaN o <= 0", () => {
  assert.equal(positiveMsEnv(undefined, 60000), 60000);
  assert.equal(positiveMsEnv("", 60000), 60000);
  assert.equal(positiveMsEnv("abc", 60000), 60000);
  assert.equal(positiveMsEnv("NaN", 60000), 60000);
  assert.equal(positiveMsEnv("0", 60000), 60000);
  assert.equal(positiveMsEnv("-5000", 60000), 60000);
});

test("positiveMsEnv acepta números positivos", () => {
  assert.equal(positiveMsEnv("30000", 60000), 30000);
  assert.equal(positiveMsEnv("1", 60000), 1);
});
