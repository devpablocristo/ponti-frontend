import type { paths } from "@/generated/ponti-ai.openapi";

export type InsightsSummary =
  paths["/v1/insights/summary"]["get"]["responses"][200]["content"]["application/json"];
