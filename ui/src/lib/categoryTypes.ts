// IDs canónicos de la tabla `types` del BE (seedeada en migrations).
// Usados para filtrar `/api/v1/categories?type_id=N` desde el FE.
//
// Conservar sincronizado con `categories.type_id` en la DB.
export const CATEGORY_TYPE_ID = {
  SEMILLA: 1,
  AGROQUIMICOS: 2,
  FERTILIZANTES: 3,
  LABORES: 4,
} as const;

export type CategoryTypeId = (typeof CATEGORY_TYPE_ID)[keyof typeof CATEGORY_TYPE_ID];

export const categoryTypeQuery = (typeId: CategoryTypeId) => `type_id=${typeId}`;
