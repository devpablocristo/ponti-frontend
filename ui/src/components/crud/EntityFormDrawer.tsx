import { ReactNode } from "react";

import Button from "../Button/Button";
import Drawer from "../Drawer/Drawer";
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
  /** Ancho máximo del drawer. Default "max-w-xl". */
  maxWidth?: string;
  children: ReactNode;
};

/**
 * Drawer estándar para formularios de Create/Edit. Encapsula el patrón duplicado
 * en LotDrawer / CreateItem / CreateOrder / UpdateOrder / CreateStockItem:
 * Drawer + header + body scrollable + banners contextuales + footer Cancel/Save.
 *
 * Reusa el `<Drawer>` local (components/Drawer/Drawer.tsx) y los banners/overlay
 * extraídos en components/feedback/. NO inventa estructura nueva.
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
  maxWidth = "max-w-xl",
  children,
}: EntityFormDrawerProps) {
  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (processing) return;
    void onSubmit();
  };

  return (
    <Drawer open={open} onClose={onClose} maxWidth={maxWidth}>
      <div className="flex h-full flex-col">
        <header className="mb-4">
          <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
          {subtitle && (
            <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
          )}
        </header>

        <LoadingOverlay show={processing} />

        <form className="flex-1 space-y-4" onSubmit={handleSubmit}>
          {errorMessage && (
            <ErrorBanner message={errorMessage} onDismiss={onDismissError} />
          )}
          {successMessage && (
            <SuccessBanner message={successMessage} onDismiss={onDismissSuccess} />
          )}
          {children}
        </form>

        <footer className="mt-auto flex items-center justify-between gap-2 bg-white pt-6">
          <div className="flex items-center gap-2">{extraActions}</div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              className="text-base font-medium"
              onClick={onClose}
              disabled={processing}
            >
              {cancelLabel}
            </Button>
            <Button
              variant="primary"
              className="text-base font-medium"
              onClick={() => handleSubmit()}
              disabled={processing}
            >
              {submitLabel}
            </Button>
          </div>
        </footer>
      </div>
    </Drawer>
  );
}
