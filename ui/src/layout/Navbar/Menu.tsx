import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useSelection } from "../../pages/login/context/useSelection";
import { listInsights } from "@/api/insightsClient";

const HIGH_SEVERITY = new Set(["critical", "high"]);
const ACTIVE_STATUS = new Set(["new", "notified", "pending"]);

const POLL_INTERVAL_MS = 60_000;

interface NavbarProps {
  username: string;
  setIsLogoutModalOpen: () => void;
}

const Menu: React.FC<NavbarProps> = ({ setIsLogoutModalOpen, username }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [insightsCount, setInsightsCount] = useState(0);
  const [highSeverityCount, setHighSeverityCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { projectId } = useSelection();

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleLogoutClick = () => {
    setIsDropdownOpen(false);
    setIsLogoutModalOpen();
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (
      dropdownRef.current &&
      !dropdownRef.current.contains(event.target as Node) &&
      buttonRef.current &&
      !buttonRef.current.contains(event.target as Node)
    ) {
      setIsDropdownOpen(false);
    }
  };

  useEffect(() => {
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  useEffect(() => {
    if (!projectId) {
      setInsightsCount(0);
      setHighSeverityCount(0);
      return;
    }

    const fetchSummary = async () => {
      try {
        const { items } = await listInsights(String(projectId));
        const unread = items.filter((i) => !i.read_at && ACTIVE_STATUS.has(i.status));
        setInsightsCount(unread.length);
        setHighSeverityCount(unread.filter((i) => HIGH_SEVERITY.has(i.severity.toLowerCase())).length);
      } catch {
        // Silencioso: si falla el polling no afecta la UI
      }
    };

    fetchSummary();

    const interval = setInterval(fetchSummary, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [projectId]);

  return (
    <div className="relative flex items-center gap-3">
      <Link
        to="/admin/notifications"
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all duration-200 hover:bg-slate-100"
        title={`${insightsCount} notificación${insightsCount !== 1 ? "es" : ""} nueva${insightsCount !== 1 ? "s" : ""}`}
      >
        <span
          className="text-[11px] font-semibold rounded-full px-2 py-0.5"
          style={{
            color: "#FFFFFF",
            backgroundColor: highSeverityCount > 0 ? "#EF4444" : insightsCount > 0 ? "#547792" : "#94A3B8",
            animation: highSeverityCount > 0 ? "pulse-subtle 2s infinite" : undefined,
          }}
        >
          {insightsCount}
        </span>
      </Link>

      <div className="h-6" style={{ borderLeft: "1px solid #E2E8F0" }} />

      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-slate-100 transition-colors duration-200"
          aria-expanded={isDropdownOpen ? "true" : "false"}
          onClick={toggleDropdown}
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "#E2E8F0" }}
          >
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              style={{ color: "#3D5A6E" }}
            >
              <path
                fillRule="evenodd"
                d="M12 12c2.21 0 4-1.79 4-4S14.21 4 12 4 8 5.79 8 8s1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </button>
      </div>

      <div
        ref={dropdownRef}
        className={`absolute right-0 top-full mt-2 z-nav-menu ${
          isDropdownOpen ? "animate-fade-in-down" : "hidden"
        } w-52 bg-white rounded-xl border border-slate-200 overflow-hidden`}
        style={{ boxShadow: "var(--shadow-lg)" }}
      >
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-sm font-semibold" style={{ color: "#1E293B" }}>{username}</p>
        </div>
        <div className="py-1">
          <Link
            to="/admin/profile"
            onClick={toggleDropdown}
            className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors duration-150"
            style={{ color: "#475569" }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
            Mi Perfil
          </Link>
          <Link
            to="/admin/access"
            onClick={toggleDropdown}
            className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors duration-150"
            style={{ color: "#475569" }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
            </svg>
            Accesos
          </Link>
        </div>
        <div className="p-2 border-t border-slate-100">
          <button
            onClick={handleLogoutClick}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors duration-150"
            style={{ color: "#DC2626" }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15" />
            </svg>
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
};

export default Menu;
