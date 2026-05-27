import { describe, expect, it } from "vitest";

import { normalizeCropPayload } from "./types";

describe("normalizeCropPayload", () => {
  it("normalizes legacy array responses", () => {
    expect(
      normalizeCropPayload([
        { id: 1, name: "soja" },
        { id: 2, name: "trigo" },
      ]),
    ).toEqual({
      data: [
        { id: 1, name: "soja", archived_at: null, deleted_at: null },
        { id: 2, name: "trigo", archived_at: null, deleted_at: null },
      ],
      total: 2,
    });
  });

  it("normalizes paginated backend responses", () => {
    expect(
      normalizeCropPayload({
        data: [{ id: 7, name: "poroto mung" }],
        page_info: { total: 12 },
      }),
    ).toEqual({
      data: [{ id: 7, name: "poroto mung", archived_at: null, deleted_at: null }],
      total: 12,
    });
  });

  it("normalizes success envelopes without double-counting invalid rows", () => {
    expect(
      normalizeCropPayload({
        success: true,
        data: {
          items: [
            { id: 9, name: "maíz" },
            { id: 0, name: "" },
          ],
        },
      }),
    ).toEqual({
      data: [{ id: 9, name: "maíz", archived_at: null, deleted_at: null }],
      total: 1,
    });
  });
});
