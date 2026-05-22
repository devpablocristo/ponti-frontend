import { ActorKind, ActorRole } from "../../../../hooks/useActors";

export const ACTOR_KIND_OPTIONS: Array<{ value: ActorKind; label: string }> = [
  { value: "unknown", label: "Sin definir" },
  { value: "natural_person", label: "Persona" },
  { value: "organization", label: "Empresa / Sociedad" },
  { value: "other", label: "Otro" },
];

export const ACTOR_ROLE_OPTIONS: Array<{ value: ActorRole; label: string }> = [
  { value: "cliente", label: "Cliente" },
  { value: "responsable", label: "Responsable" },
  { value: "inversor", label: "Inversor" },
  { value: "arrendatario", label: "Arrendatario" },
  { value: "proveedor", label: "Proveedor" },
  { value: "contratista", label: "Contratista" },
  { value: "facturador", label: "Facturador" },
];
