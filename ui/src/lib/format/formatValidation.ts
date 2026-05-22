// Helper para mensajes de validación de formularios.
//
// El caller pasa el rótulo del campo (con artículo y mayúscula: "El nombre",
// "La fecha"). Esto evita que formatValidation tenga que conocer el género
// de cada campo individual y mantiene la flexibilidad del catálogo.

import { validation } from "@/copy";

export type ValidationKind =
  | "required"
  | "invalidFormat"
  | "invalidEmail"
  | "invalidCuit"
  | "invalidDate"
  | "futureDate"
  | "pastDate"
  | "greaterThanZero"
  | "greaterOrEqualZero"
  | "duplicateInList"
  | "missingRequiredFields"
  | "itemsIncomplete";

export type ValidationOptions = {
  /** Para "lessOrEqual" / "minLength" / "maxLength" / "percentageSum". */
  bound?: number;
  /** Marca explícita: si el campo es femenino, requiredFem cambia "obligatorio" → "obligatoria". */
  feminine?: boolean;
};

/**
 * `field` debe venir capitalizado y con artículo: "El nombre", "La fecha",
 * "El email". La función concatena el motivo según `kind`.
 *
 * Ejemplos:
 *   formatValidation("El nombre", "required") → "El nombre es obligatorio."
 *   formatValidation("La fecha", "required", { feminine: true }) → "La fecha es obligatoria."
 *   formatValidation("El email", "invalidEmail") → "El email no tiene un formato válido."
 */
export function formatValidation(
  field: string,
  kind: ValidationKind,
  opts: ValidationOptions = {},
): string {
  switch (kind) {
    case "required":
      return opts.feminine ? validation.requiredFem(field) : validation.required(field);
    case "invalidFormat":
      return validation.invalidFormat(field);
    case "invalidEmail":
      return validation.invalidEmail();
    case "invalidCuit":
      return validation.invalidCuit();
    case "invalidDate":
      return validation.invalidDate();
    case "futureDate":
      return validation.futureDateNotAllowed(field);
    case "pastDate":
      return validation.pastDateNotAllowed(field);
    case "greaterThanZero":
      return validation.numberGreaterThanZero(field);
    case "greaterOrEqualZero":
      return validation.numberGreaterOrEqualZero(field);
    case "duplicateInList":
      return validation.duplicateInList(field);
    case "missingRequiredFields":
      return validation.missingRequiredFields();
    case "itemsIncomplete":
      return validation.itemsIncomplete();
  }
}
