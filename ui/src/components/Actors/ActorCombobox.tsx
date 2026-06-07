import React, { useEffect, useRef, useState } from "react";

import Search from "@/components/Input/Search";
import InputField from "@/components/Input/InputField";
import Button from "@/components/Button/Button";
import { toastSuccess, toastInfo, toastError } from "@/lib/toast";
import {
  Actor,
  ActorRole,
  ActorSearchResult,
  resolveActor,
  searchActors,
} from "@/api/actors";

type Props = {
  role: ActorRole;
  label: string;
  placeholder?: string;
  selected: Actor | null;
  onSelect: (actor: Actor) => void;
  onClear?: () => void;
};

const EMPTY: ActorSearchResult = { exact: [], similar: [] };

/**
 * ActorCombobox — selector search-first del Identity Gate (Pilar 3).
 * Busca en vivo contra /actors/search; "Crear nuevo" abre un mini-form (nombre + CUIT)
 * que hace resolve-or-create. Si la identidad ya existía la reusa (no duplica).
 */
export default function ActorCombobox({
  role,
  label,
  placeholder,
  selected,
  onSelect,
  onClear,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ActorSearchResult>(EMPTY);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTaxID, setNewTaxID] = useState("");
  const [saving, setSaving] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Búsqueda debounced (300ms).
  useEffect(() => {
    if (creating) return;
    if (query.trim() === "") {
      setResults(EMPTY);
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setLoading(true);
      searchActors(query)
        .then(setResults)
        .catch(() => setResults(EMPTY))
        .finally(() => setLoading(false));
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, creating]);

  const pick = (a: Actor) => {
    onSelect(a);
    setOpen(false);
    setCreating(false);
    setQuery("");
  };

  const startCreate = () => {
    setNewName(query.trim());
    setNewTaxID("");
    setCreating(true);
  };

  const doCreate = async () => {
    if (newName.trim() === "") {
      toastError("El nombre es obligatorio");
      return;
    }
    setSaving(true);
    try {
      const r = await resolveActor({
        name: newName.trim(),
        tax_id: newTaxID.trim() || undefined,
        role,
      });
      if (r.reused) {
        toastInfo(`Ya existía «${r.actor.display_name}» — se usó esa identidad`);
      } else {
        toastSuccess(`Creado «${r.actor.display_name}»`);
      }
      pick(r.actor);
    } catch {
      // 409 u otro: volver a la búsqueda para que elija el existente.
      toastError("No se pudo crear; revisá las coincidencias existentes");
      setCreating(false);
      setOpen(true);
      try {
        setResults(await searchActors(newName));
      } catch {
        /* noop */
      }
    } finally {
      setSaving(false);
    }
  };

  if (selected) {
    return (
      <div className="w-full">
        <label className="block text-sm text-gray-600 mb-1">{label}</label>
        <div className="flex items-center justify-between w-full border rounded-lg px-3 py-2 bg-gray-50">
          <span className="text-sm font-medium">{selected.display_name}</span>
          <button
            type="button"
            onClick={() => onClear?.()}
            className="ml-2 text-gray-400 hover:text-red-500"
            title="Quitar"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative w-full">
      <Search
        label={label}
        name={`actor-${role}`}
        placeholder={placeholder ?? "Buscar por nombre…"}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        fullWidth
      />

      {open && !creating && (
        <ul className="absolute mt-1 w-full bg-white border rounded-lg shadow-md z-50 max-h-[260px] overflow-y-auto text-sm">
          {results.exact.length > 0 && (
            <li className="px-3 py-1 text-xs uppercase text-gray-400">Coincidencias</li>
          )}
          {results.exact.map((a) => (
            <li
              key={`e-${a.id}`}
              onClick={() => pick(a)}
              className="px-4 py-2 cursor-pointer hover:bg-gray-100 flex justify-between"
            >
              <span>{a.display_name}</span>
              {a.keys?.some((k) => k.type === "TAX_ID") && (
                <span className="text-xs text-gray-400">CUIT ✓</span>
              )}
            </li>
          ))}

          {results.similar.length > 0 && (
            <li className="px-3 py-1 text-xs uppercase text-gray-400">¿Quisiste decir?</li>
          )}
          {results.similar.map((a) => (
            <li
              key={`s-${a.id}`}
              onClick={() => pick(a)}
              className="px-4 py-2 cursor-pointer hover:bg-gray-100 flex justify-between"
            >
              <span>{a.display_name}</span>
              <span className="text-xs text-gray-400">{Math.round(a.score * 100)}%</span>
            </li>
          ))}

          {loading && <li className="px-4 py-2 text-gray-400">Buscando…</li>}

          {query.trim() !== "" && (
            <li className="px-4 py-2 border-t">
              <button
                type="button"
                onClick={startCreate}
                className="text-custom-btn hover:underline"
              >
                + Crear nuevo «{query.trim()}»
              </button>
            </li>
          )}
        </ul>
      )}

      {creating && (
        <div className="absolute mt-1 w-full bg-white border rounded-lg shadow-md z-50 p-3 space-y-2">
          <InputField
            label="Nombre"
            name="actorNewName"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <InputField
            label="CUIT/CUIL (opcional)"
            name="actorNewTaxID"
            value={newTaxID}
            onChange={(e) => setNewTaxID(e.target.value)}
            placeholder="20-12345678-6"
          />
          <div className="flex gap-2 pt-1">
            <Button variant="primary" size="sm" onClick={doCreate} disabled={saving}>
              {saving ? "Creando…" : "Crear"}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setCreating(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
