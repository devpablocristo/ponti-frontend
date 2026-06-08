import { expect, test, type APIRequestContext } from "@playwright/test";
import { Buffer } from "node:buffer";
import fs from "node:fs";
import path from "node:path";

import { installAuthenticatedSession } from "./helpers/auth";

const PROJECT_ID = 30;
const FALLBACK_CUSTOMER_ID = 17;
const EXPECTED_TOTAL_USED = 200;
const LOT_AREA = "50";

test.setTimeout(90_000);

type ManagerApiConfig = {
  baseURL: string;
  apiKey: string;
};

type ProjectDetail = {
  id: number;
  name?: string;
  customer?: { id?: number };
  campaign?: { id?: number };
  investors?: Array<{ id: number; name: string }> | null;
  fields?: Array<{
    id: number;
    name: string;
    lots?: Array<{
      id: number;
      name: string;
      current_crop_id?: number | null;
    }> | null;
  }> | null;
};

type Labor = {
  id: number;
  name: string;
  contractor_name?: string;
  is_pending?: boolean;
};

type Supply = {
  id: number;
  name: string;
  is_pending?: boolean;
};

type BatchCreateItem = {
  id: number;
  number: string;
  lot_id: number;
};

type WorkOrderListRow = {
  id: number;
  number: string;
  consumption: string | number;
};

function base64Url(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function createE2EToken(): string {
  const exp = Math.floor(Date.now() / 1000) + 24 * 60 * 60;
  return [
    base64Url({ alg: "none", typ: "JWT" }),
    base64Url({
      sub: "codex-e2e",
      ID: 1,
      Rol: 1,
      Username: "Codex E2E",
      Hash: "e2e",
      exp,
    }),
    "",
  ].join(".");
}

function parseEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};

  return fs.readFileSync(filePath, "utf8").split(/\r?\n/).reduce<Record<string, string>>(
    (env, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return env;

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex < 1) return env;

      const key = trimmed.slice(0, separatorIndex).trim();
      const rawValue = trimmed.slice(separatorIndex + 1).trim();
      env[key] = rawValue.replace(/^['"]|['"]$/g, "");
      return env;
    },
    {}
  );
}

function getLocalEnv(name: string): string {
  const apiEnv = parseEnvFile(path.resolve(process.cwd(), "../api/.env"));
  const coreEnv = parseEnvFile(path.resolve(process.cwd(), "../../core/.env"));
  return process.env[name] ?? apiEnv[name] ?? coreEnv[name] ?? "";
}

function getManagerApiConfig(): ManagerApiConfig | null {
  const baseURL = getLocalEnv("BASE_MANAGER_API")
    .replace("host.docker.internal", "127.0.0.1")
    .replace(/\/+$/, "");
  const apiKey = getLocalEnv("X_API_KEY");

  if (!baseURL || !apiKey) {
    return null;
  }

  return { baseURL, apiKey };
}

