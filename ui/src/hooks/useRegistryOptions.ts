import { useEffect, useState } from "react";

import { loadRegistryOptions, RegistryRow } from "@/api/registry";

// useRegistryOptions: lista de opciones del registry para una `base` (project/field/lot/…),
// compartida vía caché de módulo (una sola request por base aunque haya N selects montados).
// Trae el manejo de error y el guard de unmount incorporados.
export function useRegistryOptions(base: string): {
  options: RegistryRow[];
  loading: boolean;
  error: boolean;
} {
  const [options, setOptions] = useState<RegistryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    loadRegistryOptions(base)
      .then((rows) => {
        if (!active) return;
        setOptions(rows);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setOptions([]);
        setError(true);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [base]);

  return { options, loading, error };
}
