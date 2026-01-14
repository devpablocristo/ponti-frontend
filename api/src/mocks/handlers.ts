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
    number: "OT-001",
    project_name: "Proyecto 3",
    field_name: "Campo listo 1",
    lot_name: "Lote 2",
    date: "2026-01-15",
    crop_name: "Trigo",
    labor_name: "Aplicación fertilizante",
    labor_category_name: "Fertilización",
    type_name: "Líquido",
    contractor: "Contratista A",
    surface_ha: "12000",
    supply_name: "Urea",
    consumption: "100",
    category_name: "Fertilizantes",
    dose: 50,
    cost_per_ha: 22.4,
    unit_price: 1.5,
    total_cost: 150,
    status: "pending",
    type_id: 4,
    lot_id: 20,
    field_id: 10
  },
  { 
    id: 102, 
    number: "OT-002",
    project_name: "Proyecto 2",
    field_name: "Campo 2",
    lot_name: "Lote 1",
    date: "2026-01-20",
    crop_name: "Trigo",
    labor_name: "Control plagas",
    labor_category_name: "Protección",
    type_name: "Químico",
    contractor: "Contratista B",
    surface_ha: "12000",
    supply_name: "Insecticida X",
    consumption: "50",
    category_name: "Agroquímicos",
    dose: 25,
    cost_per_ha: 18.5,
    unit_price: 2.0,
    total_cost: 100,
    status: "pending",
    type_id: 3,
    lot_id: 20,
    field_id: 11
  },
  { 
    id: 98, 
    number: "OT-003",
    project_name: "Proyecto 2",
    field_name: "Campo listo 1",
    lot_name: "Lote 2",
    date: "2025-12-10",
    crop_name: "Trigo",
    labor_name: "Siembra",
    labor_category_name: "Siembra",
    type_name: "Manual",
    contractor: "Contratista A",
    surface_ha: "12000",
    supply_name: "Semilla Trigo",
    consumption: "200",
    category_name: "Semillas",
    dose: 100,
    cost_per_ha: 30.0,
    unit_price: 0.5,
    total_cost: 100,
    status: "completed",
    type_id: 1,
    lot_id: 20,
    field_id: 10
  },
  { 
    id: 96, 
    number: "OT-005",
    project_name: "Proyecto 1",
    field_name: "Campo 3",
    lot_name: "Lote 3",
    date: "2025-11-25",
    crop_name: "Maíz",
    labor_name: "Preparación suelo",
    labor_category_name: "Preparación",
    type_name: "Mecánico",
    contractor: "Contratista C",
    surface_ha: "15000",
    supply_name: "Combustible",
    consumption: "300",
    category_name: "Combustibles",
    dose: 150,
    cost_per_ha: 25.0,
    unit_price: 1.8,
    total_cost: 540,
    status: "completed",
    type_id: 1,
    lot_id: 22,
    field_id: 12
  },
  { 
    id: 97, 
    number: "OT-006",
    project_name: "Proyecto 1",
    field_name: "Campo 3",
    lot_name: "Lote 4",
    date: "2025-11-20",
    crop_name: "Soja",
    labor_name: "Cosecha",
    labor_category_name: "Cosecha",
    type_name: "Mecánico",
    contractor: "Contratista A",
    surface_ha: "10000",
    supply_name: "Combustible",
    consumption: "200",
    category_name: "Combustibles",
    dose: 100,
    cost_per_ha: 20.0,
    unit_price: 1.8,
    total_cost: 360,
    status: "completed",
    type_id: 1,
    lot_id: 23,
    field_id: 13
  }
];

