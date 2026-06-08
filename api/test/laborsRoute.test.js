const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildProjectLaborsResponse,
  extractProjectLaborsArray,
} = require("../dist/utils/laborsRoute");

const labor = {
  id: 119,
  name: "LIMPIEZA MANUAL",
  category_id: 11,
  price: "1.15",
  is_partial_price: false,
  contractor_name: "E.VEDOYA",
  category_name: "Otras Labores",
  is_pending: false,
};

test("extractProjectLaborsArray reads the Core catalog response shape", () => {
  assert.deepEqual(
    extractProjectLaborsArray({
      data: [labor],
      page_info: { page: 1, per_page: 100, max_page: 1, total: 1 },
    }),
    [labor]
  );
});

test("extractProjectLaborsArray keeps compatibility with direct array payloads", () => {
  assert.deepEqual(extractProjectLaborsArray([labor]), [labor]);
});

test("buildProjectLaborsResponse returns the Web BFF success envelope", () => {
  assert.deepEqual(buildProjectLaborsResponse({ data: [labor] }), {
    success: true,
    data: [labor],
  });
});
