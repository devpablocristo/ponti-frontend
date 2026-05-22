// Punto único de entrada al catálogo de copy.
//
// Convención: el resto de la app importa desde `@/copy` (o paths relativos
// a este index), no directamente desde subarchivos. Esto facilita refactors
// y eventualmente migrar a i18n real reemplazando solo este archivo.

export * from "./entities";
export * from "./actions";
export * from "./feedback";
export * from "./http";
export * from "./notifications";
export { validation } from "./validation";
