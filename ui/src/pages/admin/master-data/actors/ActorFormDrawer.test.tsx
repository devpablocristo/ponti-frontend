import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { Actor } from "../../../../hooks/useActors";
import ActorFormDrawer from "./ActorFormDrawer";

const actors: Actor[] = [
  {
    id: 1,
    actor_kind: "organization",
    display_name: "Olega SA",
    roles: ["inversor"],
  },
  {
    id: 2,
    actor_kind: "natural_person",
    display_name: "Gero",
    roles: ["responsable"],
  },
  {
    id: 3,
    actor_kind: "organization",
    display_name: "Cliente Uno",
    roles: ["cliente"],
  },
  {
    id: 4,
    actor_kind: "organization",
    display_name: "agro lajitas srl",
    roles: ["cliente"],
  },
];

describe("ActorFormDrawer", () => {
  it("muestra primero el nombre y luego el resto del formulario", () => {
    render(
      <ActorFormDrawer
        open
        actor={null}
        actorOptions={actors}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    const labels = Array.from(document.querySelectorAll("label")).map((label) =>
      label.textContent?.trim(),
    );
    expect(labels[0]).toBe("Nombre");
    expect(labels[1]).toBe("Tipo");
  });

  it("muestra subtítulo e input nombre con reglas de visualización", () => {
    render(
      <ActorFormDrawer
        open
        actor={actors[3]}
        actorOptions={actors}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByText("Agro Lajitas SRL")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Nombre" })).toHaveValue("Agro Lajitas SRL");
    expect(screen.queryByText("agro lajitas srl")).not.toBeInTheDocument();
  });

  it("usa la lista de actores mientras se tipea y bloquea nombres duplicados", () => {
    const onSubmit = vi.fn();
    render(
      <ActorFormDrawer
        open
        actor={null}
        actorOptions={actors}
        defaultRoles={["inversor"]}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    const nameInput = screen.getByRole("combobox", { name: "Nombre" });
    fireEvent.change(nameInput, { target: { value: "oleg" } });

    expect(screen.getByText("Olega SA")).toBeInTheDocument();

    fireEvent.change(nameInput, { target: { value: "Olega SA" } });
    expect(screen.getByText(/Ya existe un actor con ese nombre/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Crear actor" }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("no muestra todos los actores cuando no hay roles seleccionados", () => {
    render(
      <ActorFormDrawer
        open
        actor={null}
        actorOptions={actors}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    const nameInput = screen.getByRole("combobox", { name: "Nombre" });
    fireEvent.change(nameInput, { target: { value: "oleg" } });

    expect(screen.queryByText("Olega SA")).not.toBeInTheDocument();
  });

  it("limita las sugerencias por el rol seleccionado", () => {
    render(
      <ActorFormDrawer
        open
        actor={null}
        actorOptions={actors}
        defaultRoles={["cliente"]}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    const nameInput = screen.getByRole("combobox", { name: "Nombre" });
    fireEvent.change(nameInput, { target: { value: "o" } });

    expect(screen.getByText("Cliente Uno")).toBeInTheDocument();
    expect(screen.queryByText("Olega SA")).not.toBeInTheDocument();
    expect(screen.queryByText("Gero")).not.toBeInTheDocument();
  });

  it("bloquea duplicados globales aunque no coincidan con el rol seleccionado", () => {
    const onSubmit = vi.fn();
    render(
      <ActorFormDrawer
        open
        actor={null}
        actorOptions={actors}
        defaultRoles={["cliente"]}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    const nameInput = screen.getByRole("combobox", { name: "Nombre" });
    fireEvent.change(nameInput, { target: { value: "Olega SA" } });

    expect(screen.queryByText("Olega SA")).not.toBeInTheDocument();
    expect(screen.getByText(/Ya existe un actor con ese nombre/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Crear actor" }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("permite guardar el actor editado con su propio nombre", () => {
    const onSubmit = vi.fn();
    render(
      <ActorFormDrawer
        open
        actor={actors[0]}
        actorOptions={actors}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ display_name: "Olega SA" }),
    );
  });
});
