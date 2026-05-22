import { afterEach, describe, expect, it, vi } from "vitest";

const customMock = vi.fn();
const dismissMock = vi.fn();

vi.mock("sonner", () => ({
  toast: {
    custom: (...args: unknown[]) => {
      customMock(...args);
      return 1;
    },
    dismiss: (...args: unknown[]) => dismissMock(...args),
  },
}));

import { notify } from "./notify";
import { NOTIFICATION_DURATION } from "../copy/notifications";

afterEach(() => {
  customMock.mockClear();
  dismissMock.mockClear();
});

describe("notify duration by severity", () => {
  it("success usa 3500ms", () => {
    notify.success("ok");
    expect(customMock).toHaveBeenCalledTimes(1);
    expect(customMock.mock.calls[0][1]).toEqual({ duration: NOTIFICATION_DURATION.success });
    expect(NOTIFICATION_DURATION.success).toBe(3500);
  });

  it("info usa 4000ms", () => {
    notify.info("info");
    expect(customMock.mock.calls[0][1]).toEqual({ duration: NOTIFICATION_DURATION.info });
    expect(NOTIFICATION_DURATION.info).toBe(4000);
  });

  it("warning usa 6000ms (más persistente que info)", () => {
    notify.warning("careful");
    expect(customMock.mock.calls[0][1]).toEqual({ duration: NOTIFICATION_DURATION.warning });
    expect(NOTIFICATION_DURATION.warning).toBe(6000);
  });

  it("error usa 8000ms (el más persistente)", () => {
    notify.error("boom");
    expect(customMock.mock.calls[0][1]).toEqual({ duration: NOTIFICATION_DURATION.error });
    expect(NOTIFICATION_DURATION.error).toBe(8000);
  });

  it("permite override de duración por caller", () => {
    notify.error("sticky", { duration: Infinity });
    expect(customMock.mock.calls[0][1]).toEqual({ duration: Infinity });
  });

  it("error persiste más que success (regla de UX)", () => {
    expect(NOTIFICATION_DURATION.error).toBeGreaterThan(NOTIFICATION_DURATION.success);
    expect(NOTIFICATION_DURATION.error).toBeGreaterThan(NOTIFICATION_DURATION.info);
    expect(NOTIFICATION_DURATION.warning).toBeGreaterThan(NOTIFICATION_DURATION.info);
  });
});
