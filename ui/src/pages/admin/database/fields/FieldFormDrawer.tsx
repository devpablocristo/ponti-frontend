import { useEffect, useState } from "react";

import { apiClient } from "@/api/client";
import { SuccessResponse } from "@/api/types";
import { EntityFormDrawer } from "../../../../components/crud/EntityFormDrawer";
import InputField from "../../../../components/Input/InputField";
import SelectField from "../../../../components/Input/SelectField";
import { Data as Field, FieldPayloadInput } from "../../../../hooks/useFields/types";

type LeaseTypeOption = {
  id: number;
  name: string;
};

type LeaseTypesResponse = {
  data: LeaseTypeOption[];
  total?: number;
};

type FieldFormDrawerProps = {
  open: boolean;
  field: Field | null;
  processing?: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (input: FieldPayloadInput) => void | Promise<void>;
};

export default function FieldFormDrawer({
  open,
  field,
  processing = false,
  errorMessage,
  onClose,
  onSubmit,
}: FieldFormDrawerProps) {
  const [name, setName] = useState("");
  const [leaseTypeId, setLeaseTypeId] = useState<number>(0);
  const [validation, setValidation] = useState<string | null>(null);
  const [leaseTypes, setLeaseTypes] = useState<LeaseTypeOption[]>([]);
  const [leaseTypesError, setLeaseTypesError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(field?.name ?? "");
    setLeaseTypeId(field?.lease_type_id ?? 0);
    setValidation(null);
  }, [field, open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLeaseTypesError(null);
    apiClient
      .get<SuccessResponse<LeaseTypesResponse>>("/lease-types")
      .then((response) => {
        if (cancelled) return;
        setLeaseTypes(response.data.data ?? []);
      })
      .catch((err) => {
        if (cancelled) return;
        setLeaseTypesError(
          err instanceof Error ? err.message : "No se pudieron cargar los tipos de contrato.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleSubmit = async () => {
    setValidation(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setValidation("El nombre es obligatorio.");
      return;
    }
    if (!leaseTypeId || leaseTypeId <= 0) {
      setValidation("Seleccioná un tipo de contrato.");
      return;
    }
    await onSubmit({ name: trimmed, lease_type_id: leaseTypeId });
  };

  const isEdit = field !== null;

  return (
    <EntityFormDrawer
      open={open}
      onClose={onClose}
      title={isEdit ? "Editar campo" : "Nuevo campo"}
      subtitle={isEdit ? field?.name : undefined}
      processing={processing}
      errorMessage={validation ?? errorMessage ?? leaseTypesError ?? null}
      onSubmit={handleSubmit}
      submitLabel={isEdit ? "Guardar cambios" : "Crear campo"}
    >
      <InputField
        label="Nombre"
        name="name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        size="sm"
      />
      <SelectField
        label="Tipo de contrato"
        name="lease_type_id"
        value={leaseTypeId === 0 ? "" : String(leaseTypeId)}
        onChange={(e) => setLeaseTypeId(Number(e.target.value) || 0)}
        options={leaseTypes}
        size="sm"
      />
    </EntityFormDrawer>
  );
}
