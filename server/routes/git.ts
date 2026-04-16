import { Router } from "express";
import { appendFile, readFile, writeFile } from "fs/promises";
import { join } from "path";
import { gitInRepo, expandPath } from "../services/gitExecutor.js";
import { parseStatus, parseDiff, parseLog, parseBranches, parseRemotes } from "../services/gitParser.js";

const router = Router();

function requireRepoPath(req: any, _res: any, next: any) {
  const repoPath = req.query.repo as string || req.body?.repo;
  if (!repoPath) {
    return next(new Error("repo path is required"));
  }
  next();
}

router.get("/status", async (req, res, next) => {
  try {
    const repoPath = req.query.repo as string;
    if (!repoPath) return res.status(400).json({ error: "repo path required" });

    const result = await gitInRepo(repoPath, [
      "status", "--porcelain", "--branch",
    ]);
    if (result.exitCode !== 0) {
      return res.status(500).json({ error: result.stderr });
    }

    const status = parseStatus(result.stdout);

    const numstatUnstaged = await gitInRepo(repoPath, [
      "diff", "--numstat", "--no-color",
    ]);
    const numstatStaged = await gitInRepo(repoPath, [
      "diff", "--cached", "--numstat", "--no-color",
    ]);

    const stats = new Map<string, { additions: number; deletions: number }>();
    for (const line of numstatUnstaged.stdout.split("\n").filter(Boolean)) {
      const [add, del, file] = line.split("\t");
      if (file) stats.set(file, { additions: parseInt(add ?? "0", 10) || 0, deletions: parseInt(del ?? "0", 10) || 0 });
    }
    for (const line of numstatStaged.stdout.split("\n").filter(Boolean)) {
      const [add, del, file] = line.split("\t");
      if (file) {
        const existing = stats.get(file);
        if (existing) {
          existing.additions += parseInt(add ?? "0", 10) || 0;
          existing.deletions += parseInt(del ?? "0", 10) || 0;
        } else {
          stats.set(file, { additions: parseInt(add ?? "0", 10) || 0, deletions: parseInt(del ?? "0", 10) || 0 });
        }
      }
    }

    for (const file of status.files) {
      const s = stats.get(file.path);
      if (s) {
        file.additions = s.additions;
        file.deletions = s.deletions;
      }
    }

    res.json(status);
  } catch (err) {
    next(err);
  }
});

router.get("/diff", async (req, res, next) => {
  try {
    const { repo, file, staged } = req.query as Record<string, string>;
    if (!repo) return res.status(400).json({ error: "repo path required" });

    const args = ["diff"];
    if (staged === "true") args.push("--cached");
    if (file) args.push("--", file);
    args.push("--no-color");

    const result = await gitInRepo(repo, args);
    if (result.exitCode !== 0) {
      return res.status(500).json({ error: result.stderr });
    }

    const diffs = parseDiff(result.stdout);
    res.json(diffs);
  } catch (err) {
    next(err);
  }
});

