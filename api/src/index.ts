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

// Importante: NO usar mocks en el BFF.
// Este servicio siempre debe proxy-ear al backend real.
console.log("Backend real (mocks desactivados).");

app.use("/api/v1", routes);

app.get("/*", (_, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
