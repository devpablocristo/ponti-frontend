const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const http = require("http");

let managerServer;
let managerBaseURL;
let managerRequests = [];
let bffServer;
let bffBaseURL;
let stockRouter;
let cache;

function listen(app) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const address = server.address();
      resolve({
        server,
        url: `http://127.0.0.1:${address.port}`,
      });
    });
    server.on("error", reject);
  });
}

async function requestJSON(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json();
  return { status: response.status, data };
}

test.before(async () => {
  const managerApp = express();
  managerApp.use(express.json());

  managerApp.get("/projects/:projectId/stocks/summary", (req, res) => {
    managerRequests.push({
      method: "GET",
      path: req.path,
      query: req.query,
      headers: req.headers,
    });

    res.json({
      items: [
        {
          supply_id: 9,
          supply_name: "Urea",
          entry_stock: 103,
          out_stock: 30,
          consumed: 7,
          stock_units: 66,
          real_stock_units: 70,
          last_count_at: "2026-04-21T12:00:00Z",
          has_real_stock_count: true,
          total_usd: 264,
          class_type: "Fertilizantes",
          supply_unit_id: 1,
          supply_unit_price: 4,
          stock_difference: 4,
        },
      ],
      net_total_usd: 264,
      total_liters: 0,
      total_kilograms: 103,
    });
  });

  managerApp.post("/projects/:projectId/supplies/:supplyId/stock-counts", (req, res) => {
    managerRequests.push({
      method: "POST",
      path: req.path,
      body: req.body,
      headers: req.headers,
    });

    res.status(201).json({
      id: 55,
      message: "stock count created successfully",
    });
  });

  const manager = await listen(managerApp);
  managerServer = manager.server;
  managerBaseURL = manager.url;

  process.env.BASE_MANAGER_API = managerBaseURL;
  process.env.X_API_KEY = "test-api-key";

  const modulesToClear = ["../dist/configService", "../dist/routes/index", "../dist/routes/stock"];
  for (const modulePath of modulesToClear) {
    delete require.cache[require.resolve(modulePath)];
  }

  cache = {
    store: new Map(),
    get(key) {
      return this.store.get(key);
    },
    set(key, value) {
      this.store.set(key, value);
    },
    flushAll() {
      this.store.clear();
    },
  };

  const indexPath = require.resolve("../dist/routes/index");
  require.cache[indexPath] = {
    id: indexPath,
    filename: indexPath,
    loaded: true,
    exports: { cache },
  };

  stockRouter = require("../dist/routes/stock").default;

  const bffApp = express();
  bffApp.use(express.json());
  bffApp.use((req, _res, next) => {
    req.user = {
      status: "active",
      userID: "user-123",
      rolID: null,
      hash: "",
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    next();
  });
  bffApp.use("/stock", stockRouter);

  const bff = await listen(bffApp);
  bffServer = bff.server;
  bffBaseURL = bff.url;
});

test.after(async () => {
  cache?.flushAll();
  if (bffServer) {
    await new Promise((resolve, reject) => bffServer.close((err) => (err ? reject(err) : resolve())));
  }
  if (managerServer) {
    await new Promise((resolve, reject) =>
      managerServer.close((err) => (err ? reject(err) : resolve())),
    );
  }
});

test.beforeEach(() => {
  managerRequests = [];
  cache.flushAll();
});

test("GET /stock/:id proxya el summary continuo con cutoff_date", async () => {
  const response = await requestJSON(
    `${bffBaseURL}/stock/7?cutoff_date=2026-04-21`,
  );

  assert.equal(response.status, 200);
  assert.equal(response.data.success, true);
  assert.equal(response.data.data.items[0].supply_id, 9);
  assert.equal(response.data.data.items[0].out_stock, 30);
  assert.equal(response.data.data.items[0].last_count_at, "2026-04-21T12:00:00Z");

  assert.equal(managerRequests.length, 1);
  assert.deepEqual(managerRequests[0], {
    method: "GET",
    path: "/projects/7/stocks/summary",
    query: { cutoff_date: "2026-04-21" },
    headers: {
      ...managerRequests[0].headers,
      "x-api-key": "test-api-key",
      "x-user-id": "user-123",
    },
  });
});

test("POST /stock/:projectId/supplies/:supplyId/counts crea un conteo físico y limpia cache", async () => {
  const warmup = await requestJSON(`${bffBaseURL}/stock/7`);
  assert.equal(warmup.status, 200);
  assert.equal(managerRequests.length, 1);

  const response = await requestJSON(
    `${bffBaseURL}/stock/7/supplies/9/counts`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        counted_units: 82,
        counted_at: "2026-04-22T15:04:05Z",
        note: "Conteo abril",
      }),
    },
  );

  assert.equal(response.status, 201);
  assert.equal(response.data.success, true);
  assert.equal(response.data.data.id, 55);

  assert.equal(managerRequests[1].method, "POST");
  assert.equal(managerRequests[1].path, "/projects/7/supplies/9/stock-counts");
  assert.equal(managerRequests[1].body.counted_units, 82);
  assert.equal(managerRequests[1].body.counted_at, "2026-04-22T15:04:05Z");
  assert.equal(managerRequests[1].body.note, "Conteo abril");
  assert.equal(managerRequests[1].headers["x-api-key"], "test-api-key");
  assert.equal(managerRequests[1].headers["x-user-id"], "user-123");

  await requestJSON(`${bffBaseURL}/stock/7`);
  assert.equal(managerRequests.length, 3);
});
