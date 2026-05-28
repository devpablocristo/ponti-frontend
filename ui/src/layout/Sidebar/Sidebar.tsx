import {
  BarChart3,
  Bell,
  Bot,
  CalendarRange,
  ChevronDown,
  Database,
  DollarSign,
  MapPin,
  Monitor,
  Moon,
  Package,
  ShieldCheck,
  Sprout,
  Sun,
  Tag,
  Users,
  Wrench,
} from "lucide-react";
import React, { ReactNode, useEffect, useState } from "react";

import { Link, useLocation } from "react-router-dom";
import { getSidebarTitle } from "./sidebarTitle";
import { useTheme, type Theme } from "@/lib/theme";
import { useIsMobile } from "@/hooks/useBreakpoint";

type MenuItem = {
  name: string;
  icon: (color: string) => ReactNode;
  route: string;
  hidden?: boolean;
};

/**
 * Helper para envolver iconos Lucide con el contrato MenuItem.icon (color → ReactNode).
 * Mantiene size=20 (match con los SVG inline de Operación) y strokeWidth=1.5.
 */
const lucideIcon =
  (Icon: typeof Users) =>
  (color: string): ReactNode => <Icon size={20} strokeWidth={1.5} color={color} />;

const menuReports: MenuItem[] = [
  {
    name: "Integridad de Datos",
    icon: lucideIcon(ShieldCheck),
    route: "/admin/master-data/data-integrity",
  },
  {
    name: "Aportes por Inversor",
    icon: lucideIcon(Users),
    route: "/admin/informes/aportes",
  },
  {
    name: "Por Campo o Cultivo",
    icon: lucideIcon(Sprout),
    route: "/admin/informes/campo",
  },
  {
    name: "Resumen de Resultados",
    icon: lucideIcon(BarChart3),
    route: "/admin/informes/resumen",
  },
];

const menuDatabase: MenuItem[] = [
  {
    name: "Administrar Entidades",
    icon: lucideIcon(Database),
    route: "/admin/master-data/entities",
  },
  {
    name: "Crear Clientes y Sociedades",
    icon: lucideIcon(Users),
    route: "/admin/database/customers",
  },
  {
    name: "Administrar Actores",
    icon: lucideIcon(Users),
    route: "/admin/master-data/actors",
  },
  {
    name: "Administrar Campañas",
    icon: lucideIcon(CalendarRange),
    route: "/admin/master-data/campaigns",
  },
  {
    name: "Administrar Campos",
    icon: lucideIcon(MapPin),
    route: "/admin/master-data/fields",
  },
  {
    name: "Administrar Cultivos",
    icon: lucideIcon(Sprout),
    route: "/admin/master-data/crops",
  },
  {
    name: "Crear Labores",
    icon: lucideIcon(Wrench),
    route: "/admin/database/tasks",
  },
  {
    name: "Crear Insumos",
    icon: lucideIcon(Package),
    route: "/admin/database/items",
  },
  {
    name: "Cargar Dólar Promedio",
    icon: lucideIcon(DollarSign),
    route: "/admin/master-data/dollar",
  },
  {
    name: "Cargar Comercialización",
    icon: lucideIcon(Tag),
    route: "/admin/master-data/commerce",
  },
];

const menuAIItems: MenuItem[] = [
  {
    name: "Asistente",
    icon: lucideIcon(Bot),
    route: "/admin/ai-assistant",
  },
  {
    name: "Notificaciones",
    icon: lucideIcon(Bell),
    route: "/admin/notifications",
  },
];

