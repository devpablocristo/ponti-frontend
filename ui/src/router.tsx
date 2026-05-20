import { ProtectedLayout } from "./layout/ProtectedLayout";
import ErrorPage from "./pages/ErrorPage";
import { Navigate } from "react-router-dom";
import { BaseLayout } from "./layout/BaseLayout";
import SignInPage from "./pages/login/Login";
import { Dashboard } from "./pages/admin/dashboard/Dashboard";
import { Products } from "./pages/admin/products/Products";
import { Profile } from "./pages/admin/profile/Profile";
import { Tasks } from "./pages/admin/tasks/Tasks";
import { WorkOrders } from "./pages/admin/workorders/WorkOrders";
import { Stock } from "./pages/admin/stock/Stock";
import Access from "./pages/admin/access/Access";
import CustomersList from "./pages/admin/database/customers/CustomersList";
import CustomerEditor from "./pages/admin/database/customers/CustomerEditor";
import ArchivedCustomers from "./pages/admin/database/customers/ArchivedCustomers";
import ArchivedProjects from "./pages/admin/database/projects/ArchivedProjects";
import ProjectsList from "./pages/admin/database/projects/ProjectsList";
import ArchivedInvestors from "./pages/admin/database/investors/ArchivedInvestors";
import InvestorsList from "./pages/admin/database/investors/InvestorsList";
import ArchivedLots from "./pages/admin/database/lots/ArchivedLots";
import ArchivedSupplies from "./pages/admin/database/supplies/ArchivedSupplies";
import ArchivedWorkOrders from "./pages/admin/database/work-orders/ArchivedWorkOrders";
import ArchivedFields from "./pages/admin/database/fields/ArchivedFields";
import FieldsList from "./pages/admin/database/fields/FieldsList";
import ArchivedManagers from "./pages/admin/database/managers/ArchivedManagers";
import ManagersList from "./pages/admin/database/managers/ManagersList";
import ArchivedCampaigns from "./pages/admin/database/campaigns/ArchivedCampaigns";
import CampaignsList from "./pages/admin/database/campaigns/CampaignsList";
import DataIntegrity from "./pages/admin/database/data-integrity/Integrity";
import DatabaseTasksForm from "./pages/admin/database/tasks/TasksForm";
import Lots from "./pages/admin/lots/Lots";
import Items from "./pages/admin/database/products/Items";
import DollarForm from "./pages/admin/database/dollar/DollarForm";
import CommerceForm from "./pages/admin/database/commerce/CommerceForm";
import ListItems from "./pages/admin/database/products/List";
import ListTasks from "./pages/admin/database/tasks/List";
import ArchivedTasks from "./pages/admin/database/tasks/ArchivedTasks";
import ByFieldOrCropReport from "./pages/admin/reports/ByFieldOrCropReport.tsx";
import SummaryResultsReport from "./pages/admin/reports/SummaryResultsReport.tsx";
import InvestorContributionV2 from "./pages/admin/reports/InvestorContributionReportV2.tsx";
import AIAssistant from "./pages/admin/ai-assistant/AIAssistant";
import Notifications from "./pages/admin/notifications/Notifications";
import ArchivedSupplyMovements from "./pages/admin/products/ArchivedSupplyMovements";
import ActorsList from "./pages/admin/database/actors/ActorsList";
import ArchivedActors from "./pages/admin/database/actors/ArchivedActors";
import DuplicateActors from "./pages/admin/database/actors/DuplicateActors";

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
        path: "lots",
        element: <Lots />,
      },
      {
        path: "products",
        element: <Products />,
      },
      {
        path: "tasks",
        element: <Tasks />,
      },
      {
        path: "stock",
        element: <Stock />,
      },
      {
        path: "work-orders",
        element: <WorkOrders />,
      },
      {
        path: "database/customers",
        element: <Navigate to="/admin/database/customers/editor" replace />,
      },
      {
        path: "database/actors",
        element: <ActorsList />,
      },
      {
        path: "database/actors/clientes",
        element: <ActorsList rolePreset="cliente" />,
      },
      {
        path: "database/actors/inversores",
        element: <ActorsList rolePreset="inversor" />,
      },
      {
        path: "database/actors/responsables",
        element: <ActorsList rolePreset="responsable" />,
      },
      {
        path: "database/actors/proveedores",
        element: <ActorsList rolePreset="proveedor" />,
      },
      {
        path: "database/actors/contratistas",
        element: <ActorsList rolePreset="contratista" />,
      },
      {
        path: "database/actors/duplicates",
        element: <DuplicateActors />,
      },
      {
        path: "database/actors/archived",
        element: <ArchivedActors />,
      },
      {
        path: "database/customers/list",
        element: <CustomersList />,
      },
      {
        path: "database/customers/archived",
        element: <ArchivedCustomers />,
      },
      {
        path: "database/customers/editor",
        element: <CustomerEditor />,
      },
      {
        path: "database/customers/:id/editor",
        element: <CustomerEditor />,
      },
      {
        path: "database/customers/:id",
        element: <Navigate to="editor" replace />,
      },
      {
        path: "database/projects",
        element: <ProjectsList />,
      },
      {
        path: "database/projects/archived",
        element: <ArchivedProjects />,
      },
      {
        path: "database/investors",
        element: <InvestorsList editorOnly />,
      },
      {
        path: "database/investors/create",
        element: <InvestorsList />,
      },
      {
        path: "database/investors/archived",
        element: <ArchivedInvestors />,
      },
      {
        path: "database/lots/archived",
        element: <ArchivedLots />,
      },
      {
        path: "database/supplies/archived",
        element: <ArchivedSupplies />,
      },
      {
        path: "database/work-orders/archived",
        element: <ArchivedWorkOrders />,
      },
      {
        path: "products/archived",
        element: <ArchivedSupplyMovements />,
      },
      {
        path: "database/fields",
        element: <FieldsList />,
      },
      {
        path: "database/fields/archived",
        element: <ArchivedFields />,
      },
      {
        path: "database/managers",
        element: <ManagersList editorOnly />,
      },
      {
        path: "database/managers/create",
        element: <ManagersList />,
      },
      {
        path: "database/managers/archived",
        element: <ArchivedManagers />,
      },
      {
        path: "database/campaigns",
        element: <CampaignsList editorOnly />,
      },
      {
        path: "database/campaigns/create",
        element: <CampaignsList />,
      },
      {
        path: "database/campaigns/archived",
        element: <ArchivedCampaigns />,
      },
      {
        path: "database/data-integrity",
        element: <DataIntegrity />,
      },
      {
        path: "database/tasks",
        element: <DatabaseTasksForm />,
      },
      {
        path: "database/items",
        element: <Items />,
      },
      {
        path: "database/items/list",
        element: <ListItems editorOnly />,
      },
      {
        path: "database/tasks/list",
        element: <ListTasks editorOnly />,
      },
      {
        path: "database/tasks/archived",
        element: <ArchivedTasks />,
      },
      {
        path: "database/dollar",
        element: <DollarForm />,
      },
      {
        path: "database/commerce",
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
