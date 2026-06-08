export function extractProjectLaborsArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const directData = (payload as { data?: unknown }).data;
  if (Array.isArray(directData)) {
    return directData;
  }

  if (directData && typeof directData === "object") {
    const nestedData = (directData as { data?: unknown }).data;
    if (Array.isArray(nestedData)) {
      return nestedData;
    }
  }

  return [];
}

export function buildProjectLaborsResponse(payload: unknown) {
  return {
    success: true,
    data: extractProjectLaborsArray(payload),
  };
}
