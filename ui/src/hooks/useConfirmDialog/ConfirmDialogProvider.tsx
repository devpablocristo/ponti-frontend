import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { ConfirmModal } from "../../components/crud/ConfirmModal";
import {
  ConfirmDialogContext,
  type ConfirmFn,
  type ConfirmOptions,
} from "./context";

type DialogState =
  | { open: false }
  | {
      open: true;
      opts: ConfirmOptions;
      resolve: (value: boolean) => void;
    };

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
