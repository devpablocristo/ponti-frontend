import { describe, expect, it } from "vitest";

import type { Project } from "../../../../hooks/useDatabase/projects/types";
import {
  buildProjectPayloadForSave,
  type IdentityOption,
  normalizeNullableDecimal,
  parseProjectFieldErrorMessage,
  validateActorIdentity,
  validateCustomerIdentity,
  validateProjectForSave,
} from "./customerEditorValidation";

function baseProject(): Project {
  return {
    name: "JUJUY",
    customer: { id: 1, actor_id: 10, name: "AGRO LAJITAS 25-26" },
    campaign: { id: 2, name: "2025-2026" },
    managers: [{ id: 0, actor_id: 20, name: "Responsable 1" }],
    investors: [{ id: 0, actor_id: 30, name: "Inversor 1", percentage: 100 }],
    admin_cost_investors: [
      { id: 0, actor_id: 31, name: "Inversor costo", percentage: 100 },
    ],
    admin_cost: 1000,
    planned_cost: 2000,
    fields: [
      {
        id: 3,
        name: "CAMPO ALEGRE",
        lease_type_id: 4,
        lease_type_name: "ARriendo fijo",
        lease_type_percent: "",
        lease_type_value: "10.5",
        investors: [],
        lots: [
          {
            id: 5,
            name: "Lote 1",
            hectares: 290,
            previous_crop_id: 6,
            previous_crop_name: "Soja",
            current_crop_id: 7,
            current_crop_name: "Poroto Mung",
            season: "2025-2026",
          },
        ],
      },
    ],
    updated_at: undefined,
  };
}

describe("customerEditorValidation", () => {
  it("normaliza decimales nulos, vacios y strings numericos como el modulo anterior", () => {
    expect(normalizeNullableDecimal(null)).toEqual({ value: null });
    expect(normalizeNullableDecimal("   ")).toEqual({ value: null });
    expect(normalizeNullableDecimal("12.34")).toEqual({ value: 12.34 });
    expect(normalizeNullableDecimal("abc")).toEqual({
      value: null,
      error: "Debe ser numérico.",
    });
  });

  it("arma payload saneado y no envia arrendatarios placeholder", () => {
    const draft = baseProject();
    draft.fields[0].investors = [
      { id: 0, actor_id: null, name: "", percentage: 0 },
      { id: 0, actor_id: 44, name: " Arrendatario ", percentage: 100 },
    ];

    const result = buildProjectPayloadForSave(draft, { editing: false });

    expect(result.errors).toEqual([]);
    expect(result.project.fields[0].id).toBe(0);
    expect(result.project.fields[0].lots[0].id).toBe(0);
    expect(result.project.fields[0].lease_type_value).toBe(10.5);
    expect(result.project.fields[0].lease_type_percent).toBeNull();
    expect(result.project.fields[0].investors).toEqual([
      { id: 0, actor_id: 44, name: "Arrendatario", percentage: 100 },
    ]);
  });

  it("bloquea inversores de proyecto cuando la suma no da 100", () => {
    const draft = baseProject();
    draft.investors = [
      { id: 0, actor_id: 30, name: "Inversor 1", percentage: 60 },
      { id: 0, actor_id: 31, name: "Inversor 2", percentage: 30 },
    ];

    expect(validateProjectForSave(draft)).toContain(
      "Inversores: la suma de porcentajes debe ser 100% (hoy 90%)."
    );

    draft.investors[1].percentage = 40;
    expect(validateProjectForSave(draft)).not.toContain(
      "Inversores: la suma de porcentajes debe ser 100% (hoy 90%)."
    );
  });

  it("bloquea arrendatarios duplicados o con suma distinta a 100 por campo", () => {
    const draft = baseProject();
    draft.fields[0].investors = [
      { id: 0, actor_id: 44, name: "Arrendatario", percentage: 90 },
    ];

    expect(validateProjectForSave(draft)).toContain(
      "Arrendatarios del campo 1: la suma de porcentajes debe ser 100% (hoy 90%)."
    );

    draft.fields[0].investors = [
      { id: 0, actor_id: 44, name: "Arrendatario", percentage: 50 },
      { id: 0, actor_id: 44, name: "Arrendatario", percentage: 50 },
    ];
    expect(validateProjectForSave(draft)).toContain(
      "Arrendatarios del campo 1: no puede repetirse el mismo actor."
    );
  });

  it("bloquea campos, arriendo y lotes incompletos antes de persistir", () => {
    const draft = baseProject();
    draft.fields[0].name = "";
    draft.fields[0].lease_type_id = 0;
    draft.fields[0].lots[0].hectares = 0;
    draft.fields[0].lots[0].previous_crop_id = 0;
    draft.fields[0].lots[0].previous_crop_name = "";
    draft.fields[0].lots[0].season = "";

    expect(validateProjectForSave(draft)).toEqual(
      expect.arrayContaining([
        "Campo 1: ingresá un nombre.",
        "Campo 1: seleccioná un tipo de arriendo.",
        "Campo 1, lote 1: las hectáreas deben ser mayores a 0.",
        "Campo 1, lote 1: seleccioná o escribí el cultivo anterior.",
        "Campo 1, lote 1: seleccioná un período.",
      ])
    );
  });

  it("traduce errores backend por campo a un mensaje operativo", () => {
    expect(parseProjectFieldErrorMessage("fields[2].lease_type_percent bad")).toBe(
      "Campo 3: porcentaje de arriendo."
    );
  });
});

