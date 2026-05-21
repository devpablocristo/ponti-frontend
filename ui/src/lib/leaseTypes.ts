// IDs canónicos de la tabla `lease_types` del BE.
// Conservar sincronizado con el seeding de migraciones.
export const LEASE_TYPE_ID = {
  PERCENT_INGRESO_NETO: 1,
  PERCENT_UTILIDAD: 2,
  ARRIENDO_FIJO: 3,
  ARRIENDO_FIJO_MAS_PERCENT_INGRESO: 4,
} as const;

export type LeaseTypeId = (typeof LEASE_TYPE_ID)[keyof typeof LEASE_TYPE_ID];

// Helpers para los condicionales de UI.
export const leaseTypeHasPercent = (id?: number): boolean =>
  id === LEASE_TYPE_ID.PERCENT_INGRESO_NETO ||
  id === LEASE_TYPE_ID.PERCENT_UTILIDAD ||
  id === LEASE_TYPE_ID.ARRIENDO_FIJO_MAS_PERCENT_INGRESO;

export const leaseTypeHasFixedValue = (id?: number): boolean =>
  id === LEASE_TYPE_ID.ARRIENDO_FIJO ||
  id === LEASE_TYPE_ID.ARRIENDO_FIJO_MAS_PERCENT_INGRESO;
