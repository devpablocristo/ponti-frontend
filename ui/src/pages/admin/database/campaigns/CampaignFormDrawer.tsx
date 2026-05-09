import { useEffect, useState } from "react";

import EntityFormDrawer from "../../../../components/crud/EntityFormDrawer";
import InputField from "../../../../components/Input/InputField";
import { Campaign, CampaignPayloadInput } from "../../../../hooks/useCampaigns";

type CampaignFormDrawerProps = {
  open: boolean;
  campaign: Campaign | null;
  processing?: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (input: CampaignPayloadInput) => void | Promise<void>;
};

export default function CampaignFormDrawer({
  open,
  campaign,
  processing = false,
  errorMessage,
  onClose,
  onSubmit,
}: CampaignFormDrawerProps) {
  const isEdit = campaign !== null;
  const [name, setName] = useState("");
  const [validation, setValidation] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(campaign?.name ?? "");
      setValidation(null);
    }
  }, [campaign, open]);

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
      title={isEdit ? "Editar campaña" : "Nueva campaña"}
      subtitle={isEdit ? campaign?.name : undefined}
      processing={processing}
      errorMessage={validation ?? errorMessage ?? null}
      onSubmit={handleSubmit}
      submitLabel={isEdit ? "Guardar cambios" : "Crear campaña"}
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
