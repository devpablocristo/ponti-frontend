const test = require("node:test");
const assert = require("node:assert/strict");

const {
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

test("buildWorkOrderScopeParams envía proyecto y campo juntos", () => {
  const params = buildWorkOrderScopeParams({
    fieldId: 39,
    projectId: 30,
    customerId: 17,
    campaignId: 2,
    supplyId: 0,
  });

  assert.equal(
    params.toString(),
    "project_id=30&field_id=39&customer_id=17&campaign_id=2"
  );
});

test("hasWorkOrderScope exige cliente + proyecto + campaña (campo opcional)", () => {
  // Contrato del backend: customer_id + project_id + campaign_id obligatorios; field_id opcional.
  assert.equal(
    hasWorkOrderScope(
      parseWorkOrderScope({ customer_id: "17", project_id: "30", campaign_id: "2" })
    ),
    true
  );
  // El campo no es obligatorio: con los tres + campo sigue siendo válido.
  assert.equal(
    hasWorkOrderScope(
      parseWorkOrderScope({
        customer_id: "17",
        project_id: "30",
        campaign_id: "2",
        field_id: "39",
      })
    ),
    true
  );
  // Scopes incompletos que el backend rechazaría con 400 -> el guard también los corta.
  assert.equal(hasWorkOrderScope(parseWorkOrderScope({ project_id: "30" })), false);
  assert.equal(hasWorkOrderScope(parseWorkOrderScope({ field_id: "39" })), false);
  assert.equal(
    hasWorkOrderScope(parseWorkOrderScope({ customer_id: "17", project_id: "30" })),
    false
  );
});
