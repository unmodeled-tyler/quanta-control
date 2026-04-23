import express from "express";
import cors from "cors";
import { existsSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import gitRoutes from "./routes/git.js";
import repoRoutes from "./routes/repos.js";
import systemRoutes from "./routes/system.js";
import { featureRoutes } from "./routes/hunksAndStash.js";
import { errorHandler } from "./middleware/errorHandler.js";

const here = dirname(fileURLToPath(import.meta.url));

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

  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/git", gitRoutes);
  app.use("/api/repos", repoRoutes);
  app.use("/api/system", systemRoutes);
  app.use("/api", featureRoutes);

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

  return new Promise<ReturnType<typeof app.listen>>((resolveServer) => {
    const server = app.listen(port, host, () => {
      console.log(`Quanta Control server running on http://${host}:${port}`);
      resolveServer(server);
    });
  });
}

if (process.env.QUANTA_CONTROL_CLI !== "1") {
  void startServer();
}
