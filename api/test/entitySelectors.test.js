const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildCoreAuthHeaders,
  buildForwardQuery,
  flushEntitySelectorCaches,
  scopedCacheKey,
} = require("../dist/utils/entitySelectors");

test("buildForwardQuery mapea limit a per_page sin perder filtros", () => {
  assert.equal(
    buildForwardQuery(
      {
        limit: "1000",
        page: "2",
        status: "active",
        empty: "",
      },
      { limitAsPerPage: true }
    ),
    "per_page=1000&page=2&status=active"
  );

  assert.equal(
    buildForwardQuery(
      {
        limit: "1000",
        per_page: "50",
      },
      { limitAsPerPage: true }
    ),
    "limit=1000&per_page=50"
  );
});

test("scopedCacheKey separa tenant y usuario", () => {
  const query = "per_page=1000";
  assert.equal(
    scopedCacheKey("customers", {
      headers: { "x-tenant-id": "tenant-a" },
      user: { userID: "user-1" },
    }, query),
    "customers:tenant-a:per_page=1000"
  );
  assert.equal(
    scopedCacheKey("customers", {
      headers: {},
      user: { userID: "user-1" },
    }, query),
    "customers:user-1:per_page=1000"
  );
  assert.notEqual(
    scopedCacheKey("customers", {
      headers: { "x-tenant-id": "tenant-a" },
      user: { userID: "user-1" },
    }, query),
    scopedCacheKey("customers", {
      headers: { "x-tenant-id": "tenant-b" },
      user: { userID: "user-1" },
    }, query)
  );
});

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

test("flushEntitySelectorCaches elimina caches de selectores y conserva otros", () => {
  const keys = new Set([
    "customers:tenant-a:per_page=1000",
    "campaigns:tenant-a:customer_id=1",
    "form-options:tenant-a:",
    "workorders:query:project_id=30",
  ]);
  const cache = {
    keys: () => Array.from(keys),
    del: (input) => {
      const list = Array.isArray(input) ? input : [input];
      let removed = 0;
      for (const key of list) {
        if (keys.delete(key)) removed += 1;
      }
      return removed;
    },
  };

  flushEntitySelectorCaches(cache);

  assert.deepEqual(Array.from(keys), ["workorders:query:project_id=30"]);
});
