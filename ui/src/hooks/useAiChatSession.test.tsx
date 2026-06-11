import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { listPontiChatConversations, pontiAssistantChatStream } from "@/api/aiClient";
import { useAiChatSession } from "./useAiChatSession";

vi.mock("@/api/aiClient", () => ({
  getPontiChatConversation: vi.fn(),
  listPontiChatConversations: vi.fn(),
  pontiAssistantChatStream: vi.fn(),
}));

const mockedStream = vi.mocked(pontiAssistantChatStream);
const mockedList = vi.mocked(listPontiChatConversations);

const headers = { projectId: "1" };
const workspace = {};

describe("useAiChatSession.sendDetached", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedList.mockResolvedValue({ items: [] });
  });

  it("si el stream cierra sin done/error libera loading y reporta el corte", async () => {
    mockedStream.mockImplementation(async (_payload, _headers, onEvent) => {
      onEvent({ event: "text", data: { content: "Hola" } });
      // El stream termina "limpio", sin evento done ni error.
    });

    const { result } = renderHook(() => useAiChatSession({ headers, workspace }));

    await act(async () => {
      await result.current.sendDetached("revisar stock");
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.streamDraft).toBeNull();
    expect(result.current.error).toBe("La respuesta del asistente se cortó antes de terminar.");
  });

  it("si el stream rechaza libera loading y expone el error", async () => {
    mockedStream.mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() => useAiChatSession({ headers, workspace }));

    await act(async () => {
      await result.current.sendDetached("revisar stock");
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.streamDraft).toBeNull();
    expect(result.current.error).toBe("boom");
  });

  it("con evento done agrega la respuesta y libera loading", async () => {
    mockedStream.mockImplementation(async (_payload, _headers, onEvent) => {
      onEvent({ event: "done", data: { chat_id: "c1", reply: "Listo" } });
    });

    const { result } = renderHook(() => useAiChatSession({ headers, workspace }));

    await act(async () => {
      await result.current.sendDetached("revisar stock");
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe("");
    expect(result.current.activeId).toBe("c1");
    expect(result.current.messages).toEqual([
      { role: "user", content: "revisar stock" },
      expect.objectContaining({ role: "assistant", content: "Listo" }),
    ]);
  });
});

describe("useAiChatSession.sendConfirmedActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedList.mockResolvedValue({ items: [] });
  });

  it("envía un turno con message vacío y confirmed_actions", async () => {
    mockedStream.mockImplementation(async (_payload, _headers, onEvent) => {
      onEvent({ event: "done", data: { chat_id: "c1", reply: "Acción ejecutada" } });
    });

    const { result } = renderHook(() => useAiChatSession({ headers, workspace }));

    let ok = false;
    await act(async () => {
      ok = await result.current.sendConfirmedActions(["act-1"]);
    });

    expect(ok).toBe(true);
    expect(mockedStream).toHaveBeenCalledWith(
      expect.objectContaining({ message: "", confirmed_actions: ["act-1"] }),
      headers,
      expect.any(Function),
      expect.anything()
    );
    expect(result.current.messages).toEqual([
      expect.objectContaining({ role: "assistant", content: "Acción ejecutada" }),
    ]);
  });

  it("devuelve false si el stream falla y expone el error", async () => {
    mockedStream.mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() => useAiChatSession({ headers, workspace }));

    let ok = true;
    await act(async () => {
      ok = await result.current.sendConfirmedActions(["act-1"]);
    });

    expect(ok).toBe(false);
    expect(result.current.error).toBe("boom");
    expect(result.current.loading).toBe(false);
  });

  it("ignora ids vacíos sin disparar el stream", async () => {
    const { result } = renderHook(() => useAiChatSession({ headers, workspace }));

    let ok = true;
    await act(async () => {
      ok = await result.current.sendConfirmedActions(["  "]);
    });

    expect(ok).toBe(false);
    expect(mockedStream).not.toHaveBeenCalled();
  });
});
