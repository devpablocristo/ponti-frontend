import express from "express";
import dotenv from "dotenv";
import routes from "./routes";
import path from "path";
import { requestContext } from "./requestContext";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const frontendPath = path.join(__dirname, "public");
app.use(express.static(frontendPath));

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

// MSW mocks: solo se activan si ENABLE_MOCKS=1 (opt-in explícito).
// En local con backend real, NO se deben activar. Solo usar para testing aislado del BFF.
if (process.env.ENABLE_MOCKS === "1") {
  console.log("⚠️  MSW mocks ACTIVOS — las peticiones NO van al backend real.");

  const { server } = require("./mocks/server");
  server.listen();
} else {
  console.log("Backend real (MSW desactivado).");
}

app.use("/api", routes);

app.get("/*", (_, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
