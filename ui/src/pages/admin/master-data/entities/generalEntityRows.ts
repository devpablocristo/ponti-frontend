import type { Actor, ActorRole } from "../../../../hooks/useActors";
import type { Campaign } from "../../../../hooks/useCampaigns";
import type { Crop } from "../../../../hooks/useCrops";
import type { CustomerData } from "../../../../hooks/useCustomers/types";
import type {
  Project,
  ProjectData,
} from "../../../../hooks/useDatabase/projects/types";
import type { Data as Field } from "../../../../hooks/useFields/types";
import type { LotsData } from "../../../../hooks/useLots/types";
import type { Data as Provider } from "../../../../hooks/useProviders/types";
import type { SupplyMovement } from "../../../../hooks/useSupplyMovements/types";

export type GeneralEntityTableView =
  | "customer"
  | "project"
  | "investor"
  | "campaign"
  | "provider"
  | "manager"
  | "tenant"
  | "field"
  | "lot"
  | "crop";

export type GeneralEntityKind =
  | "customer"
  | "project"
  | "actor"
  | "campaign"
  | "field"
  | "lot"
  | "crop";

export type GeneralEntityFilters = Partial<Record<GeneralEntityTableView, string>>;

export type GeneralEntityRow = {
  id: string;
  entityKind: GeneralEntityKind;
  view: GeneralEntityTableView;
  sourceId: number;
  name: string;
  typeLabel: string;
  roles: ActorRole[];
  customerId?: number | null;
  projectId?: number | null;
  campaignId?: number | null;
  fieldId?: number | null;
  lotId?: number | null;
  filterValues: Record<GeneralEntityTableView, string[]>;
};

export type BuildGeneralEntityRowsInput = {
  customers: CustomerData[];
  projects: ProjectData[];
  projectDetails: Record<number, Project>;
  actors: Actor[];
  campaigns: Campaign[];
  fields: Field[];
  lots: LotsData[];
  crops: Crop[];
  providers?: Provider[];
  supplyMovements?: SupplyMovement[];
};

const EMPTY_VALUES: Record<GeneralEntityTableView, string[]> = {
  customer: [],
  project: [],
  investor: [],
  campaign: [],
  provider: [],
  manager: [],
  tenant: [],
  field: [],
  lot: [],
  crop: [],
};

export const filterOrder: GeneralEntityTableView[] = [
  "customer",
  "project",
  "investor",
  "campaign",
  "provider",
  "manager",
  "tenant",
  "field",
  "lot",
  "crop",
];

export const actorRoleByView: Partial<Record<GeneralEntityTableView, ActorRole>> = {
  customer: "cliente",
  investor: "inversor",
  provider: "proveedor",
  manager: "responsable",
  tenant: "arrendatario",
};

export const viewLabel: Record<GeneralEntityTableView, string> = {
  customer: "clientes",
  project: "proyectos",
  investor: "inversores",
  campaign: "campañas",
  provider: "proveedores",
  manager: "responsables",
  tenant: "arrendatarios",
  field: "campos",
  lot: "lotes",
  crop: "cultivos",
};

export const viewSingularLabel: Record<GeneralEntityTableView, string> = {
  customer: "Cliente",
  project: "Proyecto",
  investor: "Inversor",
  campaign: "Campaña",
  provider: "Proveedor",
  manager: "Responsable",
  tenant: "Arrendatario",
  field: "Campo",
  lot: "Lote",
  crop: "Cultivo",
};

