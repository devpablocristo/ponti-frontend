type Tone = "red" | "green" | "amber";

const TONE_CLASS: Record<Tone, string> = {
  red: "text-red-600 hover:text-red-800",
  green: "text-green-600 hover:text-green-800",
  amber: "text-amber-600 hover:text-amber-800",
};

type DismissButtonProps = {
  tone: Tone;
  onClick: () => void;
};

export function DismissButton({ tone, onClick }: DismissButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`absolute top-2 right-2 ${TONE_CLASS[tone]}`}
      aria-label="Cerrar"
    >
      <svg
        className="w-4 h-4"
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 14 14"
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
        />
      </svg>
    </button>
  );
}

export default DismissButton;
