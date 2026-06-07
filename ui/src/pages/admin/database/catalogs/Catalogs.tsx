import { useState } from "react";

import CatalogCrud from "@/components/Catalog/CatalogCrud";

const TABS = [
  { key: "crops", title: "Cultivos", base: "crops" },
  { key: "types", title: "Tipos", base: "types" },
  { key: "lease-types", title: "Tipos de arriendo", base: "lease-types" },
  { key: "campaigns", title: "Campañas", base: "campaigns" },
];

// Hub de catálogos (no-actors): entidades de nombre por-tenant con dedup normalizado.
// CRUDAR genérico reutilizando <CatalogCrud>. categories (por type_id) y
// business_parameters (por key) se suman en una próxima etapa.
export default function Catalogs() {
  const [tabKey, setTabKey] = useState(TABS[0].key);
  const tab = TABS.find((t) => t.key === tabKey) ?? TABS[0];

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold mb-1">Catálogos</h1>
      <p className="text-sm text-gray-500 mb-5">
        Entidades de nombre por-tenant (no-actors), con dedup normalizado. Crear / listar /
        editar / eliminar.
      </p>

      <div className="flex gap-2 mb-4 border-b">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTabKey(t.key)}
            className={`px-3 py-2 text-sm ${
              tabKey === t.key
                ? "border-b-2 border-gray-800 font-medium"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.title}
          </button>
        ))}
      </div>

      <CatalogCrud key={tab.key} title={tab.title} base={tab.base} />
    </div>
  );
}
