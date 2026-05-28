import { lazy } from "react";

import { ProtectedLayout } from "./layout/ProtectedLayout";
import ErrorPage from "./pages/ErrorPage";
import { Navigate } from "react-router-dom";
import { BaseLayout } from "./layout/BaseLayout";
import SignInPage from "./pages/login/Login";
import { Dashboard } from "./pages/admin/dashboard/Dashboard";
import { SupplyMovements as CurrentSupplyMovements } from "./pages/admin/supply-movements/SupplyMovements";
import { Profile } from "./pages/admin/profile/Profile";
import { Stock as CurrentStock } from "./pages/admin/stock/Stock";
import Access from "./pages/admin/access/Access";
import LegacyCustomers from "./pages/admin/customers/Customers";
import LegacyDatabaseCustomers from "./pages/admin/database/customers/Customers";
import LegacyArchivedCustomers from "./pages/admin/database/customers/ArchivedCustomers";
import LegacyArchivedProjects from "./pages/admin/database/projects/ArchivedProjects";
import CurrentProjectsList from "./pages/admin/master-data/customers/CustomersList";
import CurrentCustomerEditor from "./pages/admin/master-data/customers/CustomerEditor";
import CurrentArchivedCustomers from "./pages/admin/master-data/customers/ArchivedCustomers";
import CurrentArchivedProjects from "./pages/admin/master-data/projects/ArchivedProjects";
import GeneralEntities from "./pages/admin/master-data/entities/GeneralEntities";
import ArchivedInvestors from "./pages/admin/master-data/investors/ArchivedInvestors";
import InvestorsList from "./pages/admin/master-data/investors/InvestorsList";
import ArchivedLots from "./pages/admin/master-data/lots/ArchivedLots";
import ArchivedSupplies from "./pages/admin/master-data/supplies/ArchivedSupplies";
import ArchivedWorkOrders from "./pages/admin/master-data/work-orders/ArchivedWorkOrders";
import ArchivedFields from "./pages/admin/master-data/fields/ArchivedFields";
import FieldsList from "./pages/admin/master-data/fields/FieldsList";
import ArchivedManagers from "./pages/admin/master-data/managers/ArchivedManagers";
import ManagersList from "./pages/admin/master-data/managers/ManagersList";
import ArchivedCampaigns from "./pages/admin/master-data/campaigns/ArchivedCampaigns";
import CampaignsList from "./pages/admin/master-data/campaigns/CampaignsList";
import ArchivedCrops from "./pages/admin/master-data/crops/ArchivedCrops";
import CropsList from "./pages/admin/master-data/crops/CropsList";
import DataIntegrity from "./pages/admin/master-data/data-integrity/Integrity";
import DatabaseLaborsCatalog from "./pages/admin/master-data/labors/LaborsCatalog";
import SuppliesCatalog from "./pages/admin/master-data/supplies/SuppliesCatalog";
import LegacyDatabaseItems from "./pages/admin/database/products/Items";
import LegacyDatabaseTasksForm from "./pages/admin/database/tasks/TasksForm";
import DollarForm from "./pages/admin/master-data/dollar/DollarForm";
import CommerceForm from "./pages/admin/master-data/commerce/CommerceForm";
import ListSupplies from "./pages/admin/master-data/supplies/List";
import ListTasks from "./pages/admin/master-data/labors/List";
import ArchivedLabors from "./pages/admin/master-data/labors/ArchivedLabors";
import ByFieldOrCropReport from "./pages/admin/reports/ByFieldOrCropReport.tsx";
import InvestorContributionV2 from "./pages/admin/reports/InvestorContributionReportV2.tsx";

