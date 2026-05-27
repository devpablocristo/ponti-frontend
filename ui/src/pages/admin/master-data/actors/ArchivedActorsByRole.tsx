import ArchivedCustomers from "../customers/ArchivedCustomers";
import ArchivedInvestors from "../investors/ArchivedInvestors";
import ArchivedManagers from "../managers/ArchivedManagers";
import ArchivedActors, { type ActorListFilters } from "./ArchivedActors";

type ArchivedActorsByRoleProps = {
  filters: ActorListFilters;
  onAfterRestore?: () => void | Promise<void>;
};

export default function ArchivedActorsByRole({
  filters,
  onAfterRestore,
}: ArchivedActorsByRoleProps) {
  const handleAfterRestore = () => {
    void onAfterRestore?.();
  };

  switch (filters.role) {
    case "cliente":
      return <ArchivedCustomers onAfterRestore={handleAfterRestore} />;
    case "responsable":
      return <ArchivedManagers onAfterRestore={handleAfterRestore} />;
    case "inversor":
      return <ArchivedInvestors onAfterRestore={handleAfterRestore} />;
    default:
      return <ArchivedActors filters={filters} onAfterRestore={handleAfterRestore} />;
  }
}
