import { X } from "lucide-react";
import { ReactNode, useEffect, useId } from "react";

import { IconActionButton } from "../Button/IconActionButton";

type DrawerShellProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  bodyClassName?: string;
  labelledBy?: string;
};

type DrawerHeaderProps = {
  title: string;
  subtitle?: ReactNode;
  titleId?: string;
};

type DrawerBodyProps = {
  children: ReactNode;
  className?: string;
};

type DrawerFooterProps = {
  children: ReactNode;
};

type DrawerSectionProps = {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

type DrawerCloseButtonProps = {
  onClose: () => void;
};

const openDrawerStack: string[] = [];

export function DrawerCloseButton({ onClose }: DrawerCloseButtonProps) {
  return (
    <IconActionButton
      label="Cerrar"
      icon={<X className="h-5 w-5" />}
      onClick={onClose}
      className="drawer-close-button"
    />
  );
}

export function DrawerHeader({ title, subtitle, titleId }: DrawerHeaderProps) {
  return (
    <header className="drawer-header">
      <h2 id={titleId} className="drawer-title">
        {title}
      </h2>
      {subtitle ? <div className="drawer-subtitle">{subtitle}</div> : null}
    </header>
  );
}

export function DrawerBody({ children, className = "" }: DrawerBodyProps) {
  return <div className={`drawer-body ${className}`.trim()}>{children}</div>;
}

export function DrawerFooter({ children }: DrawerFooterProps) {
  return <footer className="drawer-footer">{children}</footer>;
}

export function DrawerSection({ title, action, children, className = "" }: DrawerSectionProps) {
  return (
    <section className={`drawer-section ${className}`.trim()}>
      {title || action ? (
        <div className="drawer-section-header">
          {title ? <h3 className="drawer-section-title">{title}</h3> : <span />}
          {action}
        </div>
      ) : null}
      <div className="drawer-section-content">{children}</div>
    </section>
  );
}

export function DrawerShell({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  bodyClassName,
  labelledBy,
}: DrawerShellProps) {
  const generatedTitleId = useId();
  const titleId = labelledBy ?? generatedTitleId;

  useEffect(() => {
    if (!open) return undefined;

    openDrawerStack.push(titleId);

    return () => {
      const index = openDrawerStack.lastIndexOf(titleId);
      if (index >= 0) {
        openDrawerStack.splice(index, 1);
      }
    };
  }, [open, titleId]);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      const topDrawerId = openDrawerStack[openDrawerStack.length - 1];
      if (topDrawerId !== titleId) return;

      event.preventDefault();
      event.stopPropagation();
      onClose();
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [onClose, open, titleId]);

  if (!open) return null;

  return (
    <div className="drawer-root">
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer-panel" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <DrawerCloseButton onClose={onClose} />
        <DrawerHeader title={title} subtitle={subtitle} titleId={titleId} />
        <DrawerBody className={bodyClassName}>{children}</DrawerBody>
        {footer ? <DrawerFooter>{footer}</DrawerFooter> : null}
      </aside>
    </div>
  );
}
