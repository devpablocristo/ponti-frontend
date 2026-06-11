import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import PendingConfirmationsPanel, {
  normalizePendingConfirmation,
} from "./PendingConfirmationsPanel";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockUseAiFeature = vi.fn();

vi.mock("@/hooks/useAiFeatures", () => ({
  useAiFeature: (name: string, defaultEnabled?: boolean) => mockUseAiFeature(name, defaultEnabled),
}));

const renderPanel = (props: Parameters<typeof PendingConfirmationsPanel>[0]) =>
  render(
    <MemoryRouter>
      <PendingConfirmationsPanel {...props} />
    </MemoryRouter>
  );

describe("PendingConfirmationsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAiFeature.mockReturnValue(true);
  });

  it("Confirmar envía el turno con el id de la acción confirmada", async () => {
    const onConfirm = vi.fn().mockResolvedValue(true);
    renderPanel({
      items: [{ id: "act-1", message: "Crear borrador de orden" }],
      onConfirm,
    });

    fireEvent.click(screen.getByRole("button", { name: /confirmar/i }));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith("act-1"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByText(/confirmada:/i)).toBeInTheDocument());
  });

  it("guard anti doble envío: dos clicks despachan un solo turno", async () => {
    let resolveConfirm: (value: boolean) => void = () => {};
    const onConfirm = vi.fn().mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          resolveConfirm = resolve;
        })
    );
    renderPanel({
      items: [{ id: "act-1", message: "Crear borrador de orden" }],
      onConfirm,
    });

    const button = screen.getByRole("button", { name: /confirmar/i });
    fireEvent.click(button);
    fireEvent.click(button);

    expect(onConfirm).toHaveBeenCalledTimes(1);
    resolveConfirm(true);
    await waitFor(() => expect(screen.getByText(/confirmada:/i)).toBeInTheDocument());
  });

  it("si el envío falla vuelve a idle y permite reintentar", async () => {
    const onConfirm = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    renderPanel({
      items: [{ id: "act-1", message: "Crear borrador de orden" }],
      onConfirm,
    });

    fireEvent.click(screen.getByRole("button", { name: /confirmar/i }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: /confirmar/i }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByText(/confirmada:/i)).toBeInTheDocument());
  });

  it("approval_required navega al inbox con el request_id de Nexus", () => {
    renderPanel({
      items: [
        {
          id: "act-9",
          message: "Conteo de stock",
          approval_required: true,
          nexus_request_id: "req-abc-123",
        },
      ],
      onConfirm: vi.fn(),
    });

    fireEvent.click(screen.getByRole("button", { name: /ver en aprobaciones/i }));

    expect(mockNavigate).toHaveBeenCalledWith("/admin/ai/approvals?request_id=req-abc-123");
  });

  it("Descartar marca la confirmación como descartada localmente", () => {
    const onConfirm = vi.fn();
    renderPanel({
      items: [{ id: "act-1", message: "Crear borrador de orden" }],
      onConfirm,
    });

    fireEvent.click(screen.getByRole("button", { name: /descartar/i }));

    expect(screen.getByText(/descartada:/i)).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("con el flag chat_confirmations apagado cae al render pasivo", () => {
    mockUseAiFeature.mockReturnValue(false);
    renderPanel({
      items: [{ id: "act-1", message: "Crear borrador de orden" }],
      onConfirm: vi.fn(),
    });

    expect(screen.getByText(/pendiente: crear borrador de orden/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /confirmar/i })).not.toBeInTheDocument();
  });
});

describe("normalizePendingConfirmation", () => {
  it("resuelve campos defensivamente (strings, records incompletos)", () => {
    expect(normalizePendingConfirmation("revisar stock").message).toBe("revisar stock");
    expect(normalizePendingConfirmation({}).message).toBe("Acción pendiente de confirmación");
    const normalized = normalizePendingConfirmation({
      action_id: "a-1",
      capability_id: "ponti.stock.count",
    });
    expect(normalized.id).toBe("a-1");
    expect(normalized.message).toBe("ponti.stock.count");
    expect(normalized.approvalRequired).toBe(false);
  });

  it("nexus_request_id implica aprobación requerida", () => {
    const normalized = normalizePendingConfirmation({
      id: "a-2",
      message: "x",
      nexus_request_id: "req-1",
    });
    expect(normalized.approvalRequired).toBe(true);
    expect(normalized.nexusRequestId).toBe("req-1");
  });
});
