import { Router } from "express";
import { readdir, stat } from "fs/promises";
import { join, basename, resolve } from "path";
import { homedir } from "os";
import { isGitRepo, expandPath } from "../services/gitExecutor.js";

const router = Router();

router.get("/validate", async (req, res) => {
  const rawPath = req.query.path as string;
  if (!rawPath) return res.status(400).json({ error: "path required" });

  const resolved = expandPath(rawPath);
  const valid = await isGitRepo(resolved);
  res.json({ valid, resolvedPath: resolved });
});

router.get("/browse", async (req, res) => {
  const rawPath = (req.query.path as string) || "~";
  const dir = expandPath(rawPath);

  try {
    const s = await stat(dir);
    if (!s.isDirectory()) {
      return res.json({ path: dir, isGitRepo: false, children: [] });
    }
  } catch {
    return res.status(404).json({ error: "Directory not found" });
  }

  const isRepo = await isGitRepo(dir);
  const entries = await readdir(dir);
  const children: Array<{
    name: string;
    path: string;
    isDirectory: boolean;
    isGitRepo: boolean;
  }> = [];

  const hidden = req.query.hidden === "true";

  for (const entry of entries) {
    if (!hidden && entry.startsWith(".") && entry !== ".git") continue;
    const fullPath = join(dir, entry);
    try {
      const s = await stat(fullPath);
      if (s.isDirectory()) {
        const childIsRepo = await isGitRepo(fullPath);
        children.push({
          name: entry,
          path: fullPath,
          isDirectory: true,
          isGitRepo: childIsRepo,
        });
      }
    } catch {}
  }

  children.sort((a, b) => {
    if (a.isGitRepo !== b.isGitRepo) return a.isGitRepo ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  res.json({ path: dir, isGitRepo: isRepo, children });
});

router.get("/recent", async (_req, res) => {
  const home = homedir();

  const candidates = [
    join(home, "projects"),
    join(home, "repos"),
    join(home, "code"),
    join(home, "src"),
    join(home, "Developer"),
    join(home, "workspace"),
    join(home, "work"),
    home,
  ];

  const repos: Array<{ name: string; path: string }> = [];

  for (const dir of candidates) {
    try {
      const entries = await readdir(dir);
      for (const entry of entries.slice(0, 50)) {
        const fullPath = join(dir, entry);
        try {
          const s = await stat(fullPath);
          if (s.isDirectory()) {
            const valid = await isGitRepo(fullPath);
            if (valid) {
              repos.push({ name: entry, path: fullPath });
            }
          }
        } catch {}
      }
    } catch {}
  }

  res.json(repos);
});

export default router;