router.post("/stage", async (req, res, next) => {
  try {
    const { repo, files } = req.body;
    if (!repo) return res.status(400).json({ error: "repo path required" });

    const filesArg = files?.length ? files : ["."];
    const result = await gitInRepo(repo, ["add", ...filesArg]);
    if (result.exitCode !== 0) {
      return res.status(500).json({ error: result.stderr });
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.post("/unstage", async (req, res, next) => {
  try {
    const { repo, files } = req.body;
    if (!repo) return res.status(400).json({ error: "repo path required" });

    const filesArg = files?.length ? files : ["."];
    const result = await gitInRepo(repo, ["reset", "HEAD", "--", ...filesArg]);
    if (result.exitCode !== 0) {
      return res.status(500).json({ error: result.stderr });
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.post("/commit", async (req, res, next) => {
  try {
    const { repo, message, amend } = req.body;
    if (!repo || !message) {
      return res.status(400).json({ error: "repo and message required" });
    }

    const args = ["commit", "-m", message];
    if (amend) args.push("--amend", "--no-edit");

    const result = await gitInRepo(repo, args);
    if (result.exitCode !== 0) {
      return res.status(500).json({ error: result.stderr });
    }
    res.json({ success: true, output: result.stdout });
  } catch (err) {
    next(err);
  }
});

router.get("/log", async (req, res, next) => {
  try {
    const repo = req.query.repo as string;
    const count = parseInt(req.query.count as string) || 50;
    const branch = req.query.branch as string;

    if (!repo) return res.status(400).json({ error: "repo path required" });

    const sep = "|||QUANTA|||";
    const format = `%H%n%h%n%an%n%ae%n%aI%n%s%n${sep}`;
    const args = ["log", `--max-count=${count}`, `--format=${format}`];
    if (branch) args.push(branch);

    const result = await gitInRepo(repo, args);
    if (result.exitCode !== 0) {
      return res.status(500).json({ error: result.stderr });
    }

    const commits = parseLog(result.stdout);
    res.json(commits);
  } catch (err) {
    next(err);
  }
});

router.get("/branches", async (req, res, next) => {
  try {
    const repo = req.query.repo as string;
    if (!repo) return res.status(400).json({ error: "repo path required" });

    const result = await gitInRepo(repo, ["branch", "-a", "--no-color"]);
    if (result.exitCode !== 0) {
      return res.status(500).json({ error: result.stderr });
    }

    const branches = parseBranches(result.stdout);
    res.json(branches);
  } catch (err) {
    next(err);
  }
});

router.post("/checkout", async (req, res, next) => {
  try {
    const { repo, branch, create: shouldCreate } = req.body;
    if (!repo || !branch) {
      return res.status(400).json({ error: "repo and branch required" });
    }

    const args = ["checkout"];
    if (shouldCreate) args.push("-b");
    args.push(branch);

    const result = await gitInRepo(repo, args);
    if (result.exitCode !== 0) {
      return res.status(500).json({ error: result.stderr });
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.post("/delete-branch", async (req, res, next) => {
  try {
    const { repo, branch, force } = req.body;
    if (!repo || !branch) {
      return res.status(400).json({ error: "repo and branch required" });
    }

    const flag = force ? "-D" : "-d";
    const result = await gitInRepo(repo, ["branch", flag, branch]);
    if (result.exitCode !== 0) {
      return res.status(500).json({ error: result.stderr });
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.get("/remotes", async (req, res, next) => {
  try {
    const repo = req.query.repo as string;
    if (!repo) return res.status(400).json({ error: "repo path required" });

    const result = await gitInRepo(repo, ["remote", "-v"]);
    if (result.exitCode !== 0) {
      return res.status(500).json({ error: result.stderr });
    }

    const remotes = parseRemotes(result.stdout);
    res.json(remotes);
  } catch (err) {
    next(err);
  }
});

router.post("/fetch", async (req, res, next) => {
  try {
    const { repo, remote } = req.body;
    if (!repo) return res.status(400).json({ error: "repo path required" });

    const args = ["fetch"];
    if (remote) args.push(remote);

    const result = await gitInRepo(repo, args);
    if (result.exitCode !== 0) {
      return res.status(500).json({ error: result.stderr });
    }
    res.json({ success: true, output: result.stdout });
  } catch (err) {
    next(err);
  }
});

router.post("/pull", async (req, res, next) => {
  try {
    const { repo, remote, branch } = req.body;
    if (!repo) return res.status(400).json({ error: "repo path required" });

    const args = ["pull"];
    if (remote) args.push(remote);
    if (branch) args.push(branch);

    const result = await gitInRepo(repo, args);
    if (result.exitCode !== 0) {
      return res.status(500).json({ error: result.stderr });
    }
    res.json({ success: true, output: result.stdout });
  } catch (err) {
    next(err);
  }
});

router.post("/push", async (req, res, next) => {
  try {
    const { repo, remote, branch, force } = req.body;
    if (!repo) return res.status(400).json({ error: "repo path required" });

    const args = ["push"];
    if (force) args.push("--force-with-lease");
    if (remote) args.push(remote);
    if (branch) args.push(branch);

    const result = await gitInRepo(repo, args);
    if (result.exitCode !== 0) {
      return res.status(500).json({ error: result.stderr });
    }
    res.json({ success: true, output: result.stdout });
  } catch (err) {
    next(err);
  }
});

router.post("/stash", async (req, res, next) => {
  try {
    const { repo, message, pop } = req.body;
    if (!repo) return res.status(400).json({ error: "repo path required" });

    const args = pop ? ["stash", "pop"] : ["stash", "push"];
    if (message && !pop) args.push("-m", message);

    const result = await gitInRepo(repo, args);
    if (result.exitCode !== 0) {
      return res.status(500).json({ error: result.stderr });
    }
    res.json({ success: true, output: result.stdout });
  } catch (err) {
    next(err);
  }
});

router.post("/discard", async (req, res, next) => {
  try {
    const { repo, files } = req.body;
    if (!repo) return res.status(400).json({ error: "repo path required" });

    if (files?.length) {
      const result = await gitInRepo(repo, ["checkout", "--", ...files]);
      if (result.exitCode !== 0) {
        return res.status(500).json({ error: result.stderr });
      }
    } else {
      const result = await gitInRepo(repo, ["checkout", "--", "."]);
      if (result.exitCode !== 0) {
        return res.status(500).json({ error: result.stderr });
      }
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.post("/gitignore", async (req, res, next) => {
  try {
    const { repo, patterns } = req.body;
    if (!repo) return res.status(400).json({ error: "repo path required" });
    if (!patterns?.length) return res.status(400).json({ error: "patterns required" });

    const gitignorePath = join(expandPath(repo), ".gitignore");

    let content = "";
    try {
      content = await readFile(gitignorePath, "utf-8");
    } catch {}

    const lines = content.split("\n");
    const existing = new Set(lines.map((l: string) => l.trim()));

    const newPatterns = patterns.filter((p: string) => !existing.has(p));
    if (newPatterns.length === 0) {
      return res.json({ success: true, added: [] });
    }

    const addition = (content && !content.endsWith("\n") ? "\n" : "") + newPatterns.join("\n") + "\n";

    await appendFile(gitignorePath, addition, "utf-8");

    const rmResult = await gitInRepo(repo, ["rm", "--cached", "--quiet", ...newPatterns.filter((p: string) => !p.endsWith("/"))]).catch(() => null);

    res.json({ success: true, added: newPatterns });
  } catch (err) {
    next(err);
  }
});

router.get("/config", async (req, res, next) => {
  try {
    const repo = req.query.repo as string;
    const key = req.query.key as string;
    if (!repo) return res.status(400).json({ error: "repo path required" });
    if (!key) return res.status(400).json({ error: "key required" });

    const result = await gitInRepo(repo, ["config", "--get", key]);
    if (result.exitCode !== 0) {
      return res.json({ value: "" });
    }
    res.json({ value: result.stdout.trim() });
  } catch (err) {
    next(err);
  }
});

export default router;
