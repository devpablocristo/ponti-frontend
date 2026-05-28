import type { PageInfo } from "@/api/types";

export type Crop = {
  id: number;
  name: string;
  archived_at?: string | null;
  deleted_at?: string | null;
};

export type CropPayloadInput = {
  name: string;
};

type CropListEnvelope = {
  data?: unknown;
  items?: unknown;
  total?: unknown;
  page_info?: Partial<PageInfo>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toCrop(value: unknown): Crop | null {
  if (!isRecord(value)) return null;
  const id = Number(value.id);
  const name = typeof value.name === "string" ? value.name : "";
  if (!Number.isFinite(id) || id <= 0 || !name.trim()) return null;
  return {
    id,
    name,
    archived_at: typeof value.archived_at === "string" ? value.archived_at : null,
    deleted_at: typeof value.deleted_at === "string" ? value.deleted_at : null,
  };
}

function unwrapSuccessEnvelope(payload: unknown): unknown {
  if (isRecord(payload) && typeof payload.success === "boolean" && "data" in payload) {
    return payload.data;
  }
  return payload;
}

export function normalizeCropPayload(payload: unknown): { data: Crop[]; total: number } {
  const body = unwrapSuccessEnvelope(payload);

  if (Array.isArray(body)) {
    const data = body.map(toCrop).filter((crop): crop is Crop => crop !== null);
    return { data, total: data.length };
  }

  if (!isRecord(body)) return { data: [], total: 0 };

  const envelope = body as CropListEnvelope;
  const rawRows = Array.isArray(envelope.data)
    ? envelope.data
    : Array.isArray(envelope.items)
      ? envelope.items
      : [];
  const data = rawRows.map(toCrop).filter((crop): crop is Crop => crop !== null);
  const pageTotal = Number(envelope.page_info?.total);
  const directTotal = Number(envelope.total);
  const total = Number.isFinite(directTotal)
    ? directTotal
    : Number.isFinite(pageTotal)
      ? pageTotal
      : data.length;

  return { data, total };
}

export function normalizeCropMutationResponse(
  payload: unknown,
  fallback: CropPayloadInput,
): Crop {
  const body = unwrapSuccessEnvelope(payload);
  if (typeof body === "number" || typeof body === "string") {
    return { id: Number(body) || 0, name: fallback.name };
  }
  return toCrop(body) ?? { id: 0, name: fallback.name };
}
