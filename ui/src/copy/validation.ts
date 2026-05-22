// Mensajes de validación reutilizables.
//
// Los formularios reciben un `field` (rótulo del campo en español, ya
// capitalizado) y la función arma el mensaje completo siguiendo la guía:
// "El {campo} {motivo}." — sujeto + verbo claro + acción.

export const validation = {
  required: (field: string): string => `${field} es obligatorio.`,
  requiredFem: (field: string): string => `${field} es obligatoria.`,
  invalidFormat: (field: string): string => `${field} no tiene un formato válido.`,
  invalidEmail: (): string => "El email no tiene un formato válido.",
  invalidCuit: (): string => "El CUIT no tiene un formato válido (debe ser 11 dígitos sin guiones).",
  invalidDate: (): string => "La fecha ingresada no es válida.",
  futureDateNotAllowed: (field = "La fecha"): string =>
    `${field} no puede ser futura.`,
  pastDateNotAllowed: (field = "La fecha"): string =>
    `${field} no puede ser anterior a hoy.`,
  numberGreaterThanZero: (field: string): string =>
    `${field} debe ser mayor que 0.`,
  numberGreaterOrEqualZero: (field: string): string =>
    `${field} debe ser mayor o igual a 0.`,
  numberLessOrEqual: (field: string, max: number): string =>
    `${field} no puede ser mayor que ${max}.`,
  percentageSum: (target = 100): string =>
    `Los porcentajes deben sumar exactamente ${target}%.`,
  duplicateInList: (field: string): string =>
    `${field} ya está en la lista.`,
  minLength: (field: string, min: number): string =>
    `${field} debe tener al menos ${min} caracteres.`,
  maxLength: (field: string, max: number): string =>
    `${field} no puede tener más de ${max} caracteres.`,
  missingRequiredFields: (): string =>
    "Faltan completar campos obligatorios.",
  itemsIncomplete: (): string =>
    "No se completaron todos los campos de los items cargados.",
};
