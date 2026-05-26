export type LotQueryIds = {
  customerId: number;
  fieldId: number;
  projectId: number;
  campaignId: number;
};

export type LotPagination = {
  page: number;
  perPage: number;
};

export const buildLotsQueryParams = (
  { customerId, campaignId, fieldId, projectId }: LotQueryIds,
  pagination?: LotPagination
) => {
  const queryParams = new URLSearchParams();
  if (projectId > 0) queryParams.set("project_id", String(projectId));
  if (customerId > 0) queryParams.set("customer_id", String(customerId));
  if (campaignId > 0) queryParams.set("campaign_id", String(campaignId));
  if (fieldId > 0) queryParams.set("field_id", String(fieldId));
  if (pagination) {
    queryParams.set("page", String(pagination.page));
    queryParams.set("per_page", String(pagination.perPage));
  }
  return queryParams.toString();
};

export const buildLotsListCacheKey = (
  { customerId, campaignId, fieldId, projectId }: LotQueryIds,
  { page, perPage }: LotPagination
) =>
  `lots:customer:${customerId}:campaign:${campaignId}:project:${projectId}:field:${fieldId}:page:${page}:per_page:${perPage}`;

export const buildLotsMetricsCacheKey = ({
  customerId,
  campaignId,
  fieldId,
  projectId,
}: LotQueryIds) =>
  `kpis:lots:customer:${customerId}:campaign:${campaignId}:project:${projectId}:field:${fieldId}`;

export const isLotsCacheKey = (key: string) =>
  key.startsWith("lots:") || key.startsWith("kpis:lots:");
