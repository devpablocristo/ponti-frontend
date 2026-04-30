const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildLotsListCacheKey,
  buildLotsMetricsCacheKey,
  buildLotsQueryParams,
  isLotsCacheKey,
} = require("../dist/utils/lotsRoute");
const {
  parseFieldProjectQueryParams,
  parsePaginationQueryParams,
} = require("../dist/utils/queryParams");

test("parseFieldProjectQueryParams normaliza ids inválidos a cero", () => {
  assert.deepEqual(
    parseFieldProjectQueryParams({
      field_id: "39",
      project_id: "30",
    }),
    { fieldId: 39, projectId: 30 }
  );

  assert.deepEqual(
    parseFieldProjectQueryParams({
      field_id: "-1",
      project_id: "abc",
    }),
    { fieldId: 0, projectId: 0 }
  );
});

test("parsePaginationQueryParams aplica defaults y límite máximo de per_page", () => {
  assert.deepEqual(parsePaginationQueryParams({}), {
    page: 1,
    perPage: 1000,
  });

  assert.deepEqual(
    parsePaginationQueryParams({ page: "2", per_page: "50" }),
    { page: 2, perPage: 50 }
  );

  assert.deepEqual(
    parsePaginationQueryParams({ page: "3", per_page: "999999" }),
    { page: 3, perPage: 1000 }
  );
});

test("buildLotsQueryParams conserva el contrato HTTP esperado", () => {
  assert.equal(
    buildLotsQueryParams(
      { fieldId: 39, projectId: 30 },
      { page: 2, perPage: 10 }
    ),
    "field_id=39&project_id=30&page=2&per_page=10"
  );

  assert.equal(buildLotsQueryParams({ fieldId: 0, projectId: 30 }), "project_id=30");
});

test("cache keys de Lotes no mezclan páginas ni contexto de métricas", () => {
  const lotIds = { fieldId: 39, projectId: 30 };

  assert.notEqual(
    buildLotsListCacheKey(lotIds, { page: 1, perPage: 10 }),
    buildLotsListCacheKey(lotIds, { page: 2, perPage: 10 })
  );

  assert.notEqual(
    buildLotsMetricsCacheKey({ fieldId: 39, projectId: 30 }),
    buildLotsMetricsCacheKey({ fieldId: 39, projectId: 31 })
  );

  assert.equal(isLotsCacheKey("lots:field:0:project:30:page:1:per_page:10"), true);
  assert.equal(isLotsCacheKey("kpis:lots:field:0:project:30"), true);
  assert.equal(isLotsCacheKey("workorders:query:project_id=30"), false);
});
