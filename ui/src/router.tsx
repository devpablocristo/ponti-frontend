import { ProtectedLayout } from "./layout/ProtectedLayout";
import ErrorPage from "./pages/ErrorPage";
import { Navigate } from "react-router-dom";
import { BaseLayout } from "./layout/BaseLayout";
import SignInPage from "./pages/login/Login";
import { Dashboard } from "./pages/admin/dashboard/Dashboard";
import DashboardV2 from "./pages/admin/dashboard/DashboardV2";
import { Products } from "./pages/admin/products/Products";
import { Profile } from "./pages/admin/profile/Profile";
import { Tasks } from "./pages/admin/tasks/Tasks";
import { WorkOrders } from "./pages/admin/workorders/WorkOrders";
import { Stock } from "./pages/admin/stock/Stock";
import Customers from "./pages/admin/customers/Customers";
import Access from "./pages/admin/access/Access";
import DatabaseCustomers from "./pages/admin/database/customers/Customers";
import ArchivedCustomers from "./pages/admin/database/customers/ArchivedCustomers";
import ArchivedProjects from "./pages/admin/database/projects/ArchivedProjects";
import ArchivedInvestors from "./pages/admin/database/investors/ArchivedInvestors";
import InvestorsList from "./pages/admin/database/investors/InvestorsList";
import ArchivedLots from "./pages/admin/database/lots/ArchivedLots";
import ArchivedSupplies from "./pages/admin/database/supplies/ArchivedSupplies";
import ArchivedWorkOrders from "./pages/admin/database/work-orders/ArchivedWorkOrders";
import ArchivedFields from "./pages/admin/database/fields/ArchivedFields";
import ArchivedManagers from "./pages/admin/database/managers/ArchivedManagers";
import ArchivedCampaigns from "./pages/admin/database/campaigns/ArchivedCampaigns";
import DataIntegrity from "./pages/admin/database/data-integrity/Integrity";
import DatabaseTasksForm from "./pages/admin/database/tasks/TasksForm";
import Lots from "./pages/admin/lots/Lots";
import Items from "./pages/admin/database/products/Items";
import DollarForm from "./pages/admin/database/dollar/DollarForm";
import CommerceForm from "./pages/admin/database/commerce/CommerceForm";
import WorkspaceSelectorPage from "./pages/login/WorkspaceSelector";
import ListItems from "./pages/admin/database/products/List";
import ListTasks from "./pages/admin/database/tasks/List";
import ByFieldOrCropReport from "./pages/admin/reports/ByFieldOrCropReport.tsx";
import ByFieldOrCropReportV2 from "./pages/admin/reports/ByFieldOrCropReportV2.tsx";
import SummaryResultsReport from "./pages/admin/reports/SummaryResultsReport.tsx";
import SummaryResultsReportV2 from "./pages/admin/reports/SummaryResultsReportV2.tsx";
import InvestorContribution from "./pages/admin/reports/InvestorContributionReport.tsx";
import InvestorContributionV2 from "./pages/admin/reports/InvestorContributionReportV2.tsx";
import AIAssistant from "./pages/admin/ai-assistant/AIAssistant";
import Notifications from "./pages/admin/notifications/Notifications";

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
    element: <ProtectedLayout />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: "dashboard",
        element: <Dashboard />,
      },
      {
        path: "dashboard-v2",
        element: <DashboardV2 />,
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
        path: "customers",
        element: <Customers />,
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
        element: <DatabaseCustomers />,
      },
      {
        path: "database/customers/archived",
        element: <ArchivedCustomers />,
      },
      {
        path: "database/customers/:id",
        element: <DatabaseCustomers />,
      },
      {
        path: "database/projects/archived",
        element: <ArchivedProjects />,
      },
      {
        path: "database/investors",
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
        path: "database/fields/archived",
        element: <ArchivedFields />,
      },
      {
        path: "database/managers/archived",
        element: <ArchivedManagers />,
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
        element: <ListItems />,
      },
      {
        path: "database/tasks/list",
        element: <ListTasks />,
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
        path: "informes/aportes-v1",
        element: <InvestorContribution />,
      },
      {
        path: "informes/aportes-v2",
        element: <Navigate to="/admin/informes/aportes" replace />,
      },
      {
        path: "informes/resumen",
        element: <SummaryResultsReport />,
      },
      {
        path: "informes/resumen-v2",
        element: <SummaryResultsReportV2 />,
      },
      {
        path: "informes/campo",
        element: <ByFieldOrCropReport />,
      },
      {
        path: "informes/campo-v2",
        element: <ByFieldOrCropReportV2 />,
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
