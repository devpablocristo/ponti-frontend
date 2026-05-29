type FieldProjectQuery = {
  field_id?: unknown;
  project_id?: unknown;
};

type PaginationQuery = {
  page?: unknown;
  per_page?: unknown;
};

export const parsePositiveIntParam = (value: unknown, fallback: number) => {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const parseFieldProjectQueryParams = (query: FieldProjectQuery) => ({
  fieldId: parsePositiveIntParam(query.field_id, 0),
  projectId: parsePositiveIntParam(query.project_id, 0),
});

export const parsePaginationQueryParams = (
  query: PaginationQuery,
  defaults = { page: 1, perPage: 1000 },
  maxPerPage = 1000
) => {
  const page = parsePositiveIntParam(query.page, defaults.page);
  const requestedPerPage = parsePositiveIntParam(
    query.per_page,
    defaults.perPage
  );

  return {
    page,
    perPage: Math.min(requestedPerPage, maxPerPage),
  };
};
