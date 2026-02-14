/**
 * Zod schemas para validar respuestas de la API.
 *
 * Uso:
 *   import { pageInfoSchema, paginatedResponseSchema } from "@/api/schemas";
 *   const parsed = paginatedResponseSchema(lotSchema).parse(data);
 *
 * Estos schemas se pueden usar opcionalmente para validar en runtime
 * las respuestas de la API y capturar desviaciones de contrato BE↔FE.
 */
import { z } from "zod";

// ── Shared schemas ──────────────────────────────────────────────────

export const pageInfoSchema = z.object({
  per_page: z.number(),
  page: z.number(),
  max_page: z.number(),
  total: z.number(),
});

export type PageInfo = z.infer<typeof pageInfoSchema>;

export const apiErrorSchema = z.object({
  type: z.string().optional(),
  code: z.number().optional(),
  message: z.string().optional(),
  details: z.string().optional(),
  context: z.record(z.unknown()).optional(),
});

export type ApiError = z.infer<typeof apiErrorSchema>;

/** Schema genérico para respuestas paginadas con `items` */
export function paginatedResponseSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    page_info: pageInfoSchema,
  });
}

/** Schema genérico para respuestas exitosas del BFF wrapper */
export function successResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    success: z.literal(true),
    message: z.string().optional(),
    data: dataSchema,
  });
}

// ── Entity schemas (ejemplos) ───────────────────────────────────────

export const listedProjectSchema = z.object({
  id: z.number(),
  name: z.string(),
});

export const listedCustomerSchema = z.object({
  id: z.number(),
  name: z.string(),
});

export const createResponseSchema = z.object({
  message: z.string(),
  id: z.number(),
});

export type CreateResponse = z.infer<typeof createResponseSchema>;