function getWebBffBaseURL(): string {
  return (process.env.BFF_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

function coreHeaders(token: string, apiKey: string): Record<string, string> {
  return {
    ...authHeaders(token),
    "X-API-KEY": apiKey,
  };
}

function unwrapPayload<T>(payload: unknown): T {
  const candidate = payload as { data?: unknown };
  return (candidate?.data ?? payload) as T;
}

function extractRows<T>(payload: unknown): T[] {
  const candidate = payload as { data?: unknown; items?: unknown; rows?: unknown };
  const data = candidate?.data as { data?: unknown; items?: unknown; rows?: unknown } | undefined;
  const rows =
    data?.data ??
    data?.items ??
    data?.rows ??
    candidate?.items ??
    candidate?.rows ??
    candidate?.data;
  return Array.isArray(rows) ? (rows as T[]) : [];
}

async function coreGet<T>(
  request: APIRequestContext,
  config: ManagerApiConfig,
  pathName: string,
  token: string
): Promise<T> {
  const response = await request.get(`${config.baseURL}${pathName}`, {
    headers: coreHeaders(token, config.apiKey),
  });

  expect(response.ok(), `GET Core ${pathName} respondio ${response.status()}`).toBeTruthy();
  return response.json() as Promise<T>;
}

async function deleteDrafts(
  request: APIRequestContext,
  config: ManagerApiConfig,
  draftIds: number[],
  token: string
) {
  await Promise.allSettled(
    draftIds.map((id) =>
      request.delete(`${config.baseURL}/work-order-drafts/${id}`, {
        headers: coreHeaders(token, config.apiKey),
      })
    )
  );
}

async function resolveFixture(
  request: APIRequestContext,
  config: ManagerApiConfig,
  token: string
) {
  const projectPayload = await coreGet<unknown>(request, config, `/projects/${PROJECT_ID}`, token);
  const project = unwrapPayload<ProjectDetail>(projectPayload);
  const fields = Array.isArray(project.fields) ? project.fields : [];
  const field = fields.find(
    (candidate) =>
      Array.isArray(candidate.lots) &&
      candidate.lots.filter((lot) => Number(lot.current_crop_id) > 0).length >= 2
  );
  const lots = (field?.lots ?? []).filter((lot) => Number(lot.current_crop_id) > 0).slice(0, 2);

  const laborsPayload = await coreGet<unknown>(
    request,
    config,
    `/projects/${PROJECT_ID}/labors`,
    token
  );
  const labor = extractRows<Labor>(laborsPayload).find((item) => !item.is_pending);

  const suppliesPayload = await coreGet<unknown>(
    request,
    config,
    `/supplies?project_id=${PROJECT_ID}&page=1&per_page=100`,
    token
  );
  const supply = extractRows<Supply>(suppliesPayload).find((item) => !item.is_pending);
  const investor = Array.isArray(project.investors) ? project.investors[0] : null;

  return {
    project,
    field,
    lots,
    labor,
    supply,
    investor,
  };
}

test.beforeEach(async ({ page }) => {
  await installAuthenticatedSession(page);
});

test("ordenes muestra subordenes por lote sin duplicar consumo", async ({ page, request }) => {
  const config = getManagerApiConfig();
  test.skip(!config, "BASE_MANAGER_API y X_API_KEY son necesarios para crear el batch digital");

  const token = createE2EToken();
  const fixture = await resolveFixture(request, config!, token);

  test.skip(!fixture.field, `project ${PROJECT_ID} no tiene un campo con al menos 2 lotes con cultivo`);
  test.skip(fixture.lots.length < 2, `project ${PROJECT_ID} no tiene 2 lotes validos`);
  test.skip(!fixture.labor, `project ${PROJECT_ID} no tiene labores disponibles`);
  test.skip(!fixture.supply, `project ${PROJECT_ID} no tiene insumos disponibles`);
  test.skip(!fixture.investor, `project ${PROJECT_ID} no tiene inversores disponibles`);

  const baseNumber = `D-${Date.now()}`;
  const createdDraftIds: number[] = [];
  const campaignId = fixture.project.campaign?.id;
  const customerId = fixture.project.customer?.id ?? FALLBACK_CUSTOMER_ID;

  try {
    const createResponse = await request.post(`${config!.baseURL}/work-order-drafts/digital/batch`, {
      headers: coreHeaders(token, config!.apiKey),
      data: {
        number: baseNumber,
        date: new Date().toISOString().slice(0, 10),
        customer_id: customerId,
        project_id: PROJECT_ID,
        campaign_id: campaignId ?? null,
        field_id: fixture.field!.id,
        crop_id: Number(fixture.lots[0].current_crop_id),
        labor_id: fixture.labor!.id,
        contractor: fixture.labor!.contractor_name ?? "",
        observations: "E2E web multi-lote consumo total",
        investor_id: fixture.investor!.id,
        lots: fixture.lots.map((lot) => ({
          lot_id: lot.id,
          effective_area: LOT_AREA,
          items: [
            {
              supply_id: fixture.supply!.id,
              total_used: String(EXPECTED_TOTAL_USED),
            },
          ],
        })),
      },
    });

    const createBody = await createResponse.text();
    expect(
      createResponse.ok(),
      `POST Core batch respondio ${createResponse.status()}: ${createBody}`
    ).toBeTruthy();

    const createPayload = JSON.parse(createBody) as { items?: BatchCreateItem[] };
    const createdItems = createPayload.items ?? [];
    expect(createdItems).toHaveLength(2);
    createdDraftIds.push(...createdItems.map((item) => item.id));

    const query = new URLSearchParams({
      project_id: String(PROJECT_ID),
      customer_id: String(customerId),
      ...(campaignId ? { campaign_id: String(campaignId) } : {}),
      page: "1",
      per_page: "1000",
    });

    const listResponse = await request.get(`${getWebBffBaseURL()}/api/v1/work-orders?${query.toString()}`, {
      headers: authHeaders(token),
    });
    expect(listResponse.ok(), `GET Web BFF work-orders respondio ${listResponse.status()}`).toBeTruthy();

    const listPayload = await listResponse.json();
    const rows = extractRows<WorkOrderListRow>(listPayload);
    const matchingRows = rows.filter(
      (row) => row.number === baseNumber || row.number.startsWith(`${baseNumber}.`)
    );
    const observedTotalUsed = matchingRows.reduce(
      (total, row) => total + Number(row.consumption ?? 0),
      0
    );

    expect.soft(matchingRows).toHaveLength(2);
    expect.soft(matchingRows.some((row) => row.number === baseNumber)).toBeFalsy();
    expect.soft(matchingRows.map((row) => row.number).sort()).toEqual([
      `${baseNumber}.1`,
      `${baseNumber}.2`,
    ]);
    expect.soft(observedTotalUsed).toBeCloseTo(EXPECTED_TOTAL_USED, 5);

    const ordersResponse = page.waitForResponse(
      (response) =>
        response.request().method() === "GET" &&
        response.url().includes("/api/v1/work-orders?") &&
        response.url().includes(`project_id=${PROJECT_ID}`) &&
        response.ok()
    );

    await page.goto(`/admin/work-orders?project_id=${PROJECT_ID}`);
    await ordersResponse;

    await expect.soft(page.getByRole("heading", { name: "Órdenes de Trabajo" })).toBeVisible();
    await expect.soft(page.getByText(`${baseNumber}.1`, { exact: true })).toHaveCount(1);
    await expect.soft(page.getByText(`${baseNumber}.2`, { exact: true })).toHaveCount(1);
    await expect.soft(page.getByText("400 Lt", { exact: true })).toHaveCount(0);
  } finally {
    await deleteDrafts(request, config!, createdDraftIds, token);
  }
});
