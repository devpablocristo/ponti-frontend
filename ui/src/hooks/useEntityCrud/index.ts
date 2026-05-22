import { useCallback, useReducer, type Reducer } from "react";

/**
 * Hook factory genérico para entidades CRUDAR. Centraliza el patrón
 * duplicado en los 15 hooks existentes (useCustomers, useSupplies, etc):
 * loading state + error state + data array + métodos crud.
 *
 * NO obligatorio adoptarlo. Los hooks viejos siguen funcionando.
 * Cuando un hook nuevo se crea (Investor / Manager / Campaign / Customer)
 * o cuando alguno se refactoriza, debería usar esta forma.
 *
 * El consumidor pasa los "service calls" (funciones que pegan al apiClient)
 * y este hook se encarga del estado.
 */

export type CrudService<T, CreateInput = never, UpdateInput = never> = {
  list: (query?: string) => Promise<{ data: T[]; total: number }>;
  listArchived?: (query?: string) => Promise<{ data: T[]; total: number }>;
  get?: (id: number) => Promise<T>;
  create?: (input: CreateInput) => Promise<T>;
  update?: (id: number, input: UpdateInput) => Promise<T>;
  archive?: (id: number) => Promise<void>;
  restore?: (id: number) => Promise<void>;
  hardDelete?: (id: number) => Promise<void>;
};

type State<T> = {
  data: T[];
  archivedData: T[];
  total: number;
  archivedTotal: number;
  processing: boolean;
  error: string | null;
};

type Action<T> =
  | { type: "START" }
  | { type: "STOP" }
  | { type: "SET_DATA"; data: T[]; total: number }
  | { type: "SET_ARCHIVED"; data: T[]; total: number }
  | { type: "SET_ERROR"; error: string | null };

function reducer<T>(state: State<T>, action: Action<T>): State<T> {
  switch (action.type) {
    case "START":
      return { ...state, processing: true, error: null };
    case "STOP":
      return { ...state, processing: false };
    case "SET_DATA":
      return {
        ...state,
        data: Array.isArray(action.data) ? action.data : [],
        total: Number(action.total) || 0,
      };
    case "SET_ARCHIVED":
      return {
        ...state,
        archivedData: Array.isArray(action.data) ? action.data : [],
        archivedTotal: Number(action.total) || 0,
      };
    case "SET_ERROR":
      return { ...state, error: action.error };
    default:
      return state;
  }
}

const INITIAL_STATE: State<unknown> = {
  data: [],
  archivedData: [],
  total: 0,
  archivedTotal: 0,
  processing: false,
  error: null,
};

function extractMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Ocurrió un error inesperado.";
}

export function useEntityCrud<T, CreateInput = never, UpdateInput = never>(
  service: CrudService<T, CreateInput, UpdateInput>,
) {
  const [state, dispatch] = useReducer(
    reducer as Reducer<State<T>, Action<T>>,
    INITIAL_STATE as State<T>,
  );

  const wrap = useCallback(
    async <R,>(op: () => Promise<R>): Promise<R> => {
      dispatch({ type: "START" });
      try {
        const result = await op();
        dispatch({ type: "SET_ERROR", error: null });
        return result;
      } catch (err) {
        const msg = extractMessage(err);
        dispatch({ type: "SET_ERROR", error: msg });
        throw err;
      } finally {
        dispatch({ type: "STOP" });
      }
    },
    [],
  );

  const list = useCallback(
    async (query?: string) => {
      const { data, total } = await wrap(() => service.list(query));
      dispatch({ type: "SET_DATA", data, total });
      return data;
    },
    [service, wrap],
  );

  const listArchived = useCallback(
    async (query?: string) => {
      if (!service.listArchived) return [];
      const { data, total } = await wrap(() => service.listArchived!(query));
      dispatch({ type: "SET_ARCHIVED", data, total });
      return data;
    },
    [service, wrap],
  );

  const get = useCallback(
    async (id: number) => {
      if (!service.get) throw new Error("get no soportado");
      return wrap(() => service.get!(id));
    },
    [service, wrap],
  );

  const create = useCallback(
    async (input: CreateInput) => {
      if (!service.create) throw new Error("create no soportado");
      return wrap(() => service.create!(input));
    },
    [service, wrap],
  );

  const update = useCallback(
    async (id: number, input: UpdateInput) => {
      if (!service.update) throw new Error("update no soportado");
      return wrap(() => service.update!(id, input));
    },
    [service, wrap],
  );

  const archive = useCallback(
    async (id: number) => {
      if (!service.archive) throw new Error("archive no soportado");
      await wrap(() => service.archive!(id));
    },
    [service, wrap],
  );

  const restore = useCallback(
    async (id: number) => {
      if (!service.restore) throw new Error("restore no soportado");
      await wrap(() => service.restore!(id));
    },
    [service, wrap],
  );

  const hardDelete = useCallback(
    async (id: number) => {
      if (!service.hardDelete) throw new Error("hardDelete no soportado");
      await wrap(() => service.hardDelete!(id));
    },
    [service, wrap],
  );

  const clearError = useCallback(
    () => dispatch({ type: "SET_ERROR", error: null }),
    [],
  );

  return {
    // estado
    data: state.data,
    archivedData: state.archivedData,
    total: state.total,
    archivedTotal: state.archivedTotal,
    processing: state.processing,
    error: state.error,
    // operaciones
    list,
    listArchived,
    get,
    create,
    update,
    archive,
    restore,
    hardDelete,
    // util
    clearError,
  };
}

