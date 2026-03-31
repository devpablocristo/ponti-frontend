import type { components, paths } from "@/generated/ponti-ai.openapi";

type Schemas = components["schemas"];

export type CopilotMode = Schemas["ExplainInsightResponse"]["mode"];
export type PontiCopilotResponse =
  paths["/v1/copilot/insights/{insight_id}/explain"]["get"]["responses"][200]["content"]["application/json"];
export type PontiRoutedAgent = PontiCopilotResponse["routed_agent"];
export type PontiRoutingSource = PontiCopilotResponse["routing_source"];
export type PontiCopilotOutputKind = PontiCopilotResponse["output_kind"];
export type InsightItem = Schemas["InsightItem"];
export type PontiInsightListResponse =
  paths["/v1/insights/{entity_type}/{entity_id}"]["get"]["responses"][200]["content"]["application/json"];
export type InsightsSummary =
  paths["/v1/insights/summary"]["get"]["responses"][200]["content"]["application/json"];
export type ComputeInsightsResult =
  paths["/v1/insights/compute"]["post"]["responses"][200]["content"]["application/json"];
export type PontiInsightServiceKind = ComputeInsightsResult["service_kind"];
export type PontiSummaryOutputKind = InsightsSummary["output_kind"];
