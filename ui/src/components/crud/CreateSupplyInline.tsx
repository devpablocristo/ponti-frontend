import { useEffect, useState } from "react";

import Button from "../Button/Button";
import { Checkbox } from "../Input/Checkbox";
import InputField from "../Input/InputField";
import SelectField from "../Input/SelectField";
import { Notification } from "../feedback/Notification";
import useCategories from "../../hooks/useCategories";
import useSupplies from "../../hooks/useSupplies";
import { units } from "../../constants/units";

type CreateSupplyInlineProps = {
  projectId: number | null;
  onCreated: (createdName: string) => void;
  onCancel: () => void;
};

export default function CreateSupplyInline({
  projectId,
  onCreated,
  onCancel,
}: CreateSupplyInlineProps) {
  const { saveSupplies, result, error } = useSupplies();
  const { categories, types, getCategories, getTypes } = useCategories();
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [price, setPrice] = useState("");
  const [isPartialPrice, setIsPartialPrice] = useState(false);
  const [category, setCategory] = useState("");
  const [type, setType] = useState("");

  const normalizedName = name.trim().replace(/\s+/g, " ").toUpperCase();

  useEffect(() => {
    getCategories("");
    getTypes();
  }, [getCategories, getTypes]);

  useEffect(() => {
    if (!result) return;
    setSaving(false);
    setSuccess("Insumo creado correctamente");
  }, [result]);

  useEffect(() => {
    if (error) {
      setSaving(false);
    }
  }, [error]);

  return (
    <div className="space-y-4">
      {success && (
        <Notification variant="success" size="sm">
          <div className="flex items-center justify-between">
            <span>{success}</span>
            <Button
              size="xs"
              variant="primary"
              onClick={() => {
                setSuccess(null);
                onCreated(normalizedName);
              }}
            >
              OK
            </Button>
          </div>
        </Notification>
      )}

      {!success && (
        <>
          {error && <Notification variant="error" message={error} size="sm" />}
          <InputField
            label="Nombre del insumo"
            name="suplyName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            size="sm"
          />

          <SelectField
            label="Unidad"
            name="unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            options={units}
            size="sm"
          />

          <InputField
            label="Precio"
            name="supplyPrice"
            value={price}
            onChange={(e) => {
              const value = e.target.value.replace(/,/g, ".");
              if (/^\d*\.?\d{0,2}$/.test(value)) {
                setPrice(value);
              }
            }}
            size="sm"
          />

          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <Checkbox
              tone="form"
              checked={isPartialPrice}
              onChange={(e) => setIsPartialPrice(e.target.checked)}
            />
            Precio parcial
          </label>

          <SelectField
            label="Rubro"
            name="category"
            value={category}
            onChange={(e) => {
              const selectedCategory = categories.find(
                (c: { id: number; type_id?: number }) => c.id === Number(e.target.value)
              );
              setCategory(e.target.value);
              setType(selectedCategory?.type_id?.toString() || "");
            }}
            options={categories}
            size="sm"
          />

          <SelectField
            label="Tipo / Clase"
            name="type"
            value={type}
            options={types}
            disabled
            onChange={() => {}}
            size="sm"
          />

          <div className="drawer-footer-actions justify-end pt-4">
            <Button variant="secondary" onClick={onCancel} disabled={saving}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              disabled={saving}
              onClick={() => {
                if (!projectId || !name || !unit || !price || !category || !type) {
                  return;
                }
                setSaving(true);
                setSuccess(null);
                saveSupplies(
                  [
                    {
                      name: normalizedName,
                      unit: Number(unit),
                      price: Number(price),
                      category: Number(category),
                      type: Number(type),
                      is_partial_price: isPartialPrice,
                    },
                  ],
                  projectId
                );
              }}
            >
              {saving ? "Guardando..." : "Guardar Insumo"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
