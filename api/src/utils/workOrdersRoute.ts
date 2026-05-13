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

export const hasWorkOrderScope = (scope: WorkOrderQueryScope) =>
  scope.customerId > 0 ||
  scope.campaignId > 0 ||
  scope.projectId > 0 ||
  scope.fieldId > 0;

export const buildWorkOrderScopeParams = (scope: WorkOrderQueryScope) => {
  const params = new URLSearchParams();

  if (scope.projectId > 0) {
    params.set("project_id", String(scope.projectId));
  }

  if (scope.customerId > 0) {
    params.set("customer_id", String(scope.customerId));
  }

  if (scope.campaignId > 0) {
    params.set("campaign_id", String(scope.campaignId));
  }

  if (scope.fieldId > 0) {
    params.set("field_id", String(scope.fieldId));
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

export const buildWorkOrderFilterRowsCacheKey = (query: string) =>
  `workorders:filter-rows:${query}`;
