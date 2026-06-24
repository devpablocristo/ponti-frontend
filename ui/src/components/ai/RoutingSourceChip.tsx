import { AlertTriangle, Bot } from "lucide-react";

export type RoutingSourceChipProps = {
  /** routing_source del último evento `done`; null = sin respuestas aún (usa el provider build-time). */
  source: string | null;
  defaultProvider?: "axis" | "legacy";
  className?: string;
};

// El core emite "axis" (orquestado), "legacy" (ponti-ai directo) o "read_fallback" (degradado).
const variantFor = (value: string): { label: string; classes: string; fallback: boolean } => {
  const v = value.trim().toLowerCase();
  if (v === "axis") {
    return { label: "Axis", classes: "bg-emerald-50 text-emerald-700", fallback: false };
  }
  if (v === "read_fallback" || v === "fallback") {
    return { label: "Fallback", classes: "bg-amber-50 text-amber-700", fallback: true };
  }
  return { label: "Legacy", classes: "bg-gray-100 text-gray-600", fallback: false };
};

const RoutingSourceChip = ({ source, defaultProvider = "legacy", className = "" }: RoutingSourceChipProps) => {
  const variant = variantFor(source ?? defaultProvider);
  const Icon = variant.fallback ? AlertTriangle : Bot;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs ${variant.classes} ${className}`}
      title={source ?? undefined}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {variant.label}
    </span>
  );
};

export default RoutingSourceChip;
