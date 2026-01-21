import { http, HttpResponse } from "msw";
import jwt from "jsonwebtoken";
import { configService } from "../configService";

// Helper para loguear y confirmar que el mock responde
const logRequest = (method: string, url: string) => {
  console.log(`[MOCK] ✅ ${method} ${url} -> Respondiendo Objeto { data: ... }`);
};

interface LoginRequest {
  username: string;
  password: string;
}

const ACCESS_TOKEN_EXPIRATION = 24 * 60 * 60; // 24 horas para desarrollo
const REFRESH_TOKEN_EXPIRATION = 6 * 30 * 24 * 60 * 60;

const MOCK_USER = {
  id: 1,
  rolId: 1,
  username: "testuser",
  password: "123456",
  email: "testuser@example.com",
  tokenHash: "randomhash123",
};

const generateToken = (claims: object): string => {
  const secretKey = process.env.JWT_SECRET;
  if (!secretKey) return "";
  return jwt.sign(claims, secretKey, { algorithm: "HS256" });
};

// Mock data for workorders
const MOCK_WORKORDERS = [
  { 
    id: 101, 
    number: "1553",
    customer_id: 1,
    project_id: 1,
    campaign_id: 3,
    project_name: "Proyecto 1",
    field_name: "campo alegre",
    lot_name: "Lote 2",
    date: "2025-03-29",
    crop_name: "Maíz",
    labor_name: "PULVERIZACION",
    labor_category_name: "Pulverización",
    type_name: "Agroquímicos",
    contractor: "Contratista A",
    surface_ha: "140",
    supply_name: "FLOSIL (FOMESAFEN 50%) X 20 LTS",
    consumption: "29",
    category_name: "Herbicidas",
    dose: 0.21,
    cost_per_ha: 3.07,
    unit_price: 14.8,
    total_cost: 429.2,
    status: "pending",
    type_id: 4,
    lot_id: 20,
    field_id: 10
  },
  { 
    id: 102, 
    number: "1552",
    customer_id: 1,
    project_id: 1,
    campaign_id: 3,
    project_name: "Proyecto 1",
    field_name: "campo alegre",
    lot_name: "Lote 1",
    date: "2025-03-28",
    crop_name: "Poroto rojo",
    labor_name: "PULVERIZACION",
    labor_category_name: "Pulverización",
    type_name: "Agroquímicos",
    contractor: "Contratista B",
    surface_ha: "150",
    supply_name: "ACEITE KEEPER METIL X 20LT",
    consumption: "21",
    category_name: "Coadyuvantes",
    dose: 0.14,
    cost_per_ha: 0.28,
    unit_price: 2.08,
    total_cost: 42.64,
    status: "pending",
    type_id: 3,
    lot_id: 20,
    field_id: 11
  },
  { 
    id: 98, 
    number: "1524",
    customer_id: 1,
    project_id: 1,
    campaign_id: 3,
    project_name: "Proyecto 2",
    field_name: "campo alegre",
    lot_name: "Lote 1",
    date: "2025-03-16",
    crop_name: "Poroto rojo",
    labor_name: "SIEMBRA BLASCO S.H.",
    labor_category_name: "Siembra",
    type_name: "Semilla",
    contractor: "Contratista A",
    surface_ha: "150",
    supply_name: "SEMILLA P. ROJO L.R.K",
    consumption: "23700",
    category_name: "Semilla",
    dose: 158,
    cost_per_ha: 197.5,
    unit_price: 1.25,
    total_cost: 29625,
    status: "completed",
    type_id: 1,
    lot_id: 20,
    field_id: 10
  },
  { 
    id: 96, 
    number: "1551",
    customer_id: 1,
    project_id: 1,
    campaign_id: 3,
    project_name: "Proyecto 2",
    field_name: "SJDD",
    lot_name: "Lote 10",
    date: "2025-03-28",
    crop_name: "Poroto blanco",
    labor_name: "PULVERIZACION",
    labor_category_name: "Pulverización",
    type_name: "Agroquímicos",
    contractor: "Contratista C",
    surface_ha: "300",
    supply_name: "TALSTAR (BIFENTRIN 10%) X 5 LT",
    consumption: "30",
    category_name: "Insecticidas",
    dose: 0.1,
    cost_per_ha: 0.9,
    unit_price: 9,
    total_cost: 270,
    status: "completed",
    type_id: 1,
    lot_id: 22,
    field_id: 12
  },
  { 
    id: 97, 
    number: "1507",
    customer_id: 1,
    project_id: 1,
    campaign_id: 3,
    project_name: "Proyecto 2",
    field_name: "SJDD",
    lot_name: "Lote 54",
    date: "2025-03-10",
    crop_name: "Poroto crawberry",
    labor_name: "SIEMBRA BLASCO S.H.",
    labor_category_name: "Siembra",
    type_name: "Agroquímicos",
    contractor: "Contratista A",
    surface_ha: "74",
    supply_name: "ACRONIS (PYRACITOBIN) X 5 LTS",
    consumption: "12",
    category_name: "Curasemillas",
    dose: 0.16,
    cost_per_ha: 6.73,
    unit_price: 41,
    total_cost: 498.15,
    status: "completed",
    type_id: 1,
    lot_id: 23,
    field_id: 13
  }
];

