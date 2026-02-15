import { lazy, Suspense } from "react";
import { ProtectedLayout } from "./layout/ProtectedLayout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import ErrorPage from "./pages/ErrorPage";
import { Navigate } from "react-router-dom";
import { BaseLayout } from "./layout/BaseLayout";
import LoadingScreen from "./components/LoadingScreen/LoadingScreen";

/* ------------------------------------------------------------------ */
/*  Lazy-loaded pages — each chunk is downloaded only when visited     */
/* ------------------------------------------------------------------ */

// Auth (kept eager — always needed on first load)
import SignInPage from "./pages/login/Login";
import WorkspaceSelectorPage from "./pages/login/WorkspaceSelector";

// Core pages
const Dashboard = lazy(() => import("./pages/admin/dashboard/Dashboard").then(m => ({ default: m.Dashboard })));
const Products = lazy(() => import("./pages/admin/products/Products").then(m => ({ default: m.Products })));
const Tasks = lazy(() => import("./pages/admin/tasks/Tasks").then(m => ({ default: m.Tasks })));
const WorkOrders = lazy(() => import("./pages/admin/workorders/WorkOrders").then(m => ({ default: m.WorkOrders })));
const Stock = lazy(() => import("./pages/admin/stock/Stock").then(m => ({ default: m.Stock })));
const Lots = lazy(() => import("./pages/admin/lots/Lots"));
const Customers = lazy(() => import("./pages/admin/customers/Customers"));

// Database pages
const DatabaseCustomers = lazy(() => import("./pages/admin/database/customers/Customers"));
const ArchivedCustomers = lazy(() => import("./pages/admin/database/customers/ArchivedCustomers"));
const ArchivedProjects = lazy(() => import("./pages/admin/database/projects/ArchivedProjects"));
const DataIntegrity = lazy(() => import("./pages/admin/database/data-integrity/Integrity"));
const DatabaseTasksForm = lazy(() => import("./pages/admin/database/tasks/TasksForm"));
const Items = lazy(() => import("./pages/admin/database/products/Items"));
const ListItems = lazy(() => import("./pages/admin/database/products/List"));
const ListTasks = lazy(() => import("./pages/admin/database/tasks/List"));
const DollarForm = lazy(() => import("./pages/admin/database/dollar/DollarForm"));
const CommerceForm = lazy(() => import("./pages/admin/database/commerce/CommerceForm"));

// Users
const Users = lazy(() => import("./pages/admin/users/Users").then(m => ({ default: m.Users })));
const FormUser = lazy(() => import("./pages/admin/users/FormUser").then(m => ({ default: m.FormUser })));
const Profile = lazy(() => import("./pages/admin/profile/Profile").then(m => ({ default: m.Profile })));

// Reports
const ByFieldOrCropReport = lazy(() => import("./pages/admin/reports/ByFieldOrCropReport"));
const SummaryResultsReport = lazy(() => import("./pages/admin/reports/SummaryResultsReport"));
const InvestorContribution = lazy(() => import("./pages/admin/reports/InvestorContributionReport"));

// AI
const AICopilot = lazy(() => import("./pages/admin/ai-copilot/AICopilot"));
const AIInsights = lazy(() => import("./pages/admin/ai-insights/AIInsights"));

/* ------------------------------------------------------------------ */
/*  Suspense wrapper                                                   */
/* ------------------------------------------------------------------ */

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingScreen />}>{children}</Suspense>;
}

/* ------------------------------------------------------------------ */
/*  Routes                                                             */
/* ------------------------------------------------------------------ */

export default [
  {
    path: "",
    element: <Navigate to="/admin" />,
    errorElement: <ErrorPage />,
  },
  {
    path: "login",
    element: (
      <BaseLayout>
        <SignInPage />
      </BaseLayout>
    ),
  },
  {
    path: "workspace",
    element: (
      <BaseLayout>
        <WorkspaceSelectorPage />
      </BaseLayout>
    ),
  },
  {
    path: "/admin",
    element: (
      <ErrorBoundary>
        <ProtectedLayout />
      </ErrorBoundary>
    ),
    errorElement: <ErrorPage />,
    children: [
      { path: "dashboard", element: <Lazy><Dashboard /></Lazy> },
      { path: "ai-copilot", element: <Lazy><AICopilot /></Lazy> },
      { path: "ai-insights", element: <Lazy><AIInsights /></Lazy> },
      { path: "customers", element: <Lazy><Customers /></Lazy> },
      { path: "lots", element: <Lazy><Lots /></Lazy> },
      { path: "products", element: <Lazy><Products /></Lazy> },
      { path: "tasks", element: <Lazy><Tasks /></Lazy> },
      { path: "stock", element: <Lazy><Stock /></Lazy> },
      { path: "work-orders", element: <Lazy><WorkOrders /></Lazy> },
      { path: "database/customers", element: <Lazy><DatabaseCustomers /></Lazy> },
      { path: "database/customers/archived", element: <Lazy><ArchivedCustomers /></Lazy> },
      { path: "database/customers/:id", element: <Lazy><DatabaseCustomers /></Lazy> },
      { path: "database/projects/archived", element: <Lazy><ArchivedProjects /></Lazy> },
      { path: "database/data-integrity", element: <Lazy><DataIntegrity /></Lazy> },
      { path: "database/tasks", element: <Lazy><DatabaseTasksForm /></Lazy> },
      { path: "database/items", element: <Lazy><Items /></Lazy> },
      { path: "database/items/list", element: <Lazy><ListItems /></Lazy> },
      { path: "database/tasks/list", element: <Lazy><ListTasks /></Lazy> },
      { path: "database/dollar", element: <Lazy><DollarForm /></Lazy> },
      { path: "database/commerce", element: <Lazy><CommerceForm /></Lazy> },
      { path: "users", element: <Lazy><Users /></Lazy> },
      { path: "users/new", element: <Lazy><FormUser /></Lazy> },
      { path: "users/edit/:id", element: <Lazy><FormUser /></Lazy> },
      { path: "profile", element: <Lazy><Profile /></Lazy> },
      { path: "informes/aportes", element: <Lazy><InvestorContribution /></Lazy> },
      { path: "informes/resumen", element: <Lazy><SummaryResultsReport /></Lazy> },
      { path: "informes/campo", element: <Lazy><ByFieldOrCropReport /></Lazy> },
      {
        path: "",
        element: <Navigate to="/admin/dashboard" />,
        errorElement: <ErrorPage />,
      },
      {
        path: "*",
        element: <Navigate to="/admin/dashboard" />,
        errorElement: <ErrorPage />,
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/admin/dashboard" />,
    errorElement: <ErrorPage />,
  },
];
