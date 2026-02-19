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

const router: Router = Router();
export const cache = new NodeCache({ stdTTL: CACHE_TTL_DEFAULT, checkperiod: CACHE_TTL_DEFAULT });

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

router.use("/form-options", options);

export default router;
