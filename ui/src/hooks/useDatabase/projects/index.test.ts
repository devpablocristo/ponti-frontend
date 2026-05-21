import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

vi.mock("@/api/client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import { apiClient } from "@/api/client";
import useProjects from "./index";
import type { Project } from "./types";

const mockedClient = apiClient as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

const sampleProject = {
  name: "JUJUY",
  customer: { id: 1, actor_id: 10, name: "AGRO LAJITAS" },
  campaign: { id: 2, name: "2025-2026" },
  managers: [],
  investors: [{ id: 0, actor_id: 30, name: "Inversor 1", percentage: 100 }],
  admin_cost_investors: [],
  admin_cost: 0,
  planned_cost: 0,
  fields: [],
} as unknown as Project;

afterEach(() => {
  vi.clearAllMocks();
});

describe("useProjects.saveProject", () => {
  it("dispatcha mensaje de éxito cuando el BE confirma", async () => {
    mockedClient.post.mockResolvedValueOnce({ success: true, data: sampleProject });
    const { result } = renderHook(() => useProjects());

    await act(async () => {
      await result.current.saveProject(sampleProject);
    });

    expect(mockedClient.post).toHaveBeenCalledWith("/projects", sampleProject);
    await waitFor(() =>
      expect(result.current.result).toBe(
        "Se ha creado un nuevo proyecto con éxito!",
      ),
    );
  });

  it("setea mensaje 409 específico al recibir conflict", async () => {
    mockedClient.post.mockRejectedValueOnce({
      response: { status: 409, data: { error: { details: "duplicate" } } },
    });
    const { result } = renderHook(() => useProjects());

    await act(async () => {
      await result.current.saveProject(sampleProject);
    });

    await waitFor(() =>
      expect(result.current.error).toBe(
        "Ya existe un proyecto con el mismo nombre y campaña.",
      ),
    );
  });
});

describe("useProjects.updateProject", () => {
  it("dispatcha mensaje de update OK", async () => {
    mockedClient.put.mockResolvedValueOnce({ success: true, data: sampleProject });
    const { result } = renderHook(() => useProjects());

    await act(async () => {
      await result.current.updateProject(42, sampleProject);
    });

    expect(mockedClient.put).toHaveBeenCalledWith("/projects/42", sampleProject);
    await waitFor(() =>
      expect(result.current.result).toBe("Proyecto editado con exito"),
    );
  });

  it("setea mensaje 404 cuando proyecto no existe", async () => {
    mockedClient.put.mockRejectedValueOnce({
      response: { status: 404, data: { error: { details: "not found" } } },
    });
    const { result } = renderHook(() => useProjects());

    await act(async () => {
      await result.current.updateProject(42, sampleProject);
    });

    await waitFor(() =>
      expect(result.current.error).toBe(
        "No se encontró el proyecto o no tiene la última versión disponible.",
      ),
    );
  });
});

describe("useProjects.deleteProject (archive)", () => {
  it("hace POST al endpoint de archive", async () => {
    mockedClient.post.mockResolvedValueOnce({ success: true });
    const { result } = renderHook(() => useProjects());

    await act(async () => {
      await result.current.deleteProject(99);
    });

    expect(mockedClient.post).toHaveBeenCalledWith("/projects/99/archive", {});
  });
});

describe("useProjects.restoreProject", () => {
  it("dispatcha mensaje OK al restaurar", async () => {
    mockedClient.post.mockResolvedValueOnce({ success: true });
    const { result } = renderHook(() => useProjects());

    await act(async () => {
      await result.current.restoreProject(99);
    });

    expect(mockedClient.post).toHaveBeenCalledWith("/projects/99/restore", {});
    await waitFor(() =>
      expect(result.current.result).toBe("Proyecto restaurado con éxito"),
    );
  });

  it("tira error si restore falla", async () => {
    mockedClient.post.mockRejectedValueOnce(new Error("boom"));
    const { result } = renderHook(() => useProjects());

    await expect(
      act(async () => {
        await result.current.restoreProject(99);
      }),
    ).rejects.toThrow();
  });
});
