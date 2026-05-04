import express from "express";
import cors from "cors";
import { existsSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { randomBytes } from "crypto";
import gitRoutes from "./routes/git.js";
import repoRoutes from "./routes/repos.js";
import systemRoutes from "./routes/system.js";
import { featureRoutes } from "./routes/hunksAndStash.js";
import explorerRoutes from "./routes/explorer.js";
import { errorHandler } from "./middleware/errorHandler.js";

const here = dirname(fileURLToPath(import.meta.url));

export const authToken = randomBytes(32).toString("hex");

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:4123",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:4123",
];

function findProjectRoot(startDir: string) {
  let current = startDir;

  while (current !== resolve(current, "..")) {
    if (existsSync(resolve(current, "package.json"))) {
      return current;
    }
    current = resolve(current, "..");
  }

  return startDir;
}

const projectRoot = findProjectRoot(here);
const clientDist = resolve(projectRoot, "dist");

export function createApp() {
  const app = express();

  app.use(cors({
    origin(origin, callback) {
      // Allow requests with no origin (Electron, curl, same-origin)
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS not allowed"));
      }
    },
  }));
  app.use(express.json());

  // Token-based auth: reject requests missing the secret header or query param
  app.use("/api", (req, _res, next) => {
    // Health endpoint is always accessible
    if (req.path === "/health") return next();
    const headerToken = req.headers["x-quanta-token"];
    const queryToken = req.query.token;
    if (headerToken === authToken || queryToken === authToken) {
      return next();
    }
    return next(Object.assign(new Error("Unauthorized"), { status: 401 }));
  });

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, token: authToken });
  });

  app.use("/api/git", gitRoutes);
  app.use("/api/repos", repoRoutes);
  app.use("/api/system", systemRoutes);
  app.use("/api", featureRoutes);
  app.use("/api/explorer", explorerRoutes);

  if (existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.use((req, res, next) => {
      if (req.path.startsWith("/api/")) {
        return next();
      }
      return res.sendFile(resolve(clientDist, "index.html"));
    });
  }

  app.use(errorHandler);

  return app;
}

export async function startServer(options?: { port?: number; host?: string }) {
  const app = createApp();
  const defaultPort = process.env.NODE_ENV === "production" ? "4123" : "3001";
  const port = options?.port ?? parseInt(process.env.PORT || defaultPort, 10);
  const host = options?.host ?? (process.env.HOST || "127.0.0.1");

  return new Promise<{ server: ReturnType<typeof app.listen>; token: string }>((resolveServer, reject) => {
    const server = app.listen(port, host, () => {
      console.log(`Quanta Control server running on http://${host}:${port}`);
      resolveServer({ server, token: authToken });
    });
    server.on("error", reject);
  });
}

if (process.env.QUANTA_CONTROL_CLI !== "1") {
  void startServer();
}
