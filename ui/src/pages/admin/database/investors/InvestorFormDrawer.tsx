import { useEffect, useState } from "react";

import EntityFormDrawer from "../../../../components/crud/EntityFormDrawer";
import InputField from "../../../../components/Input/InputField";
import {
  Investor,
  InvestorPayloadInput,
} from "../../../../hooks/useInvestors";

type InvestorFormDrawerProps = {
  open: boolean;
  /** Si se pasa, modo edición; si null/undefined, modo creación. */
  investor: Investor | null;
  processing?: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (input: InvestorPayloadInput) => void | Promise<void>;
};

export default function InvestorFormDrawer({
  open,
  investor,
  processing = false,
  errorMessage,
  onClose,
  onSubmit,
}: InvestorFormDrawerProps) {
  const isEdit = investor !== null;
  const [name, setName] = useState("");
  const [percentage, setPercentage] = useState("");
  const [validation, setValidation] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(investor?.name ?? "");
      setPercentage(investor?.percentage?.toString() ?? "");
      setValidation(null);
    }
  }, [investor, open]);

  const handleSubmit = async () => {
    setValidation(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setValidation("El nombre es obligatorio.");
      return;
    }
    const pctNumber = percentage.trim() === "" ? 0 : Number(percentage);
    if (Number.isNaN(pctNumber) || pctNumber < 0 || pctNumber > 100) {
      setValidation("El porcentaje debe ser un número entre 0 y 100.");
      return;
    }
    await onSubmit({ name: trimmed, percentage: pctNumber });
  };

  return (
    <EntityFormDrawer
      open={open}
      onClose={onClose}
      title={isEdit ? "Editar inversor" : "Nuevo inversor"}
      subtitle={isEdit ? investor?.name : undefined}
      processing={processing}
      errorMessage={validation ?? errorMessage ?? null}
      onSubmit={handleSubmit}
      submitLabel={isEdit ? "Guardar cambios" : "Crear inversor"}
    >
      <InputField
        label="Nombre"
        name="name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        size="sm"
      />
      <InputField
        label="Porcentaje (%)"
        name="percentage"
        type="number"
        value={percentage}
        onChange={(e) => setPercentage(e.target.value)}
        size="sm"
      />
    </EntityFormDrawer>
  );
}
