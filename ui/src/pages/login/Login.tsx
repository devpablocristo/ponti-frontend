import { useNavigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthProvider";
import { useAuth } from "./context/useAuth";
import { useEffect, useState } from "react";
import { UserData } from "./types";
import { RequestError } from "@/api/types";
import Cover from "./Cover";

function Login() {
  const { login, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLogin, setIsLogin] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/workspace");
    }
  }, [isAuthenticated, loading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const loginUserData: UserData = {
      email,
      password,
    };

    setIsLogin(true);

    try {
      setError("");
      await login(loginUserData);
    } catch (error) {
      setIsLogin(false);
      if (error instanceof RequestError) {
        setError(error.message);
        return;
      }
      setError("Error en el inicio de sesión. Intenta nuevamente.");
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen">
      <Cover />
      <div className="w-full md:w-2/5 flex-1 flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-sm animate-fade-in-up">
          {/* Mobile logo */}
          <div className="md:hidden flex items-center justify-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-custom-btn to-emerald-500 flex items-center justify-center">
              <span className="text-white font-bold text-lg font-display">P</span>
            </div>
            <span className="text-2xl font-bold text-slate-800 font-display tracking-tight">Ponti</span>
          </div>

          <h2 className="text-3xl font-bold text-slate-800 mb-2 font-display tracking-tight">
            Bienvenido
          </h2>
          <p className="text-sm text-slate-500 mb-8 leading-relaxed">
            Ingresá con tu email o usuario y contraseña para acceder al sistema de gestión.
          </p>

          <form className="space-y-5" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Email o usuario
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8.65399 10.9381H11.3454C12.4063 10.9394 13.4209 11.3527 14.1677 12.0826C14.914 12.8121 15.3323 13.7983 15.3337 14.8248V17.4557C15.3337 17.5518 15.2944 17.6468 15.2214 17.7184C15.1477 17.7904 15.0451 17.8335 14.9362 17.8336H5.06415C4.95511 17.8336 4.8527 17.7904 4.77899 17.7184C4.70583 17.6468 4.66669 17.5519 4.66669 17.4557V14.8248L4.67157 14.6334C4.72116 13.6764 5.13214 12.7666 5.83173 12.0826C6.53171 11.3984 7.46755 10.9931 8.45575 10.944L8.65399 10.9381ZM9.99969 2.16663C11.9647 2.16663 13.5387 3.7207 13.5388 5.61389C13.5388 7.50713 11.9647 9.06116 9.99969 9.06116C8.03479 9.06099 6.46161 7.50702 6.46161 5.61389C6.46167 3.72081 8.03483 2.1668 9.99969 2.16663Z" fill="currentColor" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="tu@email.com"
                  className="input-base h-12 pl-11 pr-4 text-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required={true}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10.0003 3C10.8781 3.00008 11.7104 3.31471 12.3167 3.86035C12.9214 4.40458 13.2503 5.13052 13.2503 5.875V8.25H15.0003C15.3255 8.25008 15.6284 8.36656 15.8441 8.56055C16.058 8.75314 16.1663 9.0028 16.1663 9.25V16C16.1663 16.2472 16.058 16.4969 15.8441 16.6895C15.6284 16.8834 15.3255 16.9999 15.0003 17H5.00031C4.67488 17 4.37131 16.8836 4.15558 16.6895C3.94159 16.4969 3.83331 16.2472 3.83331 16V9.25C3.83331 9.0028 3.94159 8.75314 4.15558 8.56055C4.37131 8.3664 4.67488 8.25 5.00031 8.25H6.75031V5.875C6.75031 5.13054 7.07825 4.40457 7.68292 3.86035C8.28935 3.31456 9.12234 3 10.0003 3ZM10.0003 10.25C9.66283 10.25 9.32955 10.37 9.07648 10.5977C8.82163 10.827 8.66632 11.1505 8.66632 11.5V13.75C8.66632 14.0995 8.82163 14.423 9.07648 14.6523C9.32955 14.88 9.66283 15 10.0003 15C10.3378 14.9999 10.6711 14.8801 10.9241 14.6523C11.179 14.423 11.3333 14.0995 11.3333 13.75V11.5C11.3333 11.1505 11.179 10.827 10.9241 10.5977C10.6711 10.3699 10.3378 10.2501 10.0003 10.25ZM10.0003 3.5C9.33121 3.5 8.68021 3.739 8.19269 4.17773C7.70342 4.61808 7.41632 5.22709 7.41632 5.875V8.25H12.5833V5.875C12.5833 5.22722 12.297 4.61806 11.8079 4.17773C11.3205 3.73903 10.6693 3.50008 10.0003 3.5Z" fill="currentColor" />
                  </svg>
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Ingresá tu contraseña"
                  className="input-base h-12 pl-11 pr-11 text-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={true}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors duration-200"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 3L21 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      <path d="M10.58 10.58C10.21 10.95 10 11.46 10 12C10 13.1 10.9 14 12 14C12.54 14 13.05 13.79 13.42 13.42" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M9.88 5.09C10.56 4.86 11.27 4.75 12 4.75C16.25 4.75 19.73 8.19 20.58 12C20.33 13.1 19.83 14.12 19.14 14.98" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M6.12 6.12C4.74 7.2 3.7 8.82 3.42 12C4.27 15.81 7.75 19.25 12 19.25C13.61 19.25 15.11 18.76 16.36 17.92" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1.5 12C2.73 7.94 6.74 4.75 12 4.75C17.26 4.75 21.27 7.94 22.5 12C21.27 16.06 17.26 19.25 12 19.25C6.74 19.25 2.73 16.06 1.5 12Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M12 15C13.66 15 15 13.66 15 12C15 10.34 13.66 9 12 9C10.34 9 9 10.34 9 12C9 13.66 10.34 15 12 15Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLogin}
              className="w-full h-12 bg-custom-btn text-white font-semibold text-sm rounded-xl hover:bg-custom-btn/85 active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {isLogin ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spinner" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-25" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                  </svg>
                  Ingresando...
                </span>
              ) : (
                "Ingresar"
              )}
            </button>
          </form>

          {error !== "" && (
            <div
              className="flex items-start gap-3 p-4 mt-5 text-sm text-red-700 rounded-xl bg-red-50 border border-red-100 animate-fade-in-up"
              role="alert"
            >
              <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
              <p>{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const SignInPage = () => (
  <AuthProvider>
    <Login />
  </AuthProvider>
);

export default SignInPage;
