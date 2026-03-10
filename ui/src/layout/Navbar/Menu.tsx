import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useSelection } from "../../pages/login/context/useSelection";
import { getInsightsSummary } from "@/api/aiClient";

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
        const summary = await getInsightsSummary({
          projectId: String(projectId),
        });
        setInsightsCount(summary.new_count_total ?? 0);
        setHighSeverityCount(summary.new_count_high_severity ?? 0);
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
        to="/admin/ai-insights"
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all duration-200 hover:bg-slate-100"
        title={`${insightsCount} insight${insightsCount !== 1 ? "s" : ""} nuevo${insightsCount !== 1 ? "s" : ""}`}
      >
        <span className="text-[11px] font-medium" style={{ color: "#64748B" }}>IA</span>
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
        className={`absolute right-0 top-full mt-2 z-[9999] ${
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
        </div>
        <div className="p-2 border-t border-slate-100">
          <button
            onClick={setIsLogoutModalOpen}
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
