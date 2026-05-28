import {
  BarChart3,
  Bell,
  Bot,
  CalendarRange,
  ChevronDown,
  ClipboardList,
  DollarSign,
  Folder,
  Home,
  Layers,
  Package,
  ShieldCheck,
  Sprout,
  Tag,
  Users,
  Warehouse,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

import { getSidebarTitle } from "./sidebarTitle";

type MenuItem = {
  name: string;
  icon: (color: string) => ReactNode;
  route: string;
};

const lucideIcon =
  (Icon: LucideIcon) =>
  (color: string): ReactNode => (
    <Icon size={20} strokeWidth={1.5} color={color} />
  );

const menuItems: MenuItem[] = [
  { name: "Dashboard", icon: lucideIcon(Home), route: "/admin/dashboard" },
  { name: "Proyectos", icon: lucideIcon(Folder), route: "/admin/customers" },
  { name: "Lotes", icon: lucideIcon(Layers), route: "/admin/lots" },
  {
    name: "Órdenes de Trabajo",
    icon: lucideIcon(ClipboardList),
    route: "/admin/work-orders",
  },
  { name: "Labores", icon: lucideIcon(Wrench), route: "/admin/tasks" },
  { name: "Insumos", icon: lucideIcon(Sprout), route: "/admin/products" },
  { name: "Stock", icon: lucideIcon(Warehouse), route: "/admin/stock" },
];

const menuReports: MenuItem[] = [
  {
    name: "Integridad de Datos",
    icon: lucideIcon(ShieldCheck),
    route: "/admin/database/data-integrity",
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
    name: "Administrar Clientes",
    icon: lucideIcon(Users),
    route: "/admin/database/customers",
  },
  {
    name: "Crear Labor",
    icon: lucideIcon(CalendarRange),
    route: "/admin/database/tasks",
  },
  {
    name: "Crear Insumo",
    icon: lucideIcon(Package),
    route: "/admin/database/items",
  },
  {
    name: "Cargar Dólar Promedio",
    icon: lucideIcon(DollarSign),
    route: "/admin/database/dollar",
  },
  {
    name: "Cargar Comercialización",
    icon: lucideIcon(Tag),
    route: "/admin/database/commerce",
  },
];

const menuCopilot: MenuItem[] = [
  { name: "Asistente", icon: lucideIcon(Bot), route: "/admin/ai-assistant" },
  { name: "Notificaciones", icon: lucideIcon(Bell), route: "/admin/notifications" },
];

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

function isRouteActive(pathname: string, route: string) {
  if (pathname === route) return true;
  return route === "/admin/database/customers" && pathname.startsWith(`${route}/`);
}

function SidebarItem({ item, setIsSidebarOpen, setTitle }: SidebarItemProps) {
  const location = useLocation();
  const active = isRouteActive(location.pathname, item.route);
  const iconColor = active ? "#34D399" : "#94A3B8";

  useEffect(() => {
    if (active) {
      setTitle(getSidebarTitle(location.pathname));
    }
  }, [active, location.pathname, setTitle]);

  return (
    <Link
      to={item.route}
      className={`flex h-[36px] w-full items-center gap-2.5 rounded-lg px-3 text-[13px] leading-5 transition-all duration-200 ${
        active ? "bg-slate-700/60 font-semibold" : "hover:bg-slate-800"
      }`}
      style={{ color: active ? "#34D399" : "#94A3B8" }}
      onClick={() => {
        setTitle(getSidebarTitle(item.route));
        if (window.innerWidth < 768) setIsSidebarOpen();
      }}
      onMouseEnter={(event) => {
        if (!active) event.currentTarget.style.color = "#E2E8F0";
      }}
      onMouseLeave={(event) => {
        if (!active) event.currentTarget.style.color = "#94A3B8";
      }}
      onFocus={(event) => {
        if (!active) event.currentTarget.style.color = "#E2E8F0";
      }}
      onBlur={(event) => {
        if (!active) event.currentTarget.style.color = "#94A3B8";
      }}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">
        {item.icon(iconColor)}
      </span>
      <span className="flex-1 truncate">{item.name}</span>
      {active ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" /> : null}
    </Link>
  );
}

function SidebarSection({
  name,
  routes,
  children,
}: {
  name: string;
  routes: string[];
  children: ReactNode;
}) {
  const location = useLocation();
  const storageKey = `sidebar:section:${name}:open`;
  const [open, setOpen] = useState(() => {
    const stored =
      typeof window !== "undefined" ? window.localStorage.getItem(storageKey) : null;
    if (stored !== null) return stored === "1";
    return routes.some((route) => isRouteActive(location.pathname, route)) || true;
  });

  const toggleOpen = () => {
    setOpen((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(storageKey, next ? "1" : "0");
      } catch {
        // Ignore storage failures; the menu still works for this session.
      }
      return next;
    });
  };

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={toggleOpen}
        className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 transition-all duration-200 hover:bg-slate-800"
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
        className={`overflow-hidden transition-all duration-200 ${
          open ? "mt-1 max-h-[1200px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function SidebarList({
  items,
  setTitle,
  setIsSidebarOpen,
}: {
  items: MenuItem[];
  setTitle: (title: string) => void;
  setIsSidebarOpen: () => void;
}) {
  return (
    <ul className="flex flex-col gap-0.5 font-medium">
      {items.map((item) => (
        <li key={item.name}>
          <SidebarItem
            item={item}
            setTitle={setTitle}
            setIsSidebarOpen={setIsSidebarOpen}
          />
        </li>
      ))}
    </ul>
  );
}

const Sidebar: React.FC<SidebarProps> = ({
  isSidebarOpen,
  setTitle,
  setIsSidebarOpen,
}) => {
  const baseClasses =
    "fixed inset-y-0 left-0 z-40 w-64 bg-sidebar transition-all duration-300 ease-in-out md:static md:translate-x-0 md:flex-shrink-0";
  const mobileTransform = isSidebarOpen ? "translate-x-0" : "-translate-x-full";
  const desktopWidth = isSidebarOpen
    ? "md:w-64 md:opacity-100"
    : "md:w-0 md:overflow-hidden md:opacity-0";

  return (
    <aside
      id="logo-sidebar"
      className={`${baseClasses} ${mobileTransform} ${desktopWidth}`}
      aria-label="Sidebar"
      aria-hidden={!isSidebarOpen}
    >
      <div className="flex h-full flex-col gap-3 overflow-y-auto px-3 pb-4 pt-5">
        <div className="mb-3 flex h-[36px] w-full items-center justify-between px-2">
          <Link
            to="/admin/dashboard"
            onClick={() => setTitle("Dashboard")}
            className="flex items-center gap-2.5"
            style={{ color: "#F1F5F9" }}
          >
            <img src="/ponti.svg" alt="Ponti" className="h-6 w-6 object-contain" />
            <h1
              className="font-display text-xl font-semibold tracking-tight"
              style={{ color: "#F1F5F9" }}
            >
              Ponti
            </h1>
          </Link>
          <button
            type="button"
            onClick={() => setIsSidebarOpen()}
            className="rounded-lg p-1.5 transition-colors duration-200 hover:bg-slate-800"
            style={{ color: "#64748B" }}
            aria-label="Cerrar menú"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6.75 2.625V15.375M12 11.25L9.75 9L12 6.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2.25 7.05C2.25 5.37 2.25 4.53 2.577 3.888C2.86462 3.32354 3.32354 2.86462 3.888 2.577C4.53 2.25 5.37 2.25 7.05 2.25H10.95C12.63 2.25 13.47 2.25 14.112 2.577C14.6765 2.86462 15.1354 3.32354 15.423 3.888C15.75 4.53 15.75 5.37 15.75 7.05V10.95C15.75 12.63 15.75 13.47 15.423 14.112C15.1354 14.6765 14.6765 15.1354 14.112 15.423C13.47 15.75 12.63 15.75 10.95 15.75H7.05C5.37 15.75 4.53 15.75 3.888 15.423C3.32354 15.1354 2.86462 14.6765 2.577 14.112C2.25 13.47 2.25 12.63 2.25 10.95V7.05Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <SidebarSection name="Operación" routes={menuItems.map((item) => item.route)}>
          <SidebarList items={menuItems} setTitle={setTitle} setIsSidebarOpen={setIsSidebarOpen} />
        </SidebarSection>

        <SidebarSection name="Informes" routes={menuReports.map((item) => item.route)}>
          <SidebarList items={menuReports} setTitle={setTitle} setIsSidebarOpen={setIsSidebarOpen} />
        </SidebarSection>

        <SidebarSection name="Configuración" routes={menuDatabase.map((item) => item.route)}>
          <SidebarList items={menuDatabase} setTitle={setTitle} setIsSidebarOpen={setIsSidebarOpen} />
        </SidebarSection>

        <SidebarSection name="Copiloto" routes={menuCopilot.map((item) => item.route)}>
          <SidebarList items={menuCopilot} setTitle={setTitle} setIsSidebarOpen={setIsSidebarOpen} />
        </SidebarSection>
      </div>
    </aside>
  );
};

export default Sidebar;
