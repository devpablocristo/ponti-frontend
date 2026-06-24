import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { getAiApproval, listAiApprovals } from "@/api/aiClient";
import type { NexusApprovalItem } from "@/types/aiChat";
import AIApprovals from "./AIApprovals";

vi.mock("@/api/aiClient", () => ({
  approveAiApproval: vi.fn(),
  getAiApproval: vi.fn(),
  getAiApprovalEvidence: vi.fn(),
  listAiApprovals: vi.fn(),
  rejectAiApproval: vi.fn(),
}));

vi.mock("@/hooks/useAiFeatures", () => ({
  useAiFeature: () => true,
}));

vi.mock("@/pages/login/context/useSelection", () => ({
  useSelection: () => ({ projectId: 1 }),
}));

vi.mock("@/pages/login/context/useAuth", () => ({
  useAuth: () => ({ user: { sub: "approver-1", exp: 0 } }),
}));

const mockedList = vi.mocked(listAiApprovals);
const mockedGet = vi.mocked(getAiApproval);

const approvalItem = (overrides: Partial<NexusApprovalItem>): NexusApprovalItem => ({
  request_id: "req-1",
  action_type: "ponti.workorders.create_draft",
  status: "pending_approval",
  risk_level: "medium",
  requested_by: "user:otro-usuario",
  reason: "Crear borrador",
  created_at: "2026-06-10T12:00:00Z",
  decisions: [],
  ...overrides,
});

const renderApprovals = (initialEntry: string) =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AIApprovals />
    </MemoryRouter>
  );

describe("AIApprovals deep-link ?request_id=", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("auto-selecciona el item indicado en la query", async () => {
    mockedList.mockResolvedValue({
      items: [
        approvalItem({ request_id: "req-1", reason: "Primer pedido" }),
        approvalItem({ request_id: "req-2", reason: "Segundo pedido" }),
      ],
    });

    renderApprovals("/admin/ai/approvals?request_id=req-2");

    // El detalle (heading) muestra el item de la query, no el primero de la lista.
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Segundo pedido" })).toBeInTheDocument()
    );
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it("si el item no está en la página lo trae por id y lo selecciona", async () => {
    mockedList.mockResolvedValue({
      items: [approvalItem({ request_id: "req-1", reason: "Primer pedido" })],
    });
    mockedGet.mockResolvedValue(
      approvalItem({ request_id: "req-99", reason: "Pedido externo" })
    );

    renderApprovals("/admin/ai/approvals?request_id=req-99");

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Pedido externo" })).toBeInTheDocument()
    );
    expect(mockedGet).toHaveBeenCalledWith("req-99", { projectId: "1" });
  });

  it("sin query selecciona el primero por defecto", async () => {
    mockedList.mockResolvedValue({
      items: [
        approvalItem({ request_id: "req-1", reason: "Primer pedido" }),
        approvalItem({ request_id: "req-2", reason: "Segundo pedido" }),
      ],
    });

    renderApprovals("/admin/ai/approvals");

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Primer pedido" })).toBeInTheDocument()
    );
  });

  it("deshabilita Aprobar cuando la solicitud es del propio usuario (SoD)", async () => {
    mockedList.mockResolvedValue({
      items: [
        approvalItem({
          request_id: "req-1",
          reason: "Mi propio pedido",
          requested_by: "user:approver-1",
        }),
      ],
    });

    renderApprovals("/admin/ai/approvals");

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Mi propio pedido" })).toBeInTheDocument()
    );
    expect(screen.getByRole("button", { name: /aprobar$/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /rechazar/i })).toBeEnabled();
  });
});
