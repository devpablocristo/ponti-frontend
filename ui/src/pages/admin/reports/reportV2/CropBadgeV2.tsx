import { cropColors } from "../../colors";

export function CropBadgeV2({ cropName }: { cropName: string }) {
  const cls =
    cropColors[cropName] ??
    "bg-slate-100 text-slate-700 border border-slate-300";
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${cls}`}
    >
      {cropName}
    </span>
  );
}
