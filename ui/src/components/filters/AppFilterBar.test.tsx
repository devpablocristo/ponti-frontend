import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppFilterBar } from "./AppFilterBar";

describe("AppFilterBar", () => {
  it("shows displayName in suggestions while selecting the original option", () => {
    const onChange = vi.fn();
    const setData = vi.fn();

    render(
      <AppFilterBar
        filters={[
          {
            type: "search",
            name: "cliente",
            label: "Cliente",
            options: [{ id: 17, name: "el sueño", displayName: "El Sueño" }],
            value: "",
            onChange,
            setData,
          },
        ]}
      />
    );

    fireEvent.focus(screen.getByLabelText("Cliente"));
    fireEvent.click(screen.getByText("El Sueño"));

    expect(onChange).toHaveBeenCalledWith("El Sueño");
    expect(setData).toHaveBeenCalledWith({
      id: 17,
      name: "el sueño",
      displayName: "El Sueño",
    });
  });
});
