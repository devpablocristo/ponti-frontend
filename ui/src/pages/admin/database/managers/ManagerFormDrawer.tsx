import { useEffect, useState } from "react";

import { EntityFormDrawer } from "../../../../components/crud/EntityFormDrawer";
import InputField from "../../../../components/Input/InputField";
import { Manager, ManagerPayloadInput } from "../../../../hooks/useManagers";

type ManagerFormDrawerProps = {
  open: boolean;
  manager: Manager | null;
  processing?: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (input: ManagerPayloadInput) => void | Promise<void>;
};

export default function ManagerFormDrawer({
  open,
  manager,
  processing = false,
  errorMessage,
  onClose,
  onSubmit,
}: ManagerFormDrawerProps) {
  const isEdit = manager !== null;
  const [name, setName] = useState("");
  const [validation, setValidation] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(manager?.name ?? "");
      setValidation(null);
    }
  }, [manager, open]);

  const handleSubmit = async () => {
    setValidation(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setValidation("El nombre es obligatorio.");
      return;
    }
    await onSubmit({ name: trimmed });
  };

  return (
    <EntityFormDrawer
      open={open}
      onClose={onClose}
      title={isEdit ? "Editar responsable" : "Nuevo responsable"}
      subtitle={isEdit ? manager?.name : undefined}
      processing={processing}
      errorMessage={validation ?? errorMessage ?? null}
      onSubmit={handleSubmit}
      submitLabel={isEdit ? "Guardar cambios" : "Crear responsable"}
    >
      <InputField
        label="Nombre"
        name="name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        size="sm"
      />
    </EntityFormDrawer>
  );
}
