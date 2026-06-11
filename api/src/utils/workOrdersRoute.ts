type WorkOrderScopeQuery = {
  field_id?: unknown;
  project_id?: unknown;
  customer_id?: unknown;
  campaign_id?: unknown;
  supply_id?: unknown;
  is_digital?: unknown;
  status?: unknown;
};

export type WorkOrderQueryScope = {
  fieldId: number;
  projectId: number;
  customerId: number;
  campaignId: number;
  supplyId: number;
  isDigital?: string;
  status?: string;
};

export const parsePositiveInt = (value: unknown) => {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

export const parseWorkOrderScope = (
  query: WorkOrderScopeQuery
): WorkOrderQueryScope => ({
  fieldId: parsePositiveInt(query.field_id),
  projectId: parsePositiveInt(query.project_id),
  customerId: parsePositiveInt(query.customer_id),
  campaignId: parsePositiveInt(query.campaign_id),
  supplyId: parsePositiveInt(query.supply_id),
  isDigital:
    typeof query.is_digital === "string" && query.is_digital !== ""
      ? query.is_digital
      : undefined,
  status:
    typeof query.status === "string" && query.status !== ""
      ? query.status
      : undefined,
});

// El backend exige cliente + proyecto + campaña (campo opcional = todos los campos).
// El guard debe espejar ese contrato: si no, una request con solo project/field pasa
// el chequeo del BFF y el core la rechaza con un 400 crudo en inglés.
export const hasWorkOrderScope = (scope: WorkOrderQueryScope) =>
  scope.customerId > 0 && scope.projectId > 0 && scope.campaignId > 0;

export const buildWorkOrderScopeParams = (scope: WorkOrderQueryScope) => {
  const params = new URLSearchParams();

  // project_id es obligatorio para el backend; field_id lo acota a un campo
  // (ausente = todos los campos del proyecto). Se envían juntos, no excluyentes.
  if (scope.projectId > 0) {
    params.set("project_id", String(scope.projectId));
  }

  if (scope.fieldId > 0) {
    params.set("field_id", String(scope.fieldId));
  }

  if (scope.customerId > 0) {
    params.set("customer_id", String(scope.customerId));
  }

  if (scope.campaignId > 0) {
    params.set("campaign_id", String(scope.campaignId));
  }

  if (scope.supplyId > 0) {
    params.set("supply_id", String(scope.supplyId));
  }

  if (scope.isDigital) {
    params.set("is_digital", scope.isDigital);
  }

  if (scope.status) {
    params.set("status", scope.status);
  }

  return params;
};
