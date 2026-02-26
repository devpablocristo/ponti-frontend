import React from "react";

import Menu from "./Menu";

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
  const titlesWithPontiBrand = new Set([
    "Dashboard",
    "Lotes",
    "Órdenes de Trabajo",
    "Ordenes de Trabajo",
    "Labores",
    "Insumos",
    "Stock",
  ]);

  const showPontiBrand = titlesWithPontiBrand.has(title);

  return (
    <nav className="w-full bg-white border-b border-slate-200/80">
      <div className="mx-auto px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {!isSidebarOpen && (
            <button
              onClick={(e) => toggleSidebar(e)}
              type="button"
              className="inline-flex items-center p-2 rounded-lg hover:bg-slate-100 transition-colors duration-200"
              style={{ color: "#94A3B8" }}
            >
              <span className="sr-only">Open sidebar</span>
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
          )}
          <h1 className="text-xl font-semibold tracking-tight font-display" style={{ color: "#1E293B" }}>
            {title}
          </h1>
          {showPontiBrand && (
            <div className="flex items-center gap-2">
              <div className="h-6" style={{ borderLeft: "1px solid #E2E8F0" }} />
              <img
                src="/ponti.svg"
                alt="Ponti"
                className="w-6 h-6 object-contain"
              />
              <span className="text-xl font-semibold tracking-tight font-display ">
                Ponti
              </span>
            </div>
          )}
        </div>
        <Menu
          setIsLogoutModalOpen={setIsLogoutModalOpen}
          username={username}
        />
      </div>
    </nav>
  );
};

export default Navbar;