// Function to calculate metrics from workorders
const calculateWorkorderMetrics = () => {
  // Surface: sum all surface_ha from all workorders
  const surface_ha = MOCK_WORKORDERS
    .reduce((sum, wo) => sum + parseFloat(wo.surface_ha), 0);

  // Liters: sum consumption where type is "Líquido"
  const liters = MOCK_WORKORDERS
    .filter(wo => wo.type_name === "Líquido")
    .reduce((sum, wo) => sum + parseFloat(wo.consumption), 0);

  // Kilograms: sum consumption where type is NOT "Líquido"
  const kilograms = MOCK_WORKORDERS
    .filter(wo => wo.type_name !== "Líquido")
    .reduce((sum, wo) => sum + parseFloat(wo.consumption), 0);

  // Direct cost: sum of all total_cost
  const direct_cost = MOCK_WORKORDERS
    .reduce((sum, wo) => sum + wo.total_cost, 0);

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
      name: "Proyecto Alpha",
      customer: { id: 1, name: "Oscar Salomon" },
      campaign: { id: 3, name: "2026-2027" },
      managers: [{ name: "Manager 1" }],
      investors: [
        { id: 1, name: "Oscar", percentage: "33" },
        { id: 2, name: "Juli", percentage: "34" },
        { id: 3, name: "Carla", percentage: "33" }
      ],
      fields: [ 
        { id: 10, name: "Campo 1" }, 
        { id: 11, name: "Campo 2" } 
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
          { id: 10, name: "Campo listo 1", status: "active", project_id: 1 },
          { id: 11, name: "Campo 2", status: "active", project_id: 1 },
          { id: 12, name: "Campo 3", status: "active", project_id: 1 },
          { id: 13, name: "Campo 4", status: "active", project_id: 1 }
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
              name: "Campo listo 1",
              lease_type_id: 4,
              lease_type_percent: 21,
              lease_type_value: 200,
              lots: [ { id: 20, name: "Lote 1", hectares: 22323 } ]
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
        seeded_area: 22323,
        harvested_area: 0,
        yield_tn_per_ha: 8,
        cost_per_hectare: 22.4,
        superficie_total: 22323
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }),

  // 18A. LOTS METRICS (Endpoint alternativo, el backend lo usa internamente)
  http.get(new RegExp(configService.baseManagerApi + "/lots/metrics"), ({ request }) => {
    logRequest("GET", request.url);
    return new HttpResponse(
      JSON.stringify({
        seeded_area: 22323,
        harvested_area: 0,
        yield_tn_per_ha: 8,
        cost_per_hectare: 22.4,
        superficie_total: 22323
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
            lot_name: "Lote 1",
            field_id: 10,
            field_name: "Campo listo 1",
            project_id: 1,
            project_name: "Proyecto Alpha",
            hectares: "12000",
            harvested_area: "0",
            crop_id: 3, 
            crop_name: "Trigo",
            previous_crop: "Soja",
            current_crop: "Trigo",
            variety: "DM STS",
            status: "active",
            dates: [{ sequence: 1, sowing_date: "2026-06-15", harvest_date: "" }],
            tons: "0",
            cost_usd_per_ha: "22.4",
            yield_tn_per_ha: "8",
            income_net_per_ha: "15",
            rent_per_ha: "5",
            active_total_per_ha: "25",
            operating_result_per_ha: "10"
          },
          { 
            id: 21, 
            lot_name: "Lote 2",
            field_id: 10,
            field_name: "Campo listo 1",
            project_id: 1,
            project_name: "Proyecto Alpha",
            hectares: "10323",
            harvested_area: "0",
            crop_id: 3, 
            crop_name: "Trigo",
            previous_crop: "Girasol",
            current_crop: "Trigo",
            variety: "DM STS",
            status: "active",
            dates: [{ sequence: 1, sowing_date: "2026-06-20", harvest_date: "" }],
            tons: "0",
            cost_usd_per_ha: "20.5",
            yield_tn_per_ha: "7.5",
            income_net_per_ha: "14",
            rent_per_ha: "4.5",
            active_total_per_ha: "24",
            operating_result_per_ha: "9.5"
          }
        ],
        page_info: { total: 2 }
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }),

  // 19. WORKORDERS METRICS (Debe ir ANTES del handler general)
  http.get(new RegExp(configService.baseManagerApi + "/workorders/metrics"), ({ request }) => {
    logRequest("GET", request.url);
    const metrics = calculateWorkorderMetrics();
    return new HttpResponse(
      JSON.stringify(metrics),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }),

  // 19B. WORKORDERS (Órdenes de trabajo)
  http.get(new RegExp(configService.baseManagerApi + "/workorders"), ({ request }) => {
    logRequest("GET", request.url);
    return new HttpResponse(
      JSON.stringify({
        items: MOCK_WORKORDERS,
        page_info: { total: MOCK_WORKORDERS.length }
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
              field_name: "Campo listo 1",
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