const lotsIcon = (color: string) => (
  <svg width="20" height="20" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M3.33671 7.46V8L8.00204 10.6947L12.6667 8V7.46M3.33337 10.7667V11.3067L7.99804 14L12.6634 11.3053V10.7653M8.00204 2L3.33671 4.69467L8.00204 7.38933L12.6667 4.69467L8.00204 2Z"
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const workOrdersIcon = (color: string) => (
  <svg width="20" height="20" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M6.66671 2V4.66667C6.66671 4.84348 6.59647 5.01305 6.47144 5.13807C6.34642 5.2631 6.17685 5.33333 6.00004 5.33333H3.33337M8.66671 4H10.6667M8.66671 6H10.6667M8.00004 8V12M10.6667 10H5.33337M12.6667 2.66667V13.3333C12.6667 13.5101 12.5965 13.6797 12.4714 13.8047C12.3464 13.9298 12.1769 14 12 14H4.00004C3.82323 14 3.65366 13.9298 3.52864 13.8047C3.40361 13.6797 3.33337 13.5101 3.33337 13.3333V5.276C3.33341 5.0992 3.40367 4.92966 3.52871 4.80467L6.13804 2.19533C6.26304 2.0703 6.43258 2.00004 6.60937 2H12C12.1769 2 12.3464 2.07024 12.4714 2.19526C12.5965 2.32029 12.6667 2.48986 12.6667 2.66667ZM5.33337 8V12H10.6667V8H5.33337Z"
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const laborsIcon = (color: string) => (
  <svg width="20" height="20" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M8.66667 4.66659H12.6667L14 7.33325M8.66667 4.66659V9.99992M8.66667 4.66659V3.99992C8.66667 3.82311 8.59643 3.65354 8.4714 3.52851C8.34638 3.40349 8.17681 3.33325 8 3.33325H2.66667C2.48986 3.33325 2.32029 3.40349 2.19526 3.52851C2.07024 3.65354 2 3.82311 2 3.99992V9.99992H3.33333M14 7.33325V9.99992H12.6667M14 7.33325H10.6667M8.66667 9.99992H6M8.66667 9.99992H10M13 10.9999C13 11.4419 12.8244 11.8659 12.5118 12.1784C12.1993 12.491 11.7754 12.6666 11.3333 12.6666C10.8913 12.6666 10.4674 12.491 10.1548 12.1784C9.84226 11.8659 9.66667 11.4419 9.66667 10.9999C9.66667 10.5579 9.84226 10.134 10.1548 9.82141C10.4674 9.50885 10.8913 9.33325 11.3333 9.33325C11.7754 9.33325 12.1993 9.50885 12.5118 9.82141C12.8244 10.134 13 10.5579 13 10.9999ZM6.33333 10.9999C6.33333 11.4419 6.15774 11.8659 5.84518 12.1784C5.53262 12.491 5.10869 12.6666 4.66667 12.6666C4.22464 12.6666 3.80072 12.491 3.48816 12.1784C3.17559 11.8659 3 11.4419 3 10.9999C3 10.5579 3.17559 10.134 3.48816 9.82141C3.80072 9.50885 4.22464 9.33325 4.66667 9.33325C5.10869 9.33325 5.53262 9.50885 5.84518 9.82141C6.15774 10.134 6.33333 10.5579 6.33333 10.9999Z"
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const suppliesIcon = (color: string) => (
  <svg width="20" height="20" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M6.55932 8.30298C6.55932 8.30298 7.39257 6.24417 6.41515 4.77629C5.43775 3.30841 3.05785 2.73935 2.932 2.82918C2.80615 2.91902 2.18662 5.04615 3.16402 6.51403C4.14142 7.98191 6.55932 8.30298 6.55932 8.30298ZM6.55932 8.30298C6.89264 8.96965 8.00004 10.0001 8.00004 12.0001V13.3334C8.00004 12.0001 7.71311 11.0542 9.37977 9.38758M9.37977 9.38758C9.37977 9.38758 9.05351 7.52838 10.1268 6.48233C11.2002 5.43628 13.1204 5.45111 13.2402 5.62614C13.3601 5.80117 13.528 7.52198 12.5196 8.50471C11.4463 9.55078 9.37977 9.38758 9.37977 9.38758Z"
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const stockIcon = (color: string) => (
  <svg width="20" height="20" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M2 10.0001V12.6667M6 8.66675V12.6667M10 10.0001V12.6667M14 8.66675V12.6667M2 7.33341L6 4.00008L10 7.33341L13.6667 3.66675"
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const menuItems: MenuItem[] = [
  {
    name: "Dashboard",
    icon: (color: string) => (
      <svg
        width="20"
        height="20"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M4.08863 13.9999C3.30329 13.9999 2.66663 13.3466 2.66663 12.5399V6.67194C2.66663 6.22861 2.86329 5.80861 3.19996 5.53194L7.11129 2.31994C7.3612 2.113 7.67549 1.99976 7.99996 1.99976C8.32443 1.99976 8.63872 2.113 8.88863 2.31994L12.7993 5.53194C13.1366 5.80861 13.3333 6.22861 13.3333 6.67194V12.5399C13.3333 13.3466 12.6966 13.9999 11.9113 13.9999H4.08863Z"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M6 10.6666C6.56667 11.0866 7.25667 11.3333 8 11.3333C8.74333 11.3333 9.43333 11.0866 10 10.6666M6.33333 7.66659V7.33325M9.66667 7.66659V7.33325"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    route: "/admin/dashboard",
  },
  {
    name: "Clientes y Sociedades",
    icon: lucideIcon(Users),
    route: "/admin/customers",
  },
  {
    name: "Nuevo Proyecto",
    icon: (color: string) => (
      <svg
        width="20"
        height="20"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M2 4.66659C2 4.31297 2.14048 3.97383 2.39052 3.72378C2.64057 3.47373 2.97971 3.33325 3.33333 3.33325H6L7.33333 4.66659H12.6667C13.0203 4.66659 13.3594 4.80706 13.6095 5.05711C13.8595 5.30716 14 5.6463 14 5.99992V11.3333C14 11.6869 13.8595 12.026 13.6095 12.2761C13.3594 12.5261 13.0203 12.6666 12.6667 12.6666H3.33333C2.97971 12.6666 2.64057 12.5261 2.39052 12.2761C2.14048 12.026 2 11.6869 2 11.3333V4.66659Z"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    route: "/admin/projects/new",
    hidden: true,
  },
  {
    name: "Lotes",
    icon: lotsIcon,
    route: "/admin/lots",
  },
  {
    name: "Lotes Nuevo",
    icon: lotsIcon,
    route: "/admin/lots/new",
    hidden: true,
  },
  {
    name: "Órdenes de Trabajo",
    icon: workOrdersIcon,
    route: "/admin/work-orders",
  },
  {
    name: "Órdenes Nuevo",
    icon: workOrdersIcon,
    route: "/admin/work-orders/new",
    hidden: true,
  },
  {
    name: "Labores",
    icon: laborsIcon,
    route: "/admin/tasks",
  },
  {
    name: "Labores Nuevo",
    icon: laborsIcon,
    route: "/admin/tasks/new",
    hidden: true,
  },
  {
    name: "Insumos",
    icon: suppliesIcon,
    route: "/admin/supply-movements",
  },
  {
    name: "Insumos Nuevo",
    icon: suppliesIcon,
    route: "/admin/supply-movements/new",
    hidden: true,
  },
  {
    name: "Stock",
    icon: stockIcon,
    route: "/admin/stock",
  },
  {
    name: "Stock Nuevo",
    icon: stockIcon,
    route: "/admin/stock/new",
    hidden: true,
  },
];

const visibleMenuItems = menuItems.filter((item) => !item.hidden);

interface SidebarProps {
  isSidebarOpen: boolean;
  setTitle: (title: string) => void;
  setIsSidebarOpen: () => void;
}

interface SidebarItemProps {
  item: MenuItem;
  setTitle: (title: string) => void;
  setIsSidebarOpen: () => void;
}

/**
 * Toggle de tema (light → dark → system → light). Persistido por ThemeProvider.
 * Mostrado al pie del sidebar como acción global de la app.
 */
function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const next: Record<Theme, Theme> = {
    light: "dark",
    dark: "system",
    system: "light",
  };

  const label: Record<Theme, string> = {
    light: "Modo claro",
    dark: "Modo oscuro",
    system: "Según el sistema",
  };

  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;

  return (
    <button
      type="button"
      onClick={() => setTheme(next[theme])}
      className="flex items-center gap-2.5 w-full h-[36px] px-3 rounded-lg transition-all duration-200 hover:bg-slate-800 text-[13px]"
      style={{ color: "#94A3B8" }}
      aria-label={`Tema: ${label[theme]}. Click para cambiar.`}
      title={`Tema: ${label[theme]}`}
    >
      <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
        <Icon className="h-4 w-4" />
      </span>
      <span className="flex-1 text-left truncate">{label[theme]}</span>
    </button>
  );
}

function SidebarItem({ item, setIsSidebarOpen, setTitle }: SidebarItemProps) {
  const location = useLocation();
  const isMobile = useIsMobile();
  const isActive = (route: string) => location.pathname === route;
  const active = isActive(item.route);
  const iconColor = active ? "#34D399" : "#94A3B8";

  useEffect(() => {
    if (active) {
      setTitle(getSidebarTitle(item.route));
    }
  }, [active, item.route, setTitle]);

  return (
    <Link
      to={item.route}
      className={`flex items-center w-full h-[36px] px-3 rounded-lg gap-2.5 transition-all duration-200 text-[13px] ${
        active ? "bg-slate-700/60 font-semibold" : "hover:bg-slate-800"
      } leading-5`}
      style={{ color: active ? "#34D399" : "#94A3B8" }}
      onClick={() => {
        setTitle(getSidebarTitle(item.route));
        if (isMobile) setIsSidebarOpen();
      }}
      // mouse + keyboard focus paridad: el handler de teclado replica el
      // hover para usuarios que navegan con Tab.
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.color = "#E2E8F0";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.color = "#94A3B8";
      }}
      onFocus={(e) => {
        if (!active) e.currentTarget.style.color = "#E2E8F0";
      }}
      onBlur={(e) => {
        if (!active) e.currentTarget.style.color = "#94A3B8";
      }}
    >
      <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
        {item.icon(iconColor)}
      </span>
      <span className="flex-1 truncate">{item.name}</span>
      {active && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />}
    </Link>
  );
}

interface SidebarSectionProps {
  /** Header de la sección (Operación, Análisis, Configuración, AI, Admin). */
  name: string;
  /** Rutas internas; si alguna matchea la URL actual, abrimos por default. */
  routes: string[];
  children: ReactNode;
}

/**
 * Sección colapsable del sidebar. Reemplaza el header plano `<span>` por un
 * botón con chevron que esconde/muestra los items internos. Persistido por nombre
 * en localStorage (mismo patrón que SidebarSubmenu). Por default abre si la
 * URL actual cae adentro de alguna de las rutas declaradas — así el usuario
 * nunca aterriza en una sección colapsada que oculta su página activa.
 */
function SidebarSection({ name, routes, children }: SidebarSectionProps) {
  const location = useLocation();
  const storageKey = `sidebar:section:${name}:open`;
  const [open, setOpen] = useState(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(storageKey) : null;
    if (stored !== null) return stored === "1";
    // Default: abrir si la URL actual entra en alguno de los routes; si no,
    // abrir igual (no esconder secciones al primer mount).
    return routes.some((route) => location.pathname.startsWith(route)) || true;
  });

  const toggleOpen = () => {
    setOpen((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(storageKey, next ? "1" : "0");
      } catch {
        // localStorage may be unavailable (private mode); ignore
      }
      return next;
    });
  };

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={toggleOpen}
        className="flex items-center justify-between w-full px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-all duration-200"
        aria-expanded={open}
      >
        <span
          className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: "#475569" }}
        >
          {name}
        </span>
        <ChevronDown
          size={12}
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          style={{ color: "#475569" }}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ${open ? "max-h-[1400px] opacity-100 mt-1" : "max-h-0 opacity-0"}`}
      >
        {children}
      </div>
    </div>
  );
}

const Sidebar: React.FC<SidebarProps> = ({ isSidebarOpen, setTitle, setIsSidebarOpen }) => {
  // Doble modo:
  //   mobile (<md): position:fixed, overlay sobre el contenido, slide-in/out via translate-x.
  //   desktop (≥md): inline flex-child, ancho expand/collapse via width.
  // El `md:` resetea las clases mobile (static, translate-x-0, w-64/w-0) para
  // que ambos comportamientos convivan sin JS condicional.
  const baseClasses =
    "bg-sidebar transition-all duration-300 ease-in-out fixed inset-y-0 left-0 z-drawer w-64 md:static md:translate-x-0 md:flex-shrink-0";
  const mobileTransform = isSidebarOpen ? "translate-x-0" : "-translate-x-full";
  const desktopWidth = isSidebarOpen
    ? "md:w-64 md:opacity-100"
    : "md:w-0 md:opacity-0 md:overflow-hidden";

  return (
    <aside
      id="logo-sidebar"
      className={`${baseClasses} ${mobileTransform} ${desktopWidth}`}
      aria-label="Sidebar"
      aria-hidden={!isSidebarOpen}
    >
      <div className="flex flex-col h-full pt-5 px-3 pb-4 gap-3 overflow-y-auto">
        {/* Logo */}
        <div className="flex items-center justify-between h-[36px] w-full px-2 mb-3">
          <Link
            to="/admin/dashboard"
            onClick={() => setTitle("Dashboard")}
            className="flex items-center gap-2.5"
            style={{ color: "#F1F5F9" }}
          >
            <img src="/ponti.svg" alt="Ponti" className="w-6 h-6 object-contain" />

            <h1
              className="text-xl font-semibold tracking-tight font-display"
              style={{ color: "#F1F5F9" }}
            >
              Ponti
            </h1>
          </Link>
          <button
            onClick={() => setIsSidebarOpen()}
            className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors duration-200"
            style={{ color: "#64748B" }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M6.75 2.625V15.375M12 11.25L9.75 9L12 6.75"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2.25 7.05C2.25 5.37 2.25 4.53 2.577 3.888C2.86462 3.32354 3.32354 2.86462 3.888 2.577C4.53 2.25 5.37 2.25 7.05 2.25H10.95C12.63 2.25 13.47 2.25 14.112 2.577C14.6765 2.86462 15.1354 3.32354 15.423 3.888C15.75 4.53 15.75 5.37 15.75 7.05V10.95C15.75 12.63 15.75 13.47 15.423 14.112C15.1354 14.6765 14.6765 15.1354 14.112 15.423C13.47 15.75 12.63 15.75 10.95 15.75H7.05C5.37 15.75 4.53 15.75 3.888 15.423C3.32354 15.1354 2.86462 14.6765 2.577 14.112C2.25 13.47 2.25 12.63 2.25 10.95V7.05Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <SidebarSection name="Operación" routes={menuItems.map((item) => item.route)}>
          <ul className="flex flex-col gap-0.5 font-medium">
            {visibleMenuItems.map((item) => (
              <li key={item.name}>
                <SidebarItem setTitle={setTitle} item={item} setIsSidebarOpen={setIsSidebarOpen} />
              </li>
            ))}
          </ul>
        </SidebarSection>

        <SidebarSection name="Informes" routes={menuReports.map((item) => item.route)}>
          <ul className="flex flex-col gap-0.5 font-medium">
            {menuReports.map((item) => (
              <li key={item.name}>
                <SidebarItem setTitle={setTitle} item={item} setIsSidebarOpen={setIsSidebarOpen} />
              </li>
            ))}
          </ul>
        </SidebarSection>

        <SidebarSection name="Administración" routes={menuDatabase.map((item) => item.route)}>
          <ul className="flex flex-col gap-0.5 font-medium">
            {menuDatabase.map((item) => (
              <li key={item.name}>
                <SidebarItem setTitle={setTitle} item={item} setIsSidebarOpen={setIsSidebarOpen} />
              </li>
            ))}
          </ul>
        </SidebarSection>

        <SidebarSection name="Copiloto" routes={menuAIItems.map((item) => item.route)}>
          <ul className="flex flex-col gap-0.5 font-medium">
            {menuAIItems.map((item) => (
              <li key={item.name}>
                <SidebarItem setTitle={setTitle} item={item} setIsSidebarOpen={setIsSidebarOpen} />
              </li>
            ))}
          </ul>
        </SidebarSection>

        <div className="border-t pt-3" style={{ borderColor: "#1E293B" }}>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
