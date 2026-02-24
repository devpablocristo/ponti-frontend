const test = require("node:test");
const assert = require("node:assert/strict");
const { parsePartialPriceFlag } = require("../dist/utils/partialPrice");

test("parsePartialPriceFlag retorna true para representaciones verdaderas", () => {
  assert.equal(parsePartialPriceFlag(true), true);
  assert.equal(parsePartialPriceFlag(1), true);
  assert.equal(parsePartialPriceFlag("true"), true);
  assert.equal(parsePartialPriceFlag("TRUE"), true);
  assert.equal(parsePartialPriceFlag("si"), true);
  assert.equal(parsePartialPriceFlag("Sí"), true);
  assert.equal(parsePartialPriceFlag("parcial"), true);
  assert.equal(parsePartialPriceFlag("tentativo"), true);
});

test("parsePartialPriceFlag retorna false para representaciones falsas", () => {
  assert.equal(parsePartialPriceFlag(false), false);
  assert.equal(parsePartialPriceFlag(0), false);
  assert.equal(parsePartialPriceFlag("false"), false);
  assert.equal(parsePartialPriceFlag("FALSE"), false);
  assert.equal(parsePartialPriceFlag("0"), false);
  assert.equal(parsePartialPriceFlag("no"), false);
  assert.equal(parsePartialPriceFlag("final"), false);
  assert.equal(parsePartialPriceFlag(""), false);
  assert.equal(parsePartialPriceFlag(undefined), false);
  assert.equal(parsePartialPriceFlag(null), false);
  assert.equal(parsePartialPriceFlag("cualquier cosa"), false);
});
