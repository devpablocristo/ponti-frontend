/**
 * Barrel para tipos generados desde la spec OpenAPI del BE.
 *
 * Regenerar tipos cuando cambia un handler anotado en BE:
 *   yarn codegen
 *
 * Eso corre, en orden:
 *   1. swag init en BE (genera docs/openapi/swagger.yaml en Swagger 2.0)
 *   2. swagger2openapi → docs/openapi/openapi.yaml (OpenAPI 3.0)
 *   3. openapi-typescript → src/api/generated/types.ts
 *
 * Importar desde acá, no del archivo generado directo, para tener aliases
 * cortos y poder hacer migración progresiva.
 */
import type { components, paths } from "./types";

// --- Schemas (tipos de payload) ---

export type MeContext = components["schemas"]["internal_admin.MeContext"];
export type MeUser = components["schemas"]["internal_admin.MeUser"];
export type MeTenant = components["schemas"]["internal_admin.MeTenant"];

export type IntegrityCheck =
  components["schemas"]["github_com_devpablocristo_ponti-backend_internal_data-integrity_handler_dto.IntegrityCheckDTO"];
export type IntegrityReport =
  components["schemas"]["github_com_devpablocristo_ponti-backend_internal_data-integrity_handler_dto.IntegrityReportResponse"];

// --- Path-level helpers (request/response por endpoint) ---

/**
 * `Paths` expone todos los endpoints anotados. Útil para hooks tipados:
 *
 *   type MeContextResponse = Paths["/me/context"]["get"]["responses"]["200"]["content"]["application/json"];
 */
export type Paths = paths;

// Re-export raw para consumers avanzados que quieran usar el shape full.
export type { components, paths } from "./types";
