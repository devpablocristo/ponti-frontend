import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SmartEntityInput } from "./SmartEntityInput";

describe("SmartEntityInput", () => {
  it("formats stored canonical names for display", () => {
    render(
      <SmartEntityInput
        label="Cliente / Sociedad"
        name="customer"
        value="el sueño"
        options={[]}
        entityLabel="Cliente"
        onChange={vi.fn()}
        onSelectExisting={vi.fn()}
      />
    );

    expect(screen.getByLabelText("Cliente / Sociedad")).toHaveValue("El Sueño");
  });

  it("keeps catalog codes untouched when display formatting is disabled", () => {
    render(
      <SmartEntityInput
        label="Campaña"
        name="campaign"
        value="2025-2026"
        options={[]}
        entityLabel="Campaña"
        onChange={vi.fn()}
        onSelectExisting={vi.fn()}
        formatDisplayValue={false}
      />
    );

    expect(screen.getByLabelText("Campaña")).toHaveValue("2025-2026");
  });

  it("formats dropdown options without changing the selected option payload", () => {
    const onSelectExisting = vi.fn();

    render(
      <SmartEntityInput
        label="Cliente"
        name="customer"
        value=""
        options={[{ id: 7, name: "soalen srl 2" }]}
        entityLabel="Cliente"
        onChange={vi.fn()}
        onSelectExisting={onSelectExisting}
      />
    );

    fireEvent.focus(screen.getByLabelText("Cliente"));
    fireEvent.click(screen.getByText("Soalen SRL 2"));

    expect(onSelectExisting).toHaveBeenCalledWith({ id: 7, name: "soalen srl 2" });
  });

  it("keeps dropdown catalog codes untouched when display formatting is disabled", () => {
    render(
      <SmartEntityInput
        label="Campaña"
        name="campaign"
        value=""
        options={[{ id: 1, name: "2025-2026" }]}
        entityLabel="Campaña"
        onChange={vi.fn()}
        onSelectExisting={vi.fn()}
        formatDisplayValue={false}
      />
    );

    fireEvent.focus(screen.getByLabelText("Campaña"));

    expect(screen.getByText("2025-2026")).toBeInTheDocument();
  });

  it("renders dropdown above drawers", () => {
    render(
      <SmartEntityInput
        label="Proyecto"
        name="project"
        value="Jujuy Mealla Acheral"
        options={[{ id: 10, name: "Jujuy Mealla Acheral" }]}
        entityLabel="Proyecto"
        onChange={vi.fn()}
        onSelectExisting={vi.fn()}
        selectionOnly
      />
    );

    fireEvent.focus(screen.getByLabelText("Proyecto"));

    expect(screen.getByTestId("project-smart-entity-dropdown")).toHaveStyle({
      zIndex: "1025",
    });
  });

  it("still sends typed text to onChange", () => {
    const onChange = vi.fn();

    render(
      <SmartEntityInput
        label="Proyecto"
        name="project"
        value="metan"
        options={[]}
        entityLabel="Proyecto"
        onChange={onChange}
        onSelectExisting={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText("Proyecto"), {
      target: { value: "Metan Norte" },
    });

    expect(onChange).toHaveBeenCalledWith("Metan Norte");
  });

  it("does not commit typed text in selection-only mode", () => {
    const onChange = vi.fn();
    const onSelectExisting = vi.fn();

    render(
      <SmartEntityInput
        label="Cliente"
        name="customer"
        value="soalen"
        options={[{ id: 7, name: "soalen srl" }]}
        entityLabel="Cliente"
        onChange={onChange}
        onSelectExisting={onSelectExisting}
        selectionOnly
      />
    );

    fireEvent.focus(screen.getByLabelText("Cliente"));
    fireEvent.change(screen.getByLabelText("Cliente"), {
      target: { value: "soalen s" },
    });

    expect(screen.getByLabelText("Cliente")).toHaveValue("soalen s");
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("Soalen SRL"));

    expect(onSelectExisting).toHaveBeenCalledWith({ id: 7, name: "soalen srl" });
  });

  it("shows all options when a selection-only input is opened, then narrows while typing", () => {
    render(
      <SmartEntityInput
        label="Cliente"
        name="customer"
        value="Agro Lajitas"
        options={[
          { id: 1, name: "Agro Lajitas" },
          { id: 2, name: "Olega SA" },
        ]}
        entityLabel="Cliente"
        onChange={vi.fn()}
        onSelectExisting={vi.fn()}
        selectionOnly
      />
    );

    const input = screen.getByLabelText("Cliente");
    fireEvent.focus(input);

    expect(input).toHaveValue("");
    expect(screen.getByText("Agro Lajitas")).toBeInTheDocument();
    expect(screen.getByText("Olega SA")).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "ole" } });

    expect(screen.queryByText("Agro Lajitas")).not.toBeInTheDocument();
    expect(screen.getByText("Olega SA")).toBeInTheDocument();
  });
});
