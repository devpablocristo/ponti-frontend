import { useEffect, useState } from "react";

import EntityFormDrawer from "../../../../components/crud/EntityFormDrawer";
import InputField from "../../../../components/Input/InputField";
import { CustomerData, CustomerPayloadInput } from "../../../../hooks/useCustomers/types";

type CustomerFormDrawerProps = {
  open: boolean;
  customer: CustomerData | null;
  processing?: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (input: CustomerPayloadInput) => void | Promise<void>;
};

export default function CustomerFormDrawer({
  open,
  customer,
  processing = false,
  errorMessage,
  onClose,
  onSubmit,
}: CustomerFormDrawerProps) {
  const isEdit = customer !== null;
  const [name, setName] = useState("");
  const [validation, setValidation] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(customer?.name ?? "");
      setValidation(null);
    }
  }, [customer, open]);

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
      title={isEdit ? "Editar cliente" : "Nuevo cliente o sociedad"}
      subtitle={isEdit ? customer?.name : undefined}
      processing={processing}
      errorMessage={validation ?? errorMessage ?? null}
      onSubmit={handleSubmit}
      submitLabel={isEdit ? "Guardar cambios" : "Crear cliente"}
    >
      <InputField
        label="Nombre / Razón social"
        name="name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        size="sm"
      />
    </EntityFormDrawer>
  );
}
