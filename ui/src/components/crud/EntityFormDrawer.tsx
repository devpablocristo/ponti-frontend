import { ReactNode } from "react";

import { DrawerFormActions } from "../Drawer/DrawerFormActions";
import { DrawerShell } from "../Drawer/DrawerShell";
import { ErrorBanner } from "../feedback/ErrorBanner";
import { LoadingOverlay } from "../feedback/LoadingOverlay";
import { SuccessBanner } from "../feedback/SuccessBanner";

type EntityFormDrawerProps = {
  open: boolean;
  onClose: () => void;
  /** Título mostrado en el header (ej: "Nuevo Inversor", "Editar Cliente"). */
  title: string;
  /** Subtítulo opcional debajo del title (ej: nombre del item editado, contexto). */
  subtitle?: string;
  /** Estado de submitting/loading. Bloquea botones y muestra overlay si processing=true. */
  processing?: boolean;
  /** Mensaje de error contextual al form. */
  errorMessage?: string | null;
  onDismissError?: () => void;
  /** Mensaje de éxito contextual al form (cuando no se quiere usar toast). */
  successMessage?: string | null;
  onDismissSuccess?: () => void;
  /** Submit del form (Guardar). */
  onSubmit: () => void | Promise<void>;
  /** Override del label del botón primario. Default: "Guardar". */
  submitLabel?: string;
  /** Override del label del botón secundario. Default: "Cancelar". */
  cancelLabel?: string;
  /** Acciones adicionales en el footer (ej: "Duplicar"). Se renderizan a la izquierda. */
  extraActions?: ReactNode;
  children: ReactNode;
};

/**
 * Drawer estándar para formularios de Create/Edit. Encapsula el patrón duplicado
 * en LotDrawer / CreateItem / CreateOrder / UpdateOrder / CreateStockItem:
 * Drawer + header + body scrollable + banners contextuales + footer Cancel/Save.
 */
export function EntityFormDrawer({
  open,
  onClose,
  title,
  subtitle,
  processing = false,
  errorMessage,
  onDismissError,
  successMessage,
  onDismissSuccess,
  onSubmit,
  submitLabel = "Guardar",
  cancelLabel = "Cancelar",
  extraActions,
  children,
}: EntityFormDrawerProps) {
  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (processing) return;
    void onSubmit();
  };

  return (
    <DrawerShell
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      footer={
        <DrawerFormActions
          cancelLabel={cancelLabel}
          submitLabel={submitLabel}
          onCancel={onClose}
          onSubmit={() => handleSubmit()}
          disabled={processing}
          extraActions={extraActions}
        />
      }
    >
      <LoadingOverlay show={processing} />
      <form className="drawer-form" onSubmit={handleSubmit}>
        {errorMessage && <ErrorBanner message={errorMessage} onDismiss={onDismissError} />}
        {successMessage && <SuccessBanner message={successMessage} onDismiss={onDismissSuccess} />}
        {children}
      </form>
    </DrawerShell>
  );
}
