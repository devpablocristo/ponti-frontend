import React from "react";

import Menu from "./Menu";
import TenantSwitcher from "./TenantSwitcher";

interface NavbarProps {
  username: string;
  title: string;
  isSidebarOpen: boolean;
  toggleSidebar: (e?: React.MouseEvent) => void;
  setIsLogoutModalOpen: () => void;
}

const Navbar: React.FC<NavbarProps> = ({
  username,
  title,
  isSidebarOpen,
  toggleSidebar,
  setIsLogoutModalOpen,
}) => {
  return (
    <nav className="relative z-navbar w-full bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-700/60">
      <div className="mx-auto flex items-center justify-between gap-2 px-3 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {/* Hamburger:
              - mobile: SIEMPRE visible (sidebar es overlay; cuando se abre la
                cubre, así que ocultarla acá no aporta y crearía un flash).
              - desktop: solo cuando el sidebar está colapsado (inline). */}
          <button
            onClick={(e) => toggleSidebar(e)}
            type="button"
            className={`inline-flex h-10 w-10 items-center justify-center rounded-lg transition-colors duration-200 hover:bg-slate-100 dark:hover:bg-slate-800 md:h-9 md:w-9 ${
              isSidebarOpen ? "md:hidden" : "md:inline-flex"
            }`}
            style={{ color: "#94A3B8" }}
          >
            <span className="sr-only">Abrir menú</span>
            <svg
              className="w-5 h-5"
              aria-hidden="true"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                clipRule="evenodd"
                fillRule="evenodd"
                d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z"
              ></path>
            </svg>
          </button>
          <h1 className="truncate text-base font-semibold tracking-tight font-display text-slate-800 dark:text-slate-100 sm:text-lg md:text-xl">
            {title}
          </h1>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2 sm:gap-4">
          <TenantSwitcher />
          <Menu
            setIsLogoutModalOpen={setIsLogoutModalOpen}
            username={username}
          />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