const customerOptions: IdentityOption[] = [
  { id: 201, name: "AGRO LAJITAS 25-26", customer_id: 17 },
  { id: 202, name: "EL SUEÑO 25-26", customer_id: 22 },
  { id: 203, name: "AGRO TUC", customer_id: 31 },
];

const managerOptions: IdentityOption[] = [
  { id: 101, name: "JUAN PEREZ" },
  { id: 102, name: "MARIA LOPEZ" },
];

describe("validateCustomerIdentity", () => {
  it("case 1: allows a brand-new customer with no assigned id", () => {
    expect(
      validateCustomerIdentity(
        { id: null, actor_id: null, name: "CLIENTE NUEVO" },
        customerOptions
      )
    ).toBeNull();
  });

  it("case 2: blocks a new customer whose name matches an existing one", () => {
    const err = validateCustomerIdentity(
      { id: null, actor_id: null, name: "AGRO LAJITAS 25-26" },
      customerOptions
    );
    expect(err).toContain("Ya existe");
    expect(err).toContain("AGRO LAJITAS");
  });

  it("case 3: permits the assigned customer to keep its name", () => {
    expect(
      validateCustomerIdentity(
        { id: 17, actor_id: 201, name: "AGRO LAJITAS 25-26" },
        customerOptions
      )
    ).toBeNull();
  });

  it("case 3: permits renaming the assigned customer to a name nobody owns", () => {
    expect(
      validateCustomerIdentity(
        { id: 17, actor_id: 201, name: "AGRO LAJITAS LIMPIO" },
        customerOptions
      )
    ).toBeNull();
  });

  it("treats case/accent variations of the assigned name as the same identity", () => {
    expect(
      validateCustomerIdentity(
        { id: 17, actor_id: 201, name: "agro lajitas 25-26" },
        customerOptions
      )
    ).toBeNull();
  });

  it("trusts an established customer slot even when the typed name belongs to another customer (BE handles the rename / link)", () => {
    expect(
      validateCustomerIdentity(
        { id: 17, actor_id: 201, name: "AGRO TUC" },
        customerOptions
      )
    ).toBeNull();
  });

  it("case 4: permits swapping to a different existing customer", () => {
    expect(
      validateCustomerIdentity(
        { id: 31, actor_id: 203, name: "AGRO TUC" },
        customerOptions
      )
    ).toBeNull();
  });

  it("ignores empty input", () => {
    expect(
      validateCustomerIdentity(
        { id: null, actor_id: null, name: "   " },
        customerOptions
      )
    ).toBeNull();
  });
});

describe("validateActorIdentity", () => {
  it("case 5: allows a brand-new manager with no assigned actor_id", () => {
    expect(
      validateActorIdentity(
        "Responsables",
        { id: 0, actor_id: null, name: "MANAGER NUEVO" },
        managerOptions
      )
    ).toBeNull();
  });

  it("case 6: permits the assigned actor to keep its name", () => {
    expect(
      validateActorIdentity(
        "Responsables",
        { id: 5, actor_id: 101, name: "JUAN PEREZ" },
        managerOptions
      )
    ).toBeNull();
  });

  it("case 6: permits renaming the assigned actor to a name nobody owns", () => {
    expect(
      validateActorIdentity(
        "Responsables",
        { id: 5, actor_id: 101, name: "JUAN PEREZ JR" },
        managerOptions
      )
    ).toBeNull();
  });

  it("trusts an established legacy slot even when the typed name belongs to another actor (BE handles the rename / link)", () => {
    expect(
      validateActorIdentity(
        "Responsables",
        { id: 5, actor_id: 101, name: "MARIA LOPEZ" },
        managerOptions
      )
    ).toBeNull();
  });

  it("trusts a legacy slot whose actor_id is null because the actor sync never ran", () => {
    // Repro of the SOALEN SRL inversor bug: investor has a legacy id but
    // no actor_id in the GET payload because legacy_actor_map has no row.
    // The dropdown lists SOALEN SRL with another role (e.g. cliente). The
    // editor must not block the save.
    expect(
      validateActorIdentity(
        "Inversores",
        { id: 600, actor_id: null, name: "SOALEN SRL" },
        [{ id: 999, name: "SOALEN SRL" }]
      )
    ).toBeNull();
  });

  it("blocks a new manager whose typed name matches another actor", () => {
    const err = validateActorIdentity(
      "Inversores",
      { id: 0, actor_id: null, name: "JUAN PEREZ" },
      managerOptions
    );
    expect(err).toContain("Inversores");
  });

  it("case 7: permits swapping to a different existing actor", () => {
    expect(
      validateActorIdentity(
        "Responsables",
        { id: 0, actor_id: 102, name: "MARIA LOPEZ" },
        managerOptions
      )
    ).toBeNull();
  });
});
