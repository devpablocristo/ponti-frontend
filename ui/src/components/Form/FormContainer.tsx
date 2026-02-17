const FormContainer: React.FC<{
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  children: React.ReactNode;
}> = ({ onSubmit, children }) => (
  <div
    className="max-w-6xl mx-auto mt-6 bg-white rounded-xl p-8 border border-slate-200/80"
    style={{ boxShadow: 'var(--shadow-md)' }}
  >
    <form onSubmit={onSubmit}>{children}</form>
  </div>
);

export default FormContainer;