// Filter helpers so the mocks respond to the same filters the UI sends
const filterWorkorders = (url: string) => {
  const { searchParams } = new URL(url);
  const matchParam = (wo: any, key: string) => {
    const values = searchParams.getAll(key);
    if (!values.length) return true;
    return values.some((v) => String(wo[key]) === v);
  };

  return MOCK_WORKORDERS.filter((wo) =>
    matchParam(wo, "customer_id") &&
    matchParam(wo, "project_id") &&
    matchParam(wo, "campaign_id") &&
    matchParam(wo, "field_id") &&
    matchParam(wo, "lot_id") &&
    matchParam(wo, "type_id") &&
    matchParam(wo, "status")
  );
};

// Function to calculate metrics from workorders
const calculateWorkorderMetrics = (data = MOCK_WORKORDERS) => {
  // Surface: sum all surface_ha from filtered workorders
  const surface_ha = data.reduce((sum, wo) => sum + parseFloat(wo.surface_ha), 0);

  // Liters: sum consumption where type is "Líquido"
  const liters = data
    .filter(wo => wo.type_name === "Líquido")
    .reduce((sum, wo) => sum + parseFloat(wo.consumption), 0);

  // Kilograms: sum consumption where type is NOT "Líquido"
  const kilograms = data
    .filter(wo => wo.type_name !== "Líquido")
    .reduce((sum, wo) => sum + parseFloat(wo.consumption), 0);

  // Direct cost: sum of all total_cost
  const direct_cost = data.reduce((sum, wo) => sum + wo.total_cost, 0);

  return {
    surface_ha,
    liters,
    kilograms,
    direct_cost
  };
};

