import { describe, expect, it } from "vitest";

import { getHardDeleteCustomerMessage } from "./hardDeleteCopy";

describe("getHardDeleteCustomerMessage", () => {
  it("incluye advertencia de eliminación en cascada", () => {
    const message = getHardDeleteCustomerMessage("ACME");

    expect(message).toContain('cliente "ACME"');
    expect(message).toContain("elimina en cascada");
    expect(message).toContain("proyectos");
    expect(message).toContain("datos relacionados");
  });
});
