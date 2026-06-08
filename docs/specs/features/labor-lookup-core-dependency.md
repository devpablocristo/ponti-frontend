# Labor Lookup Core Dependency

## Purpose

Document the Web dependency on the Core labor catalog endpoint used by legacy
and master-data labor flows.

## Contract

- Web BFF `GET /api/v1/projects/:id/labors` forwards to Core
  `GET /api/v1/projects/:project_id/labors`.
- The response must provide the editable labor catalog with real `id`, `name`,
  `category_id`, `price`, `is_partial_price`, `contractor_name`,
  `category_name`, and `is_pending`.
- Core migration `migrations_v4/000232_labor_pending_changes.up.sql` is a
  runtime prerequisite because the catalog query reads `labors.is_pending` and
  pending labors can have nullable `category_id`.
- `GET /api/v1/labors/group/:project_id` is a grouped work-order/history view
  and must not replace the catalog endpoint for forms, imports, or selectors.

## Affected Web Surfaces

- `/admin/database/tasks`
- `/admin/database/tasks/list`
- `/admin/work-orders` create/update labor selectors
- `ui/src/hooks/useLabors`
- `api/src/routes/projects.ts`

## Acceptance

- `GET /api/v1/projects/30/labors` returns `200` with catalog data.
- `/admin/database/tasks` does not render `failed to list labor`.
- Labor creation/import duplicate detection can compare against existing
  catalog rows.

## Validation Evidence 2026-06-08

- Active Core DB: `new_ponti_db_develop_local`.
- The proposed command targeting `new_ponti_db_dev` was evaluated and did not
  update the active local DB; the same migration was applied to the active DB
  and the migration ledger was aligned to `232`, `dirty=false`.
- Before migration `000232`, Web/Mobile labor lookup surfaced Core `500 failed
  to list labor`.
- After migration `000232`, Core `GET /api/v1/projects/30/labors` returned
  `200` with 19 catalog rows and `page_info`.
- Web validation: `api yarn test`, `api yarn build`, `ui yarn build`,
  `ui yarn test`, and `ui yarn test:e2e`.
