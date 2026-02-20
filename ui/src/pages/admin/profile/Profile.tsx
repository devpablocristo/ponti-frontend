import { useEffect, useState } from "react";

import Button from "../../../components/Button/Button";
import Header from "../../../components/Header/Header";
import { useAuth } from "../../login/context/AuthProvider";

export function Profile() {
  const auth = useAuth();

  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (auth?.user && auth?.isAuthenticated) {
      setUsername(auth.user.email || auth.user.sub || "");
    }
  }, [auth?.user, auth?.isAuthenticated]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(
      "La gestion de perfil (alta/baja/cambio de password) se hace via Identity Platform. " +
        "Si necesitas resetear tu clave, usa el flujo de recuperacion o pedilo a un admin."
    );
  };

  return (
    <div>
      <Header title="Mi Perfil" />
      <div className="max-w-3xl mx-auto mt-4 bg-white rounded-lg shadow-md p-8">
        <form onSubmit={onSubmit}>
          <div className="grid gap-6 sm:grid-cols-2 sm:gap-8">
            <div className="sm:col-span-2">
              <label
                htmlFor="name"
                className="block mb-3 text-base font-medium text-gray-900 dark:text-white"
              >
                Username
              </label>
              <input
                autoComplete="off"
                disabled={true}
                type="text"
                name="name"
                id="name"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-base rounded-lg focus:ring-indigo-600 focus:border-indigo-600 block w-full p-4 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                placeholder="Username"
                required={true}
              />
            </div>
          </div>
          <div className="flex justify-between mt-6">
            <Button variant="primary" type="submit">
              Ver instrucciones
            </Button>
          </div>
        </form>
        {message && (
          <div
            className="p-4 mt-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400"
            role="alert"
          >
            <span className="font-medium">Info:</span> {message}
          </div>
        )}
      </div>
    </div>
  );
}
