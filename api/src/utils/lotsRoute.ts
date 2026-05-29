export type LotQueryIds = {
  fieldId: number;
  projectId: number;
};

export type LotPagination = {
  page: number;
  perPage: number;
};

export const buildLotsQueryParams = (
  { fieldId, projectId }: LotQueryIds,
  pagination?: LotPagination
) => {
  const queryParams = new URLSearchParams();
  if (fieldId > 0) queryParams.set("field_id", String(fieldId));
  if (projectId > 0) queryParams.set("project_id", String(projectId));
  if (pagination) {
    queryParams.set("page", String(pagination.page));
    queryParams.set("per_page", String(pagination.perPage));
  }
  return queryParams.toString();
};

export const buildLotsListCacheKey = (
  { fieldId, projectId }: LotQueryIds,
  { page, perPage }: LotPagination
) =>
  `lots:field:${fieldId}:project:${projectId}:page:${page}:per_page:${perPage}`;

export const buildLotsMetricsCacheKey = ({ fieldId, projectId }: LotQueryIds) =>
  `kpis:lots:field:${fieldId}:project:${projectId}`;

export const isLotsCacheKey = (key: string) =>
  key.startsWith("lots:") || key.startsWith("kpis:lots:");
