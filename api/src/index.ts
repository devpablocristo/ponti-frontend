import express from "express";
import dotenv from "dotenv";
import routes from "./routes";
import fs from "fs";
import path from "path";
import { requestContext } from "./requestContext";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const canonicalHost = (process.env.CANONICAL_HOST || "").trim().toLowerCase();
const frontendPath = path.join(__dirname, "public");
const frontendIndex = path.join(frontendPath, "index.html");
const hasFrontendBundle = fs.existsSync(frontendIndex);

app.set("trust proxy", true);

if (canonicalHost) {
  app.use((req, res, next) => {
    const incomingHost = (req.headers.host || "").split(":")[0].toLowerCase();
    if (!incomingHost || incomingHost === canonicalHost) {
      next();
      return;
    }

    const forwardedProto = String(req.headers["x-forwarded-proto"] || "")
      .split(",")[0]
      .trim()
      .toLowerCase();
    const protocol = forwardedProto || req.protocol || "https";

    res.redirect(308, `${protocol}://${canonicalHost}${req.originalUrl}`);
  });
}

if (hasFrontendBundle) {
  app.use(express.static(frontendPath));
}

app.use(express.json({ limit: "150mb" }));
app.use(express.urlencoded({ extended: true, limit: "150mb" }));
app.use((req, _res, next) => {
  requestContext.run(
    {
      authorization:
        typeof req.headers.authorization === "string"
          ? req.headers.authorization
          : undefined,
    },
    next
  );
});

// Importante: NO usar mocks en el BFF.
// Este servicio siempre debe proxy-ear al backend real.
console.log("Backend real (mocks desactivados).");

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

// Las respuestas del API son datos dinámicos por proyecto: nunca deben cachearse
// (ni por el navegador, ni por proxies/CDN intermedios). El BFF ya es un proxy
// directo a la BDD, así que siempre se sirve fresco.
app.use("/api/v1", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

app.use("/api/v1", routes);

if (hasFrontendBundle) {
  app.get("/*", (_, res) => {
    res.sendFile(frontendIndex);
  });
}

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
