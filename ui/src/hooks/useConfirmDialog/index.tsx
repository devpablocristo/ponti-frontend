import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  ConfirmModal,
  type ConfirmSeverity,
} from "../../components/crud/ConfirmModal";

export type ConfirmOptions = {
  title: string;
  message?: string;
  severity?: ConfirmSeverity;
  primaryLabel?: string;
  secondaryLabel?: string;
  requireTypeToConfirm?: string;
  extraContent?: ReactNode;
};

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmDialogContext = createContext<ConfirmFn | null>(null);

type DialogState =
  | { open: false }
  | {
      open: true;
      opts: ConfirmOptions;
      resolve: (value: boolean) => void;
    };

/**
 * Provider del confirm dialog. Debe montarse una sola vez en el árbol (root).
 * Cualquier componente descendiente puede usar `useConfirmDialog()` para
 * pedir una confirmación await-able sin tener que manejar estado de modal.
 */
export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DialogState>({ open: false });
  const [isSaving, setIsSaving] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  const confirm = useCallback<ConfirmFn>((opts) => {
    return new Promise<boolean>((resolve) => {
      setState({ open: true, opts, resolve });
    });
  }, []);

  const handleClose = useCallback(() => {
    if (!state.open) return;
    state.resolve(false);
    setState({ open: false });
    setIsSaving(false);
  }, [state]);

  const handleConfirm = useCallback(() => {
    if (!state.open) return;
    setIsSaving(true);
    state.resolve(true);
    // El consumidor decide cuándo cerrar; cerramos en el siguiente tick
    // para evitar flicker mientras se resuelve la promesa.
    setTimeout(() => {
      setState({ open: false });
      setIsSaving(false);
    }, 0);
  }, [state]);

  const value = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmDialogContext.Provider value={value}>
      {children}
      <ConfirmModal
        isOpen={state.open}
        onClose={handleClose}
        onConfirm={handleConfirm}
        isSaving={isSaving}
        title={state.open ? state.opts.title : ""}
        message={state.open ? state.opts.message : undefined}
        severity={state.open ? state.opts.severity ?? "danger" : "danger"}
        primaryLabel={state.open ? state.opts.primaryLabel : undefined}
        secondaryLabel={state.open ? state.opts.secondaryLabel : undefined}
        requireTypeToConfirm={
          state.open ? state.opts.requireTypeToConfirm : undefined
        }
        extraContent={state.open ? state.opts.extraContent : undefined}
      />
    </ConfirmDialogContext.Provider>
  );
}

/**
 * Hook para pedir una confirmación await-able. Reemplaza completamente
 * `window.confirm` y los reimplementaciones inline de modal-state.
 *
 * Uso:
 *   const confirm = useConfirmDialog();
 *   const ok = await confirm({ title: "...", message: "...", severity: "danger" });
 *   if (!ok) return;
 */
export function useConfirmDialog(): ConfirmFn {
  const ctx = useContext(ConfirmDialogContext);
  if (!ctx) {
    throw new Error(
      "useConfirmDialog: <ConfirmDialogProvider> no está montado en el árbol.",
    );
  }
  return ctx;
}

export default useConfirmDialog;
