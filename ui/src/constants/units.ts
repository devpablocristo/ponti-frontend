export const units = [
  { id: 1, name: "Lt" },
  { id: 2, name: "Kg" },
  { id: 3, name: "Bolsas" },
];

export const getUnitName = (unitId?: number): string =>
  units.find((u) => u.id === unitId)?.name || "";