export const handlers = [
  // 1. LOGIN
  http.post(configService.baseLoginApi + "/auth/login", async ({ request }) => {
    logRequest("POST", request.url);
    try {
      const body = (await request.json()) as LoginRequest;
      if (!body.username || !body.password) {
        return new HttpResponse(JSON.stringify({ message: "Requeridos" }), { status: 400 });
      }

      if (body.username !== MOCK_USER.username || body.password !== MOCK_USER.password) {
        return new HttpResponse(JSON.stringify({ message: "Inválidas" }), { status: 401 });
      }

      const now = Math.floor(Date.now() / 1000);
      return new HttpResponse(
        JSON.stringify({
          access_token: generateToken({ id: MOCK_USER.id, username: MOCK_USER.username, exp: now + ACCESS_TOKEN_EXPIRATION }),
          refresh_token: generateToken({ id: MOCK_USER.id, hash: MOCK_USER.tokenHash, exp: now + REFRESH_TOKEN_EXPIRATION }),
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      return new HttpResponse(null, { status: 500 });
    }
  }),

  // 2. VALIDATE-TOKEN
  http.get(configService.baseLoginApi + "/auth/validate-token", ({ request }) => {
    logRequest("GET", request.url);
    return new HttpResponse(
      JSON.stringify({
        success: true,
        data: {
          status: "active",
          userID: "1",
          rolID: "1",
          hash: "mockhash123",
          exp: Math.floor(Date.now() / 1000) + 3600
        }
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }),

  // 3. ACCESS-TOKEN
  http.post(configService.baseLoginApi + "/auth/access-token", ({ request }) => {
    logRequest("POST", request.url);
    return new HttpResponse(
      JSON.stringify({
        success: true,
        data: {
          access_token: "nuevo-token-mock",
          refresh_token: "nuevo-refresh-mock"
        }
      }),
      { status: 200 }
    );
  }),

  // 4. MOCK DE CUSTOMERS (Estrategia: Objeto con propiedad data)
  http.get(configService.baseManagerApi + "/customers", ({ request }) => {
    logRequest("GET", request.url);
    return new HttpResponse(
      JSON.stringify({
        data: [
          { id: 1, name: "Oscar Salomon", status: "active" }
        ],
        page_info: { total: 1 }
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }),

// 5. MOCK DE CAMPAÑAS (¡AQUÍ ESTÁ LA CLAVE!)
  // 1. Es un Objeto (evita error 500).
  // 2. Tiene 'success: true' y 'data' directo (evita la triple caja).
  // 3. Tiene 'customer_id' y 'project_id' (hace que el selector funcione).
// 5. MOCK DE CAMPAÑAS (Array directo - el backend lo envuelve)
  http.get(new RegExp(configService.baseManagerApi + "/campaigns.*"), () => {
    console.log("Mocking campaigns...");
    return new HttpResponse(
      JSON.stringify([
        { 
          id: 3, 
          name: "2026-2027", 
          status: "active",
          customer_id: 1,
          project_id: 1
        }
      ]),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }),

  // 6. MOCK DE PROYECTOS (Consolidado para todas las variantes)
  http.get(new RegExp(configService.baseManagerApi + "/projects($|/|\\?)"), ({ request }) => {
    const url = new URL(request.url);
    const path = url.pathname;
    const hasQueryParams = url.search.length > 0;
    
    const projectData = {
      id: 1,
      name: "Proyecto 1",
      customer: { id: 1, name: "Oscar Salomon" },
      campaign: { id: 3, name: "2026-2027" },
      managers: [{ name: "Manager 1" }],
      investors: [
        { id: 1, name: "Oscar", percentage: "33" },
        { id: 2, name: "Juli", percentage: "34" },
        { id: 3, name: "Carla", percentage: "33" }
      ],
      fields: [ 
        { id: 10, name: "campo alegre" }, 
        { id: 12, name: "SJDD" } 
      ]
    };
    
    // Si es /projects/customer/* -> manejarlo como listado por customer
    if (path.includes("/customer/")) {
      logRequest("GET", request.url);
      return new HttpResponse(
        JSON.stringify({
          data: [projectData],
          page_info: { total: 1, page: 1, per_page: 1000, max_page: 1 }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // Si es /projects/\d+/fields -> manejarlo como listado de fields
    if (path.includes("/fields")) {
      logRequest("GET", request.url);
      return new HttpResponse(
        JSON.stringify([
          { id: 10, name: "campo alegre", status: "active", project_id: 1 },
          { id: 12, name: "SJDD", status: "active", project_id: 1 }
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // Si es solo /projects/\d+ sin query params -> proyecto específico
    const hasOnlyId = /\/projects\/\d+$/.test(path);
    if (hasOnlyId && !hasQueryParams) {
      logRequest("GET", request.url);
      return new HttpResponse(
        JSON.stringify({
          ...projectData,
          admin_cost: 2340,
          planned_cost: 2111,
          fields: [
            {
              id: 10,
              name: "campo alegre",
              lease_type_id: 4,
              lease_type_percent: 21,
              lease_type_value: 200,
              lots: [ 
                { id: 20, name: "ALFONZA", hectares: 17 },
                { id: 21, name: "REDONDA 2", hectares: 39 }
              ]
            },
            {
              id: 12,
              name: "SJDD",
              lease_type_id: 4,
              lease_type_percent: 21,
              lease_type_value: 200,
              lots: [ 
                { id: 22, name: "REDONDA 1", hectares: 76 },
                { id: 23, name: "UBEDA 1", hectares: 18 },
                { id: 24, name: "JIMENES 3", hectares: 110 },
                { id: 25, name: "JIMENES 2", hectares: 142 }
              ]
            }
          ]
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // Por defecto, listado filtrado con query params
    logRequest("GET", request.url);
    return new HttpResponse(
      JSON.stringify({
        data: [projectData],
        page_info: { total: 1, page: 1, per_page: 10, max_page: 1 }
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }),

// 8. DASHBOARD METRICS (Estructura completa)
http.get(new RegExp(configService.baseManagerApi + "/dashboard.*"), ({ request }) => {
  logRequest("GET", request.url);
  return new HttpResponse(
    JSON.stringify({
      metrics: {
        sowing: {
          progress_pct: "45",
          hectares: "10000",
          total_hectares: "22323"
        },
        harvest: {
          progress_pct: "0",
          hectares: "0",
          total_hectares: "22323"
        },
        costs: {
          progress_pct: "25",
          executed_usd: "125000",
          budget_usd: "500000"
        },
        investor_contributions: {
          items: [
            { investor_id: 1, investor_name: "Oscar", share_pct: "33", contributions_progress_pct: "30" },
            { investor_id: 2, investor_name: "Juli", share_pct: "34", contributions_progress_pct: "25" },
            { investor_id: 3, investor_name: "Carla", share_pct: "33", contributions_progress_pct: "35" }
          ]
        },
        operating_result: {
          margin_pct: "15",
          result_usd: "75000",
          total_costs_usd: "500000"
        }
      },
      management_balance: {
        totals: {
          executed_usd: "125000",
          invested_usd: "150000",
          stock_usd: "25000"
        },
        items: [
          { category: "SEED", label: "Semillas", executed_usd: "30000", invested_usd: "35000", stock_usd: "5000", order: 1 },
          { category: "SUPPLIES", label: "Insumos", executed_usd: "40000", invested_usd: "45000", stock_usd: "5000", order: 2 },
          { category: "FERTILIZERS", label: "Fertilizantes", executed_usd: "25000", invested_usd: "30000", stock_usd: "5000", order: 3 },
          { category: "LABORS", label: "Labores", executed_usd: "20000", invested_usd: "20000", stock_usd: "0", order: 4 },
          { category: "LEASE", label: "Arrendamiento", executed_usd: "5000", invested_usd: "10000", stock_usd: "0", order: 5 },
          { category: "ADMIN", label: "Administración", executed_usd: "5000", invested_usd: "10000", stock_usd: "0", order: 6 }
        ]
      },
      crop_incidence: {
        items: [
          { crop_id: 3, name: "Trigo", hectares: "22323", cost_per_ha_usd: "22.4", incidence_pct: "100" }
        ],
        total: {
          hectares: "22323",
          avg_cost_per_ha_usd: "22.4"
        }
      },
      operational_indicators: {
        items: [
          { type: "pending", title: "Aplicación de fertilizante", date: "2026-01-15", workorder_id: 101 },
          { type: "pending", title: "Control de plagas", date: "2026-01-20", workorder_id: 102 },
          { type: "completed", title: "Siembra completada", date: "2025-12-10", workorder_id: 98 },
          { type: "completed", title: "Preparación de suelo", date: "2025-11-25", workorder_id: 95 }
        ]
      }
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}),

// 9. PROTECTED HI
  http.get(configService.baseLoginApi + "/auth/protected/hi", ({ request }) => {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) return new HttpResponse(null, { status: 401 });
    return new HttpResponse(JSON.stringify({ message: "Login successful" }), { status: 200 });
  }),
  
  // 11. USERS
  http.get(new RegExp(configService.baseManagerApi + "/users.*"), ({ request }) => {
    logRequest("GET", request.url);
    return new HttpResponse(
      JSON.stringify({
        success: true,
        data: [
          { id: 1, username: "testuser", email: "testuser@example.com", rol_id: 1, status: "active" },
          { id: 2, username: "admin", email: "admin@example.com", rol_id: 1, status: "active" }
        ],
        page_info: { total: 2 }
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }),

  // 12. CATEGORIES
  http.get(new RegExp(configService.baseManagerApi + "/categories.*"), ({ request }) => {
    logRequest("GET", request.url);
    return new HttpResponse(
      JSON.stringify({
        success: true,
        data: [
          { id: 1, name: "Semillas", code: "SEED" },
          { id: 2, name: "Insumos", code: "SUPPLIES" },
          { id: 3, name: "Fertilizantes", code: "FERTILIZERS" },
          { id: 4, name: "Labores", code: "LABORS" }
        ],
        page_info: { total: 4 }
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }),

  // 13. TYPES
  http.get(new RegExp(configService.baseManagerApi + "/types.*"), ({ request }) => {
    logRequest("GET", request.url);
    return new HttpResponse(
      JSON.stringify({
        success: true,
        data: [
          { id: 1, name: "Siembra", code: "SOWING" },
          { id: 2, name: "Cosecha", code: "HARVEST" },
          { id: 3, name: "Aplicación", code: "APPLICATION" },
          { id: 4, name: "Fertilización", code: "FERTILIZATION" }
        ],
        page_info: { total: 4 }
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }),

  // 14. CROPS
  http.get(new RegExp(configService.baseManagerApi + "/crops.*"), ({ request }) => {
    logRequest("GET", request.url);
    return new HttpResponse(
      JSON.stringify({
        success: true,
        data: [
          { id: 1, name: "Soja", code: "SOYBEAN", status: "active" },
          { id: 2, name: "Maíz", code: "CORN", status: "active" },
          { id: 3, name: "Trigo", code: "WHEAT", status: "active" },
          { id: 4, name: "Girasol", code: "SUNFLOWER", status: "active" }
        ],
        page_info: { total: 4 }
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }),

  // 15. SUPPLIES
  http.get(new RegExp(configService.baseManagerApi + "/supplies.*"), ({ request }) => {
    logRequest("GET", request.url);
    return new HttpResponse(
      JSON.stringify({
        success: true,
        data: [
          { id: 1, name: "Glifosato", category_id: 2, unit: "L", status: "active" },
          { id: 2, name: "2,4-D", category_id: 2, unit: "L", status: "active" },
          { id: 3, name: "Urea", category_id: 3, unit: "KG", status: "active" },
          { id: 4, name: "Semilla Trigo DM", category_id: 1, unit: "KG", status: "active" }
        ],
        page_info: { total: 4 }
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }),

  // 16. PROVIDERS
  http.get(new RegExp(configService.baseManagerApi + "/providers.*"), ({ request }) => {
    logRequest("GET", request.url);
    return new HttpResponse(
      JSON.stringify({
        success: true,
        data: [
          { id: 1, name: "AgroSur S.A.", cuit: "30-12345678-9", status: "active" },
          { id: 2, name: "Semillas del Campo", cuit: "30-87654321-0", status: "active" },
          { id: 3, name: "Fertilizantes Pro", cuit: "30-11223344-5", status: "active" }
        ],
        page_info: { total: 3 }
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }),

  // 17. LABORS
  http.get(new RegExp(configService.baseManagerApi + "/labors.*"), ({ request }) => {
    logRequest("GET", request.url);
    return new HttpResponse(
      JSON.stringify({
        success: true,
        data: [
          { id: 1, name: "Siembra", unit: "HA", cost_per_unit: "50", status: "active" },
          { id: 2, name: "Pulverización", unit: "HA", cost_per_unit: "25", status: "active" },
          { id: 3, name: "Cosecha", unit: "HA", cost_per_unit: "120", status: "active" },
          { id: 4, name: "Fertilización", unit: "HA", cost_per_unit: "30", status: "active" }
        ],
        page_info: { total: 4 }
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }),

  // 18. LOTS KPIs (Debe ir PRIMERO antes del handler general de /lots)
  http.get(new RegExp(configService.baseManagerApi + "/lots/kpis"), ({ request }) => {
    logRequest("GET", request.url);
    return new HttpResponse(
      JSON.stringify({
        seeded_area: 402,
        harvested_area: 0,
        yield_tn_per_ha: 0,
        cost_per_hectare: 158.87,
        superficie_total: 402
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }),

  // 18A. LOTS METRICS (Endpoint alternativo, el backend lo usa internamente)
  http.get(new RegExp(configService.baseManagerApi + "/lots/metrics"), ({ request }) => {
    logRequest("GET", request.url);
    return new HttpResponse(
      JSON.stringify({
        seeded_area: 402,
        harvested_area: 0,
        yield_tn_per_ha: 0,
        cost_per_hectare: 158.87,
        superficie_total: 402
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }),

  // 18B. LOTS (Lotes por proyecto) - DESPUÉS de metrics para evitar conflictos
  http.get(new RegExp(configService.baseManagerApi + "/lots"), ({ request }) => {
    logRequest("GET", request.url);
    return new HttpResponse(
      JSON.stringify({
        items: [
          { 
            id: 20, 
            lot_name: "ALFONZA",
            field_id: 10,
            field_name: "campo alegre",
            project_id: 1,
            project_name: "Proyecto 1",
            hectares: "17",
            harvested_area: "0",
            crop_id: 3, 
            crop_name: "Soja",
            previous_crop: "MONTE",
            current_crop: "Soja",
            variety: "DM 75I75 IPRO",
            status: "active",
            dates: [{ sequence: 1, sowing_date: "2026-01-06", harvest_date: "" }],
            tons: "0",
            cost_usd_per_ha: "127.64",
            yield_tn_per_ha: "0",
            income_net_per_ha: "0",
            rent_per_ha: "0",
            admin_per_ha: "40",
            active_total_per_ha: "167.64",
            operating_result_per_ha: "-167.64"
          },
          { 
            id: 21, 
            lot_name: "REDONDA 2",
            field_id: 10,
            field_name: "campo alegre",
            project_id: 1,
            project_name: "Proyecto 1",
            hectares: "39",
            harvested_area: "0",
            crop_id: 3, 
            crop_name: "Soja",
            previous_crop: "Trigo",
            current_crop: "Soja",
            variety: "DM 60I62 IPRO",
            status: "active",
            dates: [{ sequence: 1, sowing_date: "2025-12-13", harvest_date: "" }],
            tons: "0",
            cost_usd_per_ha: "195.28",
            yield_tn_per_ha: "0",
            income_net_per_ha: "0",
            rent_per_ha: "0",
            admin_per_ha: "40",
            active_total_per_ha: "235.28",
            operating_result_per_ha: "-235.28"
          },
          { 
            id: 22, 
            lot_name: "REDONDA 1",
            field_id: 12,
            field_name: "SJDD",
            project_id: 1,
            project_name: "Proyecto 2",
            hectares: "76",
            harvested_area: "0",
            crop_id: 3, 
            crop_name: "Soja",
            previous_crop: "Trigo",
            current_crop: "Soja",
            variety: "DM 60I62 IPRO",
            status: "active",
            dates: [{ sequence: 1, sowing_date: "2025-12-13", harvest_date: "" }],
            tons: "0",
            cost_usd_per_ha: "148.44",
            yield_tn_per_ha: "0",
            income_net_per_ha: "0",
            rent_per_ha: "0",
            admin_per_ha: "40",
            active_total_per_ha: "188.44",
            operating_result_per_ha: "-188.44"
          },
          { 
            id: 23, 
            lot_name: "UBEDA 1",
            field_id: 12,
            field_name: "SJDD",
            project_id: 1,
            project_name: "Proyecto 2",
            hectares: "18",
            harvested_area: "0",
            crop_id: 3, 
            crop_name: "Soja",
            previous_crop: "Trigo",
            current_crop: "Soja",
            variety: "DM 60I62 IPRO",
            status: "active",
            dates: [{ sequence: 1, sowing_date: "2025-12-13", harvest_date: "" }],
            tons: "0",
            cost_usd_per_ha: "181.63",
            yield_tn_per_ha: "0",
            income_net_per_ha: "0",
            rent_per_ha: "0",
            admin_per_ha: "40",
            active_total_per_ha: "221.63",
            operating_result_per_ha: "-221.63"
          },
          { 
            id: 24, 
            lot_name: "JIMENES 3",
            field_id: 12,
            field_name: "SJDD",
            project_id: 1,
            project_name: "Proyecto 2",
            hectares: "110",
            harvested_area: "0",
            crop_id: 3, 
            crop_name: "Soja",
            previous_crop: "Trigo",
            current_crop: "Soja",
            variety: "DM 75I75 IRPO (90%)",
            status: "active",
            dates: [{ sequence: 1, sowing_date: "2025-12-18", harvest_date: "" }],
            tons: "0",
            cost_usd_per_ha: "152.9",
            yield_tn_per_ha: "0",
            income_net_per_ha: "0",
            rent_per_ha: "0",
            admin_per_ha: "40",
            active_total_per_ha: "192.9",
            operating_result_per_ha: "-192.9"
          },
          { 
            id: 25, 
            lot_name: "JIMENES 2",
            field_id: 12,
            field_name: "SJDD",
            project_id: 1,
            project_name: "Proyecto 2",
            hectares: "142",
            harvested_area: "0",
            crop_id: 3, 
            crop_name: "Soja",
            previous_crop: "Trigo",
            current_crop: "Soja",
            variety: "DM 75I75 IPRO (90%)",
            status: "active",
            dates: [{ sequence: 1, sowing_date: "2025-12-18", harvest_date: "" }],
            tons: "0",
            cost_usd_per_ha: "147.3",
            yield_tn_per_ha: "0",
            income_net_per_ha: "0",
            rent_per_ha: "0",
            admin_per_ha: "40",
            active_total_per_ha: "187.3",
            operating_result_per_ha: "-187.3"
          }
        ],
        page_info: { total: 6 }
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }),

  // 19. WORKORDERS METRICS (Debe ir ANTES del handler general)
  http.get(new RegExp(configService.baseManagerApi + "/workorders/metrics"), ({ request }) => {
    logRequest("GET", request.url);
    const filtered = filterWorkorders(request.url);
    const metrics = calculateWorkorderMetrics(filtered);
    return new HttpResponse(
      JSON.stringify(metrics),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }),

  // 19B. WORKORDERS (Órdenes de trabajo)
  http.get(new RegExp(configService.baseManagerApi + "/workorders"), ({ request }) => {
    logRequest("GET", request.url);
    const filtered = filterWorkorders(request.url);
    return new HttpResponse(
      JSON.stringify({
          items: filtered,
          page_info: { total: filtered.length }
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }),

  // 20. WORKORDER POST (Crear)
  http.post(new RegExp(configService.baseManagerApi + "/workorders.*"), async ({ request }) => {
    logRequest("POST", request.url);
    const body = await request.json() as any;
    return new HttpResponse(
      JSON.stringify({
        success: true,
        data: { id: 999, ...body }
      }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  }),

  // 21. WORKORDER PUT (Actualizar)
  http.put(new RegExp(configService.baseManagerApi + "/workorders/\\d+"), async ({ request }) => {
    logRequest("PUT", request.url);
    const body = await request.json();
    return new HttpResponse(
      JSON.stringify({
        success: true,
        data: body
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }),

  // 22. SUPPLY MOVEMENTS (Movimientos de insumos)
  http.get(new RegExp(configService.baseManagerApi + "/supply_movements/\\d+"), ({ request }) => {
    logRequest("GET", request.url);
    return new HttpResponse(
      JSON.stringify({
        success: true,
        data: [
          { id: 1, supply_id: 1, supply_name: "Glifosato", type: "IN", quantity: "100", unit: "L", date: "2025-12-01", provider_id: 1 },
          { id: 2, supply_id: 3, supply_name: "Urea", type: "IN", quantity: "5000", unit: "KG", date: "2025-12-05", provider_id: 3 },
          { id: 3, supply_id: 1, supply_name: "Glifosato", type: "OUT", quantity: "20", unit: "L", date: "2025-12-15", lot_id: 20 }
        ],
        page_info: { total: 3 }
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }),

  // 23. SUPPLY MOVEMENT POST (Crear movimiento)
  http.post(new RegExp(configService.baseManagerApi + "/supply_movements/\\d+"), async ({ request }) => {
    logRequest("POST", request.url);
    const body = await request.json() as any;
    return new HttpResponse(
      JSON.stringify({
        success: true,
        data: { id: 999, ...body }
      }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  }),

  // 24. SUPPLY MOVEMENT DELETE
  http.delete(new RegExp(configService.baseManagerApi + "/supply_movements/\\d+/\\d+"), ({ request }) => {
    logRequest("DELETE", request.url);
    return new HttpResponse(
      JSON.stringify({ success: true, message: "Movimiento eliminado" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }),

  // 25. STOCK (por proyecto)
  http.get(new RegExp(configService.baseManagerApi + "/stock.*"), ({ request }) => {
    logRequest("GET", request.url);
    return new HttpResponse(
      JSON.stringify({
        success: true,
        data: [
          { supply_id: 1, supply_name: "Glifosato", category: "SUPPLIES", quantity: "80", unit: "L", value_usd: "4000" },
          { supply_id: 3, supply_name: "Urea", category: "FERTILIZERS", quantity: "4850", unit: "KG", value_usd: "24250" },
          { supply_id: 4, supply_name: "Semilla Trigo DM", category: "SEED", quantity: "2000", unit: "KG", value_usd: "10000" }
        ],
        page_info: { total: 3 }
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }),

  // 26. OPTIONS (Opciones generales del sistema)
  http.get(new RegExp(configService.baseManagerApi + "/options.*"), ({ request }) => {
    logRequest("GET", request.url);
    return new HttpResponse(
      JSON.stringify({
        success: true,
        data: {
          lease_types: [
            { id: 1, name: "Fijo", code: "FIXED" },
            { id: 2, name: "Porcentaje", code: "PERCENTAGE" },
            { id: 3, name: "Quintales", code: "QUINTALS" },
            { id: 4, name: "Mixto", code: "MIXED" }
          ],
          units: [
            { id: 1, name: "Kilogramo", code: "KG" },
            { id: 2, name: "Litro", code: "L" },
            { id: 3, name: "Hectárea", code: "HA" },
            { id: 4, name: "Unidad", code: "UN" }
          ],
          status: [
            { id: 1, name: "Activo", code: "active" },
            { id: 2, name: "Inactivo", code: "inactive" }
          ]
        }
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }),

  // 27. REPORTS - Field Crop (Reporte por campo y cultivo)
  http.get(new RegExp(configService.baseManagerApi + "/reports/field-crop.*"), ({ request }) => {
    logRequest("GET", request.url);
    return new HttpResponse(
      JSON.stringify({
        success: true,
        data: {
          summary: {
            total_hectares: "22323",
            total_cost_usd: "500000",
            avg_cost_per_ha_usd: "22.4"
          },
          by_field: [
            {
              field_id: 10,
              field_name: "Campo 1",
              hectares: "22323",
              crops: [
                { crop_id: 3, crop_name: "Trigo", hectares: "22323", cost_usd: "500000" }
              ]
            }
          ]
        }
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }),

  // 28. REPORTS - Investor Contribution (Aportes de inversores)
  http.get(new RegExp(configService.baseManagerApi + "/reports/investor-contribution.*"), ({ request }) => {
    logRequest("GET", request.url);
    return new HttpResponse(
      JSON.stringify({
        success: true,
        data: {
          investors: [
            { id: 1, name: "Oscar", share_pct: "33", contributions_usd: "45000", pending_usd: "105000" },
            { id: 2, name: "Juli", share_pct: "34", contributions_usd: "37500", pending_usd: "112500" },
            { id: 3, name: "Carla", share_pct: "33", contributions_usd: "52500", pending_usd: "97500" }
          ],
          total_contributions_usd: "135000",
          total_pending_usd: "315000",
          total_required_usd: "450000"
        }
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }),

  // 29. REPORTS - Summary Results (Resultado resumen)
  http.get(new RegExp(configService.baseManagerApi + "/reports/summary-results.*"), ({ request }) => {
    logRequest("GET", request.url);
    return new HttpResponse(
      JSON.stringify({
        success: true,
        data: {
          total_income_usd: "600000",
          total_costs_usd: "500000",
          net_result_usd: "100000",
          margin_pct: "16.67",
          breakdown: {
            seed_costs: "30000",
            supplies_costs: "40000",
            fertilizers_costs: "25000",
            labors_costs: "20000",
            lease_costs: "5000",
            admin_costs: "5000"
          }
        }
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }),

  // 30. FIELD DELETE
  http.delete(new RegExp(configService.baseManagerApi + "/fields/\\d+"), ({ request }) => {
    logRequest("DELETE", request.url);
    return new HttpResponse(
      JSON.stringify({ success: true, message: "Campo eliminado" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }),

  // 31. DOLLARS (Cotización dólar)
  http.get(new RegExp(configService.baseManagerApi + "/dollars.*"), ({ request }) => {
    logRequest("GET", request.url);
    return new HttpResponse(
      JSON.stringify({
        success: true,
        data: [
          { id: 1, value: "1050", date: "2026-01-13" },
          { id: 2, value: "1045", date: "2026-01-12" },
          { id: 3, value: "1048", date: "2026-01-11" }
        ]
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }),

  // 32. COMMERCE (Comercialización)
  http.get(new RegExp(configService.baseManagerApi + "/commerce.*"), ({ request }) => {
    logRequest("GET", request.url);
    return new HttpResponse(
      JSON.stringify({
        success: true,
        data: [],
        page_info: { total: 0 }
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }),

  // 33. PRODUCTS (Productos - alias de supplies)
  http.get(new RegExp(configService.baseManagerApi + "/products.*"), ({ request }) => {
    logRequest("GET", request.url);
    return new HttpResponse(
      JSON.stringify({
        success: true,
        data: [],
        page_info: { total: 0 }
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }),
];