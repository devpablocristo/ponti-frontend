import { cropColors } from "../../colors";

export function CropBadgeV2({ cropName }: { cropName: string }) {
  const cls =
    cropColors[cropName] ??
    "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600";
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${cls}`}
    >
      {cropName}
    </span>
  );
}
