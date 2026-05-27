import { useEffect, useState } from "react";

import { EntityFormDrawer } from "../../../../components/crud/EntityFormDrawer";
import InputField from "../../../../components/Input/InputField";
import { formatProperName } from "../../../../lib/properName";
import type { Crop, CropPayloadInput } from "../../../../hooks/useCrops";

type CropFormDrawerProps = {
  open: boolean;
  crop: Crop | null;
  processing?: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (input: CropPayloadInput) => void | Promise<void>;
};

export default function CropFormDrawer({
  open,
  crop,
  processing = false,
  errorMessage,
  onClose,
  onSubmit,
}: CropFormDrawerProps) {
  const isEdit = crop !== null;
  const [name, setName] = useState("");
  const [validation, setValidation] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(crop?.name ?? "");
      setValidation(null);
    }
  }, [crop, open]);

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
      title={isEdit ? "Editar Cultivo" : "Nuevo Cultivo"}
      subtitle={isEdit ? formatProperName(crop?.name) : undefined}
      processing={processing}
      errorMessage={validation ?? errorMessage ?? null}
      onSubmit={handleSubmit}
      submitLabel={isEdit ? "Guardar Cambios" : "Crear Cultivo"}
    >
      <InputField
        label="Nombre"
        name="name"
        type="text"
        value={name}
        onChange={(event) => setName(event.target.value)}
        size="sm"
      />
    </EntityFormDrawer>
  );
}
