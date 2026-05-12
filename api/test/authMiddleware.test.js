const test = require("node:test");
const assert = require("node:assert/strict");

const { decodeTokenPayload } = require("../dist/routes/authMiddleware");

function unsignedToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.`;
}

test("decodeTokenPayload returns payload only; verification is handled by middleware", () => {
  const token = unsignedToken({ sub: "user-1", exp: 4102444800 });
  assert.deepEqual(decodeTokenPayload(token), { sub: "user-1", exp: 4102444800 });
});

test("decodeTokenPayload rejects malformed tokens", () => {
  assert.equal(decodeTokenPayload("not-a-token"), null);
});
