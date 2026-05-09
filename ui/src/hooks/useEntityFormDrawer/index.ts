import { useCallback, useState } from "react";

import { toastSuccess } from "../../lib/toast";
import {
  getCreateSuccessCopy,
  getUpdateSuccessCopy,
} from "../../components/Modal/copy";

type UseEntityFormDrawerOptions<Input> = {
  /** Etiqueta singular formateada como aparece en el toast (ej: 'el inversor "Pérez SA"'). */
  buildSuccessLabel: (input: Input) => string;
  create: (input: Input) => Promise<unknown>;
  update: (id: number, input: Input) => Promise<unknown>;
  /** Mensaje genérico cuando la op falla y el error no expone .message. */
  fallbackErrorMessage: string;
  /** Callback opcional luego de save exitoso (refetch, etc). */
  onAfter?: () => void;
};

/**
 * Encapsula el estado típico de un drawer create/edit:
 *  - open / editing (item being edited o null)
 *  - submitError local
 *  - openCreate / openEdit / close handlers
 *  - handleSubmit que decide create vs update
 *
 * Reusable en cualquier página activa con `<EntityFormDrawer>`. Mantiene la
 * misma forma para que Investors/Managers/Customers compartan código.
 */
export function useEntityFormDrawer<T extends { id: number }, Input>({
  buildSuccessLabel,
  create,
  update,
  fallbackErrorMessage,
  onAfter,
}: UseEntityFormDrawerOptions<Input>) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const openCreate = useCallback(() => {
    setEditing(null);
    setSubmitError(null);
    setOpen(true);
  }, []);

  const openEdit = useCallback((item: T) => {
    setEditing(item);
    setSubmitError(null);
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setEditing(null);
    setSubmitError(null);
  }, []);

  const handleSubmit = useCallback(
    async (input: Input) => {
      setSubmitError(null);
      try {
        if (editing) {
          await update(editing.id, input);
          toastSuccess(getUpdateSuccessCopy(buildSuccessLabel(input)));
        } else {
          await create(input);
          toastSuccess(getCreateSuccessCopy(buildSuccessLabel(input)));
        }
        close();
        onAfter?.();
      } catch (err) {
        setSubmitError(
          err instanceof Error ? err.message : fallbackErrorMessage,
        );
      }
    },
    [buildSuccessLabel, close, create, editing, fallbackErrorMessage, onAfter, update],
  );

  return {
    open,
    editing,
    submitError,
    openCreate,
    openEdit,
    close,
    handleSubmit,
  };
}
