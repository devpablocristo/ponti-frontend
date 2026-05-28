import { Router } from "express";

import auth from "./auth";
import options from "./options";
import projects from "./projects";
import customers from "./customers";
import campaigns from "./campaigns";
import fields from "./fields";
import lots from "./lots";
import crops from "./crops";
import supplies from "./supplies";
import { verifyToken } from "./authMiddleware";
import NodeCache from "node-cache";
import { CACHE_TTL_DEFAULT } from "../configService";
import categories from "./categories";
import types from "./types";
import workorders from "./workorders";
import labors from "./labors";
import providers from "./providers";
import movements from "./movements";
import stockMovements from "./stock_movements";
import stock from "./stock";
import dashboard from "./dashboard";
import reports from "./reports";
import dataIntegrity from "./data-integrity";
import ai from "./ai";
import admin from "./admin";
import insights from "./insights";
import me from "./me";
import { requestContext } from "../requestContext";

const router: Router = Router();
const nodeCache = new NodeCache({ stdTTL: CACHE_TTL_DEFAULT, checkperiod: CACHE_TTL_DEFAULT });

function scopedCachePrefix(): string {
  const tenantId = requestContext.getTenantId() || "no-tenant";
  const userId = requestContext.getUserId() || "no-user";
  return `tenant:${tenantId}:user:${userId}:`;
}

function scopedCacheKey(key: string | number): string {
  return `${scopedCachePrefix()}${String(key)}`;
}

function unscopedCacheKey(key: string): string {
  const prefix = scopedCachePrefix();
  return key.startsWith(prefix) ? key.slice(prefix.length) : key;
}

export const cache = {
  get<T>(key: string | number): T | undefined {
    return nodeCache.get<T>(scopedCacheKey(key));
  },
  set<T>(key: string | number, value: T, ttl?: number | string): boolean {
    if (ttl !== undefined) {
      return nodeCache.set(scopedCacheKey(key), value, ttl);
    }
    return nodeCache.set(scopedCacheKey(key), value);
  },
  del(keys: string | number | Array<string | number>): number {
    if (Array.isArray(keys)) {
      return nodeCache.del(keys.map(scopedCacheKey));
    }
    return nodeCache.del(scopedCacheKey(keys));
  },
  keys(): string[] {
    const prefix = scopedCachePrefix();
    return nodeCache.keys().filter((key) => key.startsWith(prefix)).map(unscopedCacheKey);
  },
  flushAll(): void {
    const prefix = scopedCachePrefix();
    const keys = nodeCache.keys().filter((key) => key.startsWith(prefix));
    if (keys.length > 0) {
      nodeCache.del(keys);
    }
  },
};

router.get("/ping", (req, res) => {
  res.status(200).json({ message: "UI says Pong!" });
});

router.get("/version", (_req, res) => {
  res.status(200).json({
    service: {
      name: process.env.SERVICE_NAME || "ponti-bff",
      version: process.env.SERVICE_VERSION || "",
      git_sha: process.env.SERVICE_GIT_SHA || "",
      build_time: process.env.SERVICE_BUILD_TIME || "",
    },
    api: {
      version: "v1",
    },
    timestamp: new Date().toISOString(),
  });
});

router.use("/auth", auth);

router.use(verifyToken);

router.use("/me", me);
router.use("/projects", projects);
router.use("/customers", customers);
router.use("/campaigns", campaigns);
router.use("/fields", fields);
router.use("/lots", lots);
router.use("/crops", crops);
router.use("/supplies", supplies);
router.use("/categories", categories);
router.use("/types", types);
router.use("/work-orders", workorders);
router.use("/labors", labors);
router.use("/providers", providers);
router.use("/supply_movements", movements);
router.use("/stock_movements", stockMovements);
router.use("/stock", stock);
router.use("/dashboard", dashboard);
router.use("/reports", reports);
router.use("/data-integrity", dataIntegrity);
router.use("/ai", ai);
router.use("/admin", admin);
router.use("/insights", insights);

router.use("/form-options", options);

export default router;
