const FormButtons: React.FC<{
  onCancel: () => void;
  isSubmitting: boolean;
  submitLabel: string;
}> = ({ onCancel, isSubmitting, submitLabel }) => (
  <div className="flex justify-between mt-6">
    <button
      type="button"
      onClick={onCancel}
      className="bg-white text-slate-700 border border-slate-200 font-medium py-2.5 px-6 rounded-lg hover:bg-slate-50 transition-all duration-200"
    >
      Volver
    </button>
    <button
      type="submit"
      disabled={isSubmitting}
      className="bg-custom-btn text-white font-medium py-2.5 px-6 rounded-lg hover:bg-custom-btn/85 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isSubmitting ? "Guardando..." : submitLabel}
    </button>
  </div>
);

export default FormButtons;
