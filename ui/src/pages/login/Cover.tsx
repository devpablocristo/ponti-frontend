export default function Cover() {
  return (
    <div
      className="hidden md:block md:w-3/5 relative bg-cover bg-center overflow-hidden"
      style={{
        backgroundImage: "url('/LeftContent.png')",
      }}
    >
      {/* Gradient overlay for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/70 via-slate-900/40 to-transparent" />

      {/* Subtle pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: "32px 32px",
        }}
      />

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="flex flex-col items-center text-center px-8 animate-fade-in-up">
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-6 border border-white/20">
            <span className="text-white font-bold text-2xl font-display">P</span>
          </div>
          <h1 className="text-7xl lg:text-8xl font-extrabold text-white tracking-tight font-display">
            Ponti
          </h1>
          <div className="mt-4 flex items-center gap-3">
            <div className="w-8 h-px bg-white/40" />
            <p className="text-base text-white/80 tracking-wide">
              Es gestión. Es trazabilidad. <span className="font-semibold text-white">Es simple.</span>
            </p>
            <div className="w-8 h-px bg-white/40" />
          </div>
        </div>
      </div>

      <p className="absolute bottom-5 left-0 right-0 text-xs text-white/50 text-center tracking-wide">
        Ponti Software v1.0
      </p>
    </div>
  );
}