export function normalizeGeneralEntityValue(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9ñÑ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function generalEntityValueMatches(value: unknown, selected: unknown) {
  const normalizedValue = normalizeGeneralEntityValue(value);
  const normalizedSelected = normalizeGeneralEntityValue(selected);
  if (!normalizedSelected) return true;
  if (!normalizedValue) return false;
  if (normalizedValue === normalizedSelected) return true;

  const index = normalizedValue.indexOf(normalizedSelected);
  if (index < 0) return false;

  const nextChar = normalizedValue[index + normalizedSelected.length] ?? "";
  if (/\d$/.test(normalizedSelected) && /[a-z0-9ñ]/i.test(nextChar)) return false;
  return true;
}

function sameName(left: unknown, right: unknown) {
  const a = normalizeGeneralEntityValue(left);
  const b = normalizeGeneralEntityValue(right);
  return Boolean(a && b && a === b);
}

function numberOrNull(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function addValue(values: string[], value: unknown) {
  const next = String(value ?? "").trim();
  if (next) values.push(next);
}

function unique(values: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  values.forEach((value) => {
    const normalized = normalizeGeneralEntityValue(value);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    out.push(value.trim());
  });
  return out;
}

function makeValues(input: Partial<Record<GeneralEntityTableView, string[]>>) {
  return Object.fromEntries(
    filterOrder.map((key) => [key, unique(input[key] ?? [])]),
  ) as Record<GeneralEntityTableView, string[]>;
}

function makeRow(row: Omit<GeneralEntityRow, "filterValues"> & {
  filterValues?: Partial<Record<GeneralEntityTableView, string[]>>;
}): GeneralEntityRow {
  const ownValue =
    row.entityKind === "actor" ? {} : { [row.view]: [row.name] };

  return {
    ...row,
    filterValues: makeValues({
      ...EMPTY_VALUES,
      ...ownValue,
      ...row.filterValues,
    }),
  };
}

function actorEntryMatches(
  actor: Pick<Actor, "id" | "display_name">,
  entry: { actor_id?: number | null; name?: string | null; id?: number | null },
) {
  return numberOrNull(entry.actor_id) === actor.id || sameName(actor.display_name, entry.name);
}

function parseProjectActorNames(raw: unknown) {
  return String(raw ?? "")
    .split(/[,;]+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function parseProjectInvestorNames(raw: unknown) {
  return parseProjectActorNames(raw).map((entry) =>
    entry
      .replace(/\s*[-–—]\s*\d+(?:[.,]\d+)?\s*%.*$/u, "")
      .replace(/\s+\d+(?:[.,]\d+)?\s*%.*$/u, "")
      .trim(),
  );
}

function movementProjectIds(movement: SupplyMovement) {
  return [
    movement.project_id,
    movement.origin_project_id,
    movement.destination_project_id,
  ]
    .map(numberOrNull)
    .filter((value): value is number => value !== null);
}

function lotCropNames(lot: Pick<LotsData, "current_crop" | "previous_crop">) {
  return unique([lot.current_crop, lot.previous_crop].filter(Boolean));
}

function projectDetailField(detail: Project | undefined, fieldId?: number | null, fieldName?: string | null) {
  return (detail?.fields ?? []).find(
    (field) => field.id === fieldId || sameName(field.name, fieldName),
  );
}

function fieldTenantNames(field: Project["fields"][number] | undefined) {
  return unique((field?.investors ?? []).map((entry) => entry.name));
}

function projectTenantEntries(detail: Project | undefined) {
  return (detail?.fields ?? []).flatMap((field) =>
    (field.investors ?? []).map((entry) => ({ field, entry })),
  );
}

function contextForInput(input: BuildGeneralEntityRowsInput) {
  const customersById = new Map(input.customers.map((customer) => [customer.id, customer]));
  const campaignsById = new Map(input.campaigns.map((campaign) => [campaign.id, campaign]));
  const projectsById = new Map(input.projects.map((project) => [project.id, project]));
  const fieldsById = new Map(input.fields.map((field) => [field.id, field]));
  const lotsByProject = new Map<number, LotsData[]>();
  const lotsByField = new Map<number, LotsData[]>();

  input.lots.forEach((lot) => {
    lotsByProject.set(lot.project_id, [...(lotsByProject.get(lot.project_id) ?? []), lot]);
    lotsByField.set(lot.field_id, [...(lotsByField.get(lot.field_id) ?? []), lot]);
  });

  const contextForProject = (project: ProjectData) => {
    const detail = input.projectDetails[project.id];
    const customerId = numberOrNull(detail?.customer.id);
    const customerName =
      detail?.customer.name || (customerId ? customersById.get(customerId)?.name : "") || project.customer;
    const campaignId = numberOrNull(detail?.campaign.id);
    const campaignName =
      detail?.campaign.name || (campaignId ? campaignsById.get(campaignId)?.name : "") || project.campaign;
    const lots = lotsByProject.get(project.id) ?? [];
    const providers = unique(
      (input.supplyMovements ?? [])
        .filter((movement) => movementProjectIds(movement).includes(project.id))
        .map((movement) => movement.provider_name),
    );

    return {
      detail,
      project,
      customerId,
      customerName,
      campaignId,
      campaignName,
      managers: unique([
        ...(detail?.managers ?? []).map((entry) => entry.name),
        ...parseProjectActorNames(project.managers),
      ]),
      investors: unique([
        ...(detail?.investors ?? []).map((entry) => entry.name),
        ...(detail?.admin_cost_investors ?? []).map((entry) => entry.name),
        ...parseProjectInvestorNames(project.investors),
      ]),
      providers,
      tenants: unique(projectTenantEntries(detail).map(({ entry }) => entry.name)),
      fields: unique([
        ...(detail?.fields ?? []).map((field) => field.name),
        ...(project.fields ?? []).map((field) => field.name),
        ...input.fields.filter((field) => field.project_id === project.id).map((field) => field.name),
      ]),
      lots,
      crops: unique(lots.flatMap(lotCropNames)),
    };
  };

  const contextForLot = (lot: LotsData) => {
    const project = projectsById.get(lot.project_id);
    const projectFallback: ProjectData = project ?? {
      id: lot.project_id,
      name: lot.project_name,
      customer: "",
      campaign: "",
      managers: "",
      investors: "",
      fields: [],
    };
    const projectContext = contextForProject(projectFallback);
    const fieldDetail = projectDetailField(projectContext.detail, lot.field_id, lot.field_name);
    return {
      ...projectContext,
      project: projectFallback,
      fieldName: fieldsById.get(lot.field_id)?.name || lot.field_name,
      tenants: fieldTenantNames(fieldDetail),
      crops: lotCropNames(lot),
    };
  };

  return { projectsById, lotsByField, contextForProject, contextForLot };
}

export function buildGeneralEntityRows(input: BuildGeneralEntityRowsInput): GeneralEntityRow[] {
  const ctx = contextForInput(input);
  const rows: GeneralEntityRow[] = [];

  input.customers.forEach((customer) => {
    const related = input.projects.map(ctx.contextForProject).filter((context) =>
      context.customerId === customer.id || sameName(context.customerName, customer.name),
    );
    rows.push(makeRow({
      id: `customer-${customer.id}`,
      entityKind: "customer",
      view: "customer",
      sourceId: customer.id,
      name: customer.name,
      typeLabel: "Cliente / Sociedad",
      roles: [],
      customerId: customer.id,
      filterValues: {
        customer: [customer.name],
        project: related.map((context) => context.project.name),
        investor: related.flatMap((context) => context.investors),
        campaign: related.map((context) => context.campaignName),
        provider: related.flatMap((context) => context.providers),
        manager: related.flatMap((context) => context.managers),
        tenant: related.flatMap((context) => context.tenants),
        field: related.flatMap((context) => context.fields),
        lot: related.flatMap((context) => context.lots.map((lot) => lot.lot_name)),
        crop: related.flatMap((context) => context.crops),
      },
    }));
  });

  input.projects.forEach((project) => {
    const context = ctx.contextForProject(project);
    rows.push(makeRow({
      id: `project-${project.id}`,
      entityKind: "project",
      view: "project",
      sourceId: project.id,
      name: project.name,
      typeLabel: "Proyecto",
      roles: [],
      customerId: context.customerId,
      projectId: project.id,
      campaignId: context.campaignId,
      filterValues: {
        customer: [context.customerName],
        project: [project.name],
        investor: context.investors,
        campaign: [context.campaignName],
        provider: context.providers,
        manager: context.managers,
        tenant: context.tenants,
        field: context.fields,
        lot: context.lots.map((lot) => lot.lot_name),
        crop: context.crops,
      },
    }));
  });

  const actorProviderNames = (actor: Actor) =>
    unique([
      ...(actor.roles.includes("proveedor") ? [actor.display_name] : []),
      ...(input.providers ?? []).filter((provider) => sameName(provider.name, actor.display_name)).map((provider) => provider.name),
    ]);

  input.actors.forEach((actor) => {
    const filterValues: Partial<Record<GeneralEntityTableView, string[]>> = {};
    const roles = new Set<ActorRole>(actor.roles);
    const addContext = (context: ReturnType<typeof ctx.contextForProject>) => {
      addValue(filterValues.customer ??= [], context.customerName);
      addValue(filterValues.project ??= [], context.project.name);
      addValue(filterValues.campaign ??= [], context.campaignName);
      context.investors.forEach((value) => addValue(filterValues.investor ??= [], value));
      context.providers.forEach((value) => addValue(filterValues.provider ??= [], value));
      context.managers.forEach((value) => addValue(filterValues.manager ??= [], value));
      context.tenants.forEach((value) => addValue(filterValues.tenant ??= [], value));
      context.fields.forEach((value) => addValue(filterValues.field ??= [], value));
      context.lots.forEach((lot) => addValue(filterValues.lot ??= [], lot.lot_name));
      context.crops.forEach((value) => addValue(filterValues.crop ??= [], value));
    };

    input.customers.forEach((customer) => {
      if (customer.actor_id === actor.id) {
        roles.add("cliente");
        addValue(filterValues.customer ??= [], customer.name);
      }
    });

    input.projects.forEach((project) => {
      const context = ctx.contextForProject(project);
      const detail = context.detail;
      let matched = false;
      if (detail?.customer && actorEntryMatches(actor, detail.customer)) {
        roles.add("cliente");
        matched = true;
      }
      (detail?.managers ?? []).forEach((entry) => {
        if (actorEntryMatches(actor, entry)) {
          roles.add("responsable");
          addValue(filterValues.manager ??= [], entry.name);
          matched = true;
        }
      });
      [...(detail?.investors ?? []), ...(detail?.admin_cost_investors ?? [])].forEach((entry) => {
        if (actorEntryMatches(actor, entry)) {
          roles.add("inversor");
          addValue(filterValues.investor ??= [], entry.name);
          matched = true;
        }
      });
      projectTenantEntries(detail).forEach(({ entry }) => {
        if (actorEntryMatches(actor, entry)) {
          roles.add("arrendatario");
          addValue(filterValues.tenant ??= [], entry.name);
          matched = true;
        }
      });
      if (matched) addContext(context);
    });

    const providerNames = actorProviderNames(actor);
    if (providerNames.length > 0) {
      roles.add("proveedor");
      providerNames.forEach((name) => addValue(filterValues.provider ??= [], name));
      (input.supplyMovements ?? []).forEach((movement) => {
        if (!providerNames.some((name) => sameName(name, movement.provider_name))) return;
        movementProjectIds(movement).forEach((projectId) => {
          const project = ctx.projectsById.get(projectId);
          if (project) addContext(ctx.contextForProject(project));
        });
      });
    }

    if (roles.has("cliente")) addValue(filterValues.customer ??= [], actor.display_name);
    if (roles.has("inversor")) addValue(filterValues.investor ??= [], actor.display_name);
    if (roles.has("proveedor")) addValue(filterValues.provider ??= [], actor.display_name);
    if (roles.has("responsable")) addValue(filterValues.manager ??= [], actor.display_name);
    if (roles.has("arrendatario")) addValue(filterValues.tenant ??= [], actor.display_name);

    if (roles.size === 0 && Object.values(filterValues).every((values) => values.length === 0)) return;

    rows.push(makeRow({
      id: `actor-${actor.id}`,
      entityKind: "actor",
      view: "investor",
      sourceId: actor.id,
      name: actor.display_name,
      typeLabel: actor.actor_kind === "organization" ? "Empresa / Sociedad" : "Actor",
      roles: Array.from(roles),
      filterValues,
    }));
  });

  const coveredProviders = new Set(
    rows
      .filter((row) => row.roles.includes("proveedor"))
      .flatMap((row) => row.filterValues.provider)
      .map(normalizeGeneralEntityValue),
  );
  const providerNames = unique([
    ...(input.providers ?? []).map((provider) => provider.name),
    ...(input.supplyMovements ?? []).map((movement) => movement.provider_name),
  ]);
  providerNames.forEach((name) => {
    if (coveredProviders.has(normalizeGeneralEntityValue(name))) return;
    const filterValues: Partial<Record<GeneralEntityTableView, string[]>> = { provider: [name] };
    (input.supplyMovements ?? []).forEach((movement) => {
      if (!sameName(name, movement.provider_name)) return;
      movementProjectIds(movement).forEach((projectId) => {
        const project = ctx.projectsById.get(projectId);
        if (!project) return;
        const context = ctx.contextForProject(project);
        addValue(filterValues.customer ??= [], context.customerName);
        addValue(filterValues.project ??= [], project.name);
        addValue(filterValues.campaign ??= [], context.campaignName);
        context.investors.forEach((value) => addValue(filterValues.investor ??= [], value));
      });
    });
    rows.push(makeRow({
      id: `provider-${normalizeGeneralEntityValue(name)}`,
      entityKind: "actor",
      view: "provider",
      sourceId: 0,
      name,
      typeLabel: "Proveedor",
      roles: ["proveedor"],
      filterValues,
    }));
  });

  const actorIds = new Set(input.actors.map((actor) => actor.id));
  input.projects.forEach((project) => {
    const context = ctx.contextForProject(project);
    projectTenantEntries(context.detail).forEach(({ field, entry }) => {
      const actorId = numberOrNull(entry.actor_id);
      if (actorId && actorIds.has(actorId)) return;
      const name = entry.name.trim();
      if (!name) return;
      rows.push(makeRow({
        id: actorId ? `tenant-${actorId}` : `tenant-${normalizeGeneralEntityValue(name)}-${project.id}`,
        entityKind: "actor",
        view: "tenant",
        sourceId: actorId ?? 0,
        name,
        typeLabel: "Arrendatario",
        roles: ["arrendatario"],
        filterValues: {
          customer: [context.customerName],
          project: [project.name],
          investor: context.investors,
          campaign: [context.campaignName],
          manager: context.managers,
          tenant: [name],
          field: [field.name],
          lot: field.lots.map((lot) => lot.name),
          crop: field.lots.flatMap((lot) => [lot.previous_crop_name ?? "", lot.current_crop_name ?? ""]),
        },
      }));
    });
  });

  input.campaigns.forEach((campaign) => {
    const related = input.projects.map(ctx.contextForProject).filter((context) =>
      context.campaignId === campaign.id || sameName(context.campaignName, campaign.name),
    );
    rows.push(makeRow({
      id: `campaign-${campaign.id}`,
      entityKind: "campaign",
      view: "campaign",
      sourceId: campaign.id,
      name: campaign.name,
      typeLabel: "Campaña",
      roles: [],
      campaignId: campaign.id,
      filterValues: {
        customer: related.map((context) => context.customerName),
        project: related.map((context) => context.project.name),
        investor: related.flatMap((context) => context.investors),
        campaign: [campaign.name],
        provider: related.flatMap((context) => context.providers),
        manager: related.flatMap((context) => context.managers),
        tenant: related.flatMap((context) => context.tenants),
        field: related.flatMap((context) => context.fields),
        lot: related.flatMap((context) => context.lots.map((lot) => lot.lot_name)),
        crop: related.flatMap((context) => context.crops),
      },
    }));
  });

  input.fields.forEach((field) => {
    const project = ctx.projectsById.get(field.project_id);
    const context = project ? ctx.contextForProject(project) : null;
    const fieldDetail = projectDetailField(context?.detail, field.id, field.name);
    const fieldLots = ctx.lotsByField.get(field.id) ?? [];
    rows.push(makeRow({
      id: `field-${field.id}`,
      entityKind: "field",
      view: "field",
      sourceId: field.id,
      name: field.name,
      typeLabel: field.lease_type_name || "Campo",
      roles: [],
      customerId: context?.customerId,
      projectId: field.project_id,
      campaignId: context?.campaignId,
      fieldId: field.id,
      filterValues: {
        customer: context ? [context.customerName] : [],
        project: project ? [project.name] : [],
        investor: context?.investors ?? [],
        campaign: context ? [context.campaignName] : [],
        manager: context?.managers ?? [],
        tenant: fieldTenantNames(fieldDetail),
        field: [field.name],
        lot: fieldLots.map((lot) => lot.lot_name),
        crop: unique(fieldLots.flatMap(lotCropNames)),
      },
    }));
  });

  input.lots.forEach((lot) => {
    const context = ctx.contextForLot(lot);
    rows.push(makeRow({
      id: `lot-${lot.id}`,
      entityKind: "lot",
      view: "lot",
      sourceId: lot.id,
      name: lot.lot_name,
      typeLabel: lot.season || "Lote",
      roles: [],
      customerId: context.customerId,
      projectId: lot.project_id,
      campaignId: context.campaignId,
      fieldId: lot.field_id,
      lotId: lot.id,
      filterValues: {
        customer: [context.customerName],
        project: [context.project.name || lot.project_name],
        investor: context.investors,
        campaign: [context.campaignName],
        manager: context.managers,
        tenant: context.tenants,
        field: [context.fieldName],
        lot: [lot.lot_name],
        crop: context.crops,
      },
    }));
  });

  input.crops.forEach((crop) => {
    const relatedLots = input.lots.filter(
      (lot) =>
        lot.current_crop_id === crop.id ||
        lot.previous_crop_id === crop.id ||
        sameName(lot.current_crop, crop.name) ||
        sameName(lot.previous_crop, crop.name),
    );
    const filterValues: Partial<Record<GeneralEntityTableView, string[]>> = { crop: [crop.name] };
    relatedLots.forEach((lot) => {
      const context = ctx.contextForLot(lot);
      addValue(filterValues.customer ??= [], context.customerName);
      addValue(filterValues.project ??= [], context.project.name || lot.project_name);
      addValue(filterValues.campaign ??= [], context.campaignName);
      context.investors.forEach((value) => addValue(filterValues.investor ??= [], value));
      context.managers.forEach((value) => addValue(filterValues.manager ??= [], value));
      context.tenants.forEach((value) => addValue(filterValues.tenant ??= [], value));
      addValue(filterValues.field ??= [], context.fieldName);
      addValue(filterValues.lot ??= [], lot.lot_name);
    });
    rows.push(makeRow({
      id: `crop-${crop.id}`,
      entityKind: "crop",
      view: "crop",
      sourceId: crop.id,
      name: crop.name,
      typeLabel: "Cultivo",
      roles: [],
      filterValues,
    }));
  });

  return rows;
}

function matches(values: string[], selected: string | undefined) {
  if (!selected) return true;
  return values.some((value) => generalEntityValueMatches(value, selected));
}

export function filterGeneralEntityRows(rows: GeneralEntityRow[], filters: GeneralEntityFilters) {
  return rows.filter((row) =>
    filterOrder.every((key) => matches(row.filterValues[key], filters[key])),
  );
}

export function filterOptionValues(rows: GeneralEntityRow[], key: GeneralEntityTableView) {
  return unique(rows.flatMap((row) => row.filterValues[key])).sort((a, b) => a.localeCompare(b));
}

function rowsOfView(rows: GeneralEntityRow[], view: GeneralEntityTableView) {
  return rows.filter((row) => {
    if (view === "customer") return row.entityKind === "customer";
    if (view === "project") return row.entityKind === "project";
    if (view === "campaign") return row.entityKind === "campaign";
    if (view === "field") return row.entityKind === "field";
    if (view === "lot") return row.entityKind === "lot";
    if (view === "crop") return row.entityKind === "crop";
    return row.entityKind === "actor" && row.roles.includes(actorRoleByView[view] as ActorRole);
  });
}

export function buildCascadingGeneralEntityFilterValues(
  rows: GeneralEntityRow[],
  filters: GeneralEntityFilters,
) {
  const projectRows = filterGeneralEntityRows(rowsOfView(rows, "project"), {
    customer: filters.customer,
  });
  const investorRows = filterGeneralEntityRows(rowsOfView(rows, "project"), {
    customer: filters.customer,
    project: filters.project,
  });
  const campaignRows = filterGeneralEntityRows(rowsOfView(rows, "project"), {
    customer: filters.customer,
    project: filters.project,
    investor: filters.investor,
  });
  const previousToCampaign = {
    customer: filters.customer,
    project: filters.project,
    investor: filters.investor,
    campaign: filters.campaign,
  };
  const managerRows = filterGeneralEntityRows(rowsOfView(rows, "project"), previousToCampaign);
  const tenantRows = filterGeneralEntityRows(rowsOfView(rows, "project"), {
    ...previousToCampaign,
    manager: filters.manager,
  });
  const fieldRows = filterGeneralEntityRows(rowsOfView(rows, "field"), {
    ...previousToCampaign,
    manager: filters.manager,
    tenant: filters.tenant,
  });
  const lotRows = filterGeneralEntityRows(rowsOfView(rows, "lot"), {
    ...previousToCampaign,
    manager: filters.manager,
    tenant: filters.tenant,
    field: filters.field,
  });
  const cropRows = filterGeneralEntityRows(rowsOfView(rows, "lot"), {
    ...previousToCampaign,
    manager: filters.manager,
    tenant: filters.tenant,
    field: filters.field,
    lot: filters.lot,
  });

  return {
    customer: filterOptionValues(rowsOfView(rows, "customer"), "customer"),
    project: filterOptionValues(projectRows, "project"),
    investor: filterOptionValues(investorRows, "investor"),
    campaign: filterOptionValues(campaignRows, "campaign"),
    provider: filterOptionValues(filterGeneralEntityRows(rows, previousToCampaign), "provider"),
    manager: filterOptionValues(managerRows, "manager"),
    tenant: filterOptionValues(tenantRows, "tenant"),
    field: filterOptionValues(fieldRows, "field"),
    lot: filterOptionValues(lotRows, "lot"),
    crop: filterOptionValues(cropRows, "crop"),
  } satisfies Record<GeneralEntityTableView, string[]>;
}

export function rowMatchesTableView(
  row: GeneralEntityRow,
  view: GeneralEntityTableView,
  filters: GeneralEntityFilters = {},
) {
  if (!rowsOfView([row], view).length) return false;
  const selected = filters[view];
  if (!selected) return true;
  if (row.entityKind === "actor") return generalEntityValueMatches(row.name, selected);
  return matches(row.filterValues[view], selected);
}

export function tableScopeFilters(filters: GeneralEntityFilters, view: GeneralEntityTableView) {
  const currentIndex = filterOrder.indexOf(view);
  return filterOrder.slice(0, currentIndex + 1).reduce<GeneralEntityFilters>((scope, key) => {
    if (key === "provider" && view !== "provider") return scope;
    if (rowOwnFilterViews.has(view) && key === view) return scope;
    if (filters[key]) scope[key] = filters[key];
    return scope;
  }, {});
}

const rowOwnFilterViews = new Set<GeneralEntityTableView>([
  "investor",
  "provider",
  "manager",
  "tenant",
]);