// Code-split de las 5 pantallas más pesadas que NO son consumidas también
// de forma estática por otras pages. CustomerEditor queda eager porque
// está embebido como drawer en Lots/CustomersList/FieldsList — un lazy
// allí no rinde chunk separado y solo agrega Suspense flicker.
// El fallback Suspense lo provee `ProtectedLayout` envolviendo el `<Outlet />`.
const CurrentWorkOrders = lazy(() =>
  import("./pages/admin/workorders/WorkOrders").then((m) => ({ default: m.WorkOrders }))
);
const LegacyWorkOrders = lazy(() =>
  import("./pages/admin/workorders/LegacyWorkOrders").then((m) => ({ default: m.WorkOrders }))
);
const CurrentLots = lazy(() => import("./pages/admin/lots/Lots"));
const LegacyLots = lazy(() => import("./pages/admin/lots/LegacyLots"));
const SummaryResultsReport = lazy(
  () => import("./pages/admin/reports/SummaryResultsReport.tsx")
);
const AIAssistant = lazy(() => import("./pages/admin/ai-assistant/AIAssistant"));
const CurrentLabors = lazy(() =>
  import("./pages/admin/tasks/Labors").then((m) => ({ default: m.Labors }))
);
const LegacyTasks = lazy(() =>
  import("./pages/admin/tasks/LegacyTasks").then((m) => ({ default: m.Tasks }))
);
const LegacySupplyMovements = lazy(() =>
  import("./pages/admin/supply-movements/LegacySupplyMovements").then((m) => ({
    default: m.Products,
  }))
);
const LegacyStock = lazy(() =>
  import("./pages/admin/stock/LegacyStock").then((m) => ({ default: m.Stock }))
);
import Notifications from "./pages/admin/notifications/Notifications";
import ArchivedSupplyMovements from "./pages/admin/supply-movements/ArchivedSupplyMovements";
import ActorsList from "./pages/admin/master-data/actors/ActorsList";
import ArchivedActors from "./pages/admin/master-data/actors/ArchivedActors";
import DuplicateActors from "./pages/admin/master-data/actors/DuplicateActors";

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
    element: <Navigate to="/admin/dashboard" replace />,
  },
  {
    path: "/admin",
    element: <ProtectedLayout />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: "dashboard",
        element: <Dashboard />,
      },
      {
        path: "ai-assistant",
        element: <AIAssistant />,
      },
      {
        path: "notifications",
        element: <Notifications />,
      },
      {
        path: "ai-insight-chat",
        element: <Navigate to="/admin/ai-assistant" />,
      },
      {
        path: "ai-insights",
        element: <Navigate to="/admin/notifications" />,
      },
      {
        path: "access",
        element: <Access />,
      },
      {
        path: "customers",
        element: <LegacyCustomers />,
      },
      {
        path: "projects",
        element: <Navigate to="/admin/projects/new" replace />,
      },
      {
        path: "projects/new",
        element: <CurrentProjectsList projectsOnly />,
      },
      {
        path: "lots",
        element: <LegacyLots />,
      },
      {
        path: "lots/new",
        element: <CurrentLots />,
      },
      {
        path: "supply-movements",
        element: <LegacySupplyMovements />,
      },
      {
        path: "supply-movements/new",
        element: <CurrentSupplyMovements />,
      },
      {
        path: "products",
        element: <Navigate to="/admin/supply-movements" replace />,
      },
      {
        path: "tasks",
        element: <LegacyTasks />,
      },
      {
        path: "tasks/new",
        element: <CurrentLabors />,
      },
      {
        path: "stock",
        element: <LegacyStock />,
      },
      {
        path: "stock/new",
        element: <CurrentStock />,
      },
      {
        path: "work-orders",
        element: <LegacyWorkOrders />,
      },
      {
        path: "work-orders/new",
        element: <CurrentWorkOrders />,
      },
      {
        path: "master-data/customers",
        element: <Navigate to="/admin/master-data/customers/editor" replace />,
      },
      {
        path: "master-data/entities",
        element: <GeneralEntities />,
      },
      {
        path: "master-data/actors",
        element: <ActorsList />,
      },
      {
        path: "master-data/actors/clientes",
        element: <ActorsList rolePreset="cliente" />,
      },
      {
        path: "master-data/actors/inversores",
        element: <ActorsList rolePreset="inversor" />,
      },
      {
        path: "master-data/actors/responsables",
        element: <ActorsList rolePreset="responsable" />,
      },
      {
        path: "master-data/actors/proveedores",
        element: <ActorsList rolePreset="proveedor" />,
      },
      {
        path: "master-data/actors/contratistas",
        element: <ActorsList rolePreset="contratista" />,
      },
      {
        path: "master-data/actors/duplicates",
        element: <DuplicateActors />,
      },
      {
        path: "master-data/actors/archived",
        element: <ArchivedActors />,
      },
      {
        path: "master-data/customers/list",
        element: <Navigate to="/admin/projects/new" replace />,
      },
      {
        path: "master-data/projects/list",
        element: <Navigate to="/admin/projects/new" replace />,
      },
      {
        path: "master-data/customers/archived",
        element: <CurrentArchivedCustomers />,
      },
      {
        path: "master-data/customers/editor",
        element: <CurrentCustomerEditor />,
      },
      {
        path: "master-data/customers/:id/editor",
        element: <CurrentCustomerEditor />,
      },
      {
        path: "master-data/customers/:id",
        element: <Navigate to="editor" replace />,
      },
      {
        path: "master-data/projects/archived",
        element: <CurrentArchivedProjects />,
      },
      {
        path: "database/customers",
        element: <LegacyDatabaseCustomers />,
      },
      {
        path: "database/customers/archived",
        element: <LegacyArchivedCustomers />,
      },
      {
        path: "database/customers/:id",
        element: <LegacyDatabaseCustomers />,
      },
      {
        path: "database/projects/archived",
        element: <LegacyArchivedProjects />,
      },
      {
        path: "master-data/investors",
        element: <InvestorsList editorOnly />,
      },
      {
        path: "master-data/investors/create",
        element: <InvestorsList />,
      },
      {
        path: "master-data/investors/archived",
        element: <ArchivedInvestors />,
      },
      {
        path: "master-data/lots/archived",
        element: <ArchivedLots />,
      },
      {
        path: "master-data/supplies/archived",
        element: <ArchivedSupplies />,
      },
      {
        path: "master-data/work-orders/archived",
        element: <ArchivedWorkOrders />,
      },
      {
        path: "supply-movements/archived",
        element: <ArchivedSupplyMovements />,
      },
      {
        path: "master-data/fields",
        element: <FieldsList />,
      },
      {
        path: "master-data/fields/archived",
        element: <ArchivedFields />,
      },
      {
        path: "master-data/managers",
        element: <ManagersList editorOnly />,
      },
      {
        path: "master-data/managers/create",
        element: <ManagersList />,
      },
      {
        path: "master-data/managers/archived",
        element: <ArchivedManagers />,
      },
      {
        path: "master-data/campaigns",
        element: <CampaignsList editorOnly />,
      },
      {
        path: "master-data/campaigns/create",
        element: <CampaignsList />,
      },
      {
        path: "master-data/campaigns/archived",
        element: <ArchivedCampaigns />,
      },
      {
        path: "master-data/crops",
        element: <CropsList />,
      },
      {
        path: "master-data/crops/archived",
        element: <ArchivedCrops />,
      },
      {
        path: "master-data/data-integrity",
        element: <DataIntegrity />,
      },
      {
        path: "master-data/labors",
        element: <DatabaseLaborsCatalog />,
      },
      {
        path: "database/tasks",
        element: <LegacyDatabaseTasksForm />,
      },
      {
        path: "master-data/supplies",
        element: <SuppliesCatalog />,
      },
      {
        path: "database/items",
        element: <LegacyDatabaseItems />,
      },
      {
        path: "master-data/supplies/list",
        element: <ListSupplies editorOnly />,
      },
      {
        path: "database/items/list",
        element: <Navigate to="/admin/master-data/supplies/list" replace />,
      },
      {
        path: "master-data/labors/list",
        element: <ListTasks editorOnly />,
      },
      {
        path: "database/tasks/list",
        element: <Navigate to="/admin/master-data/labors/list" replace />,
      },
      {
        path: "master-data/labors/archived",
        element: <ArchivedLabors />,
      },
      {
        path: "master-data/dollar",
        element: <DollarForm />,
      },
      {
        path: "master-data/commerce",
        element: <CommerceForm />,
      },
      {
        path: "profile",
        element: <Profile />,
      },
      {
        path: "informes/aportes",
        element: <InvestorContributionV2 />,
      },
      {
        path: "informes/resumen",
        element: <SummaryResultsReport />,
      },
      {
        path: "informes/campo",
        element: <ByFieldOrCropReport />,
      },
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
