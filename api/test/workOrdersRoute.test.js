const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildWorkOrderFilterRowsCacheKey,
  buildWorkOrderScopeParams,
  hasWorkOrderScope,
  parseWorkOrderScope,
} = require("../dist/utils/workOrdersRoute");

test("parseWorkOrderScope normaliza filtros generales y de ordenes", () => {
  assert.deepEqual(
    parseWorkOrderScope({
      customer_id: "17",
      project_id: "30",
      campaign_id: "2",
      field_id: "",
      supply_id: "549",
      is_digital: "true",
      status: "draft",
    }),
    {
      fieldId: 0,
      projectId: 30,
      customerId: 17,
      campaignId: 2,
      supplyId: 549,
      isDigital: "true",
      status: "draft",
    }
  );

  assert.deepEqual(parseWorkOrderScope({ project_id: "abc", field_id: "-1" }), {
    fieldId: 0,
    projectId: 0,
    customerId: 0,
    campaignId: 0,
    supplyId: 0,
    isDigital: undefined,
    status: undefined,
  });
});

test("buildWorkOrderScopeParams conserva el scope del proyecto seleccionado", () => {
  const params = buildWorkOrderScopeParams({
    fieldId: 0,
    projectId: 30,
    customerId: 17,
    campaignId: 2,
    supplyId: 549,
  });

  assert.equal(
    params.toString(),
    "project_id=30&customer_id=17&campaign_id=2&supply_id=549"
  );
});

test("buildWorkOrderScopeParams conserva proyecto y campo cuando ambos acotan el scope", () => {
  const params = buildWorkOrderScopeParams({
    fieldId: 39,
    projectId: 30,
    customerId: 17,
    campaignId: 2,
    supplyId: 0,
  });

  assert.equal(params.toString(), "project_id=30&customer_id=17&campaign_id=2&field_id=39");
});

test("scope y cache key de filter rows no mezclan proyectos", () => {
  const jujuy = "?project_id=30&customer_id=17&campaign_id=2";
  const laguna = "?project_id=31&customer_id=17&campaign_id=2";

  assert.equal(hasWorkOrderScope(parseWorkOrderScope({ project_id: "30" })), true);
  assert.equal(hasWorkOrderScope(parseWorkOrderScope({ customer_id: "17" })), true);
  assert.notEqual(
    buildWorkOrderFilterRowsCacheKey(jujuy),
    buildWorkOrderFilterRowsCacheKey(laguna)
  );
});
