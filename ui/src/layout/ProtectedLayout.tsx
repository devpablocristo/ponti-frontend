import { useEffect, useState } from "react";

import Navbar from "./Navbar/Navbar";
import Sidebar from "./Sidebar/Sidebar";
import { getSidebarTitle } from "./Sidebar/sidebarTitle";
import { BaseModal } from "../components/Modal/BaseModal";
import { AuthProvider } from "../pages/login/context/AuthProvider";
import { useAuth } from "../pages/login/context/useAuth";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import LoadingScreen from "../components/LoadingScreen/LoadingScreen";
import { SelectionProvider } from "../pages/login/context/SelectionContext";
import { TenantProvider } from "../pages/login/context/TenantContext";
import { useIsMobile } from "@/hooks/useBreakpoint";

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();
  const isMobile = useIsMobile();

  const [title, setTitle] = useState("Dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  useEffect(() => {
    if (!auth?.loading && !auth?.isAuthenticated) {
      navigate("/login");
    }
  }, [auth?.isAuthenticated, auth?.loading, navigate]);

  useEffect(() => {
    setTitle(getSidebarTitle(location.pathname));
  }, [location.pathname]);

  // Sincronizá sidebar al breakpoint: cierra al entrar en mobile, abre al volver.
  // `useIsMobile` ya escucha matchMedia → no necesitamos resize listener manual.
  useEffect(() => {
    setIsSidebarOpen(!isMobile);
  }, [isMobile]);

  if (auth?.loading || auth.user === null)
    return <LoadingScreen title={["Cargando..."]} description={[""]} />;

  const toggleSidebar = (e?: React.MouseEvent) => {
    if (e?.currentTarget instanceof HTMLElement) {
      e.currentTarget.blur();
    }
    setIsSidebarOpen((prev) => !prev);
  };

  return (
    // h-[100dvh] (dynamic viewport) en lugar de h-screen para evitar el bug iOS
    // donde la URL bar de Safari se come 100px del 100vh y produce scroll fantasma.
    // Cae a h-screen en navegadores sin soporte (Tailwind genera el fallback).
    <div className="flex h-screen h-[100dvh] overflow-hidden bg-custom-bg dark:bg-slate-950">
      <Sidebar
        setTitle={setTitle}
        setIsSidebarOpen={() => setIsSidebarOpen(false)}
        isSidebarOpen={isSidebarOpen}
      />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar
          title={title}
          username={auth.user.Username || auth.user.email || "Usuario"}
          isSidebarOpen={isSidebarOpen}
          toggleSidebar={toggleSidebar}
          setIsLogoutModalOpen={() => setIsLogoutModalOpen(true)}
        />
        <main
          id="main-scroll"
          className="flex-1 overflow-y-auto p-5 bg-custom-bg dark:bg-slate-950"
        >
          <div className="animate-fade-in">
            <Outlet />
          </div>
          <BaseModal
            isOpen={isLogoutModalOpen}
            onClose={() => setIsLogoutModalOpen(false)}
            title="Cerrar sesión"
            message="¿Está seguro que desea salir?"
            primaryButtonText="Sí, cerrar sesión"
            secondaryButtonText="No, cancelar"
            onPrimaryAction={() => {
              // Close modal first so UI doesn't get stuck open.
              setIsLogoutModalOpen(false);
              void auth.logout();
            }}
          />
        </main>
      </div>
    </div>
  );
};

export const ProtectedLayout = () => {
  return (
    <AuthProvider>
      <TenantProvider>
        <SelectionProvider>
          <MainLayout />
        </SelectionProvider>
      </TenantProvider>
    </AuthProvider>
  );
};
