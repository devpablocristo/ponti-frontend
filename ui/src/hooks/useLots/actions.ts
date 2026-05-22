export const SET_LOTS = Symbol("SET_LOTS");
export const SET_KPIS = Symbol("SET_KPIS");
export const SET_PAGE_INFO = Symbol("SET_PAGE_INFO");
export const SET_CROPS = Symbol("SET_CROPS");

export const SET_RESULT = Symbol("SET_RESULT");

// Optimistic update para edición inline de tons en celda de tabla.
// Aplica el nuevo valor al lote en `state.lots` ANTES de que el server responda.
// Si la mutation server falla, dispatchar de nuevo con el valor original (rollback).
export const SET_LOT_TONS = Symbol("SET_LOT_TONS");
