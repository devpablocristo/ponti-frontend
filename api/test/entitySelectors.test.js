const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildCoreAuthHeaders,
} = require("../dist/utils/entitySelectors");

test("buildCoreAuthHeaders reenvia tenant y authorization", () => {
  assert.deepEqual(
    buildCoreAuthHeaders(
      {
        headers: {
          "x-tenant-id": "tenant-a",
          authorization: "Bearer token",
        },
        user: { userID: "user-1" },
      },
      "api-key"
    ),
    {
      "X-API-KEY": "api-key",
      "X-User-Id": "user-1",
      "X-Tenant-Id": "tenant-a",
      Authorization: "Bearer token",
    }
  );

  assert.equal(buildCoreAuthHeaders({ headers: {} }, "api-key"), null);
});
