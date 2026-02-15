import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Button from "../../components/Button/Button";
import { useSelection } from "../../pages/login/context/SelectionContext";
import { getInsightsSummary } from "@/api/aiClient";

const POLL_INTERVAL_MS = 60_000; // 60 segundos

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

    // Polling periódico
    const interval = setInterval(fetchSummary, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [projectId]);

  return (
    <div className="relative flex items-center ms-3 gap-3">
      {/* Badge de insights — clickeable, visible solo si hay insights */}
      {insightsCount > 0 && (
        <Link
          to="/admin/ai-insights"
          className="flex flex-col items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
          title={`${insightsCount} insight${insightsCount !== 1 ? "s" : ""} nuevo${insightsCount !== 1 ? "s" : ""}`}
        >
          <span className="text-[10px] text-slate-500">IA</span>
          <span
            className={`text-xs font-semibold text-white rounded-full px-2 py-0.5 ${
              highSeverityCount > 0 ? "bg-red-500 animate-pulse" : "bg-blue-500"
            }`}
          >
            {insightsCount}
          </span>
        </Link>
      )}
      <div className="h-8 border-l border-slate-300" />
      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          className="flex text-sm bg-gray-800 rounded-full focus:ring-4 focus:ring-gray-600"
          aria-expanded={isDropdownOpen ? "true" : "false"}
          onClick={toggleDropdown}
        >
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
            <svg
              className="w-8 h-8 text-blue-900"
              fill="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
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
        className={`absolute right-0.5 top-full mt-2 z-[9999] ${
          isDropdownOpen ? "" : "hidden"
        } text-base list-none bg-white divide-y divide-gray-100 rounded shadow`}
      >
        <div className="px-4 py-3" role="none">
          <p className="text-sm text-gray-900 dark:text-white" role="none">
            <b>{username}</b>
          </p>
        </div>
        <ul className="py-1" role="none">
          <li>
            <Link
              to="/admin/profile"
              onClick={toggleDropdown}
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Mi Perfil
            </Link>
          </li>
          <li>
            <Button
              className="mx-2 mt-2 py-2 text-sm w-44"
              variant="danger"
              size="sm"
              onClick={setIsLogoutModalOpen}
            >
              Salir
            </Button>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Menu;
