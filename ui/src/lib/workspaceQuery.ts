type WorkspaceQueryValue = string | number | boolean | null | undefined;

export type WorkspaceQueryInput = {
  customerId?: WorkspaceQueryValue;
  projectId?: WorkspaceQueryValue;
  campaignId?: WorkspaceQueryValue;
  fieldId?: WorkspaceQueryValue;
  extra?: Record<string, WorkspaceQueryValue>;
};

function appendIfPresent(params: URLSearchParams, key: string, value: WorkspaceQueryValue) {
  if (value === null || value === undefined || value === "") return;
  if (typeof value === "number" && (!Number.isFinite(value) || value <= 0)) return;

  params.set(key, String(value));
}

export function buildWorkspaceQuery(input: WorkspaceQueryInput) {
  const params = new URLSearchParams();

  appendIfPresent(params, "customer_id", input.customerId);
  appendIfPresent(params, "project_id", input.projectId);
  appendIfPresent(params, "campaign_id", input.campaignId);
  appendIfPresent(params, "field_id", input.fieldId);

  Object.entries(input.extra ?? {}).forEach(([key, value]) => {
    appendIfPresent(params, key, value);
  });

  return params.toString();
}

export function withQuery(path: string, query: string) {
  return query ? `${path}?${query}` : path;
}
