import { Router } from "express";
import { gitInRepo } from "../services/gitExecutor.js";
import { parseLog, parseDiff } from "../services/gitParser.js";

const router = Router();

// ── File tree ──

router.get("/tree", async (req, res, next) => {
  try {
    const repoPath = req.query.repo as string;
    if (!repoPath) return res.status(400).json({ error: "repo path required" });

    const ref = (req.query.ref as string) || "HEAD";

    const result = await gitInRepo(repoPath, [
      "ls-tree", "-r", "--name-only", ref,
    ]);

    if (result.exitCode !== 0) {
      return res.status(500).json({ error: result.stderr });
    }

    const files = result.stdout
      .split("\n")
      .filter(Boolean)
      .sort();

    res.json({ files });
  } catch (err) {
    next(err);
  }
});

// ── Blame ──

router.get("/blame", async (req, res, next) => {
  try {
    const repoPath = req.query.repo as string;
    const file = req.query.file as string;
    if (!repoPath || !file) {
      return res.status(400).json({ error: "repo and file required" });
    }

    const result = await gitInRepo(repoPath, [
      "blame", "--porcelain", "--", file,
    ]);

    if (result.exitCode !== 0) {
      return res.status(500).json({ error: result.stderr });
    }

    const lines: Array<{
      hash: string;
      shortHash: string;
      author: string;
      authorEmail: string;
      date: string;
      line: number;
      content: string;
      summary: string;
    }> = [];

    let currentHash = "";
    let currentAuthor = "";
    let currentAuthorEmail = "";
    let currentDate = "";
    let currentSummary = "";
    let lineNumber = 0;

    for (const raw of result.stdout.split("\n")) {
      if (raw.startsWith("\t")) {
        // Content line
        lineNumber += 1;
        lines.push({
          hash: currentHash,
          shortHash: currentHash.slice(0, 7),
          author: currentAuthor,
          authorEmail: currentAuthorEmail,
          date: currentDate,
          line: lineNumber,
          content: raw.slice(1), // strip tab
          summary: currentSummary,
        });
        continue;
      }

      // A new commit block starts with a 40-char hash followed by line numbers
      const spaceIndex = raw.indexOf(" ");
      if (spaceIndex > 0) {
        const firstToken = raw.slice(0, spaceIndex);
        if (/^[0-9a-f]{40}$/.test(firstToken)) {
          currentHash = firstToken;
          continue;
        }
      }

      // Porcelain fields
      if (raw.startsWith("author ")) {
        currentAuthor = raw.slice(7);
      } else if (raw.startsWith("author-mail ")) {
        currentAuthorEmail = raw.slice(12).replace(/^</, "").replace(/>$/, "");
      } else if (raw.startsWith("author-time ")) {
        const unix = Number(raw.slice(12));
        currentDate = unix ? new Date(unix * 1000).toISOString() : "";
      } else if (raw.startsWith("summary ")) {
        currentSummary = raw.slice(8);
      }
    }

    res.json({ lines });
  } catch (err) {
    next(err);
  }
});

// ── File history ──

router.get("/history", async (req, res, next) => {
  try {
    const repoPath = req.query.repo as string;
    const file = req.query.file as string;
    if (!repoPath || !file) {
      return res.status(400).json({ error: "repo and file required" });
    }

    const limit = Math.min(Number(req.query.limit) || 50, 200);

    const result = await gitInRepo(repoPath, [
      "log",
      `--format=%H|%h|%an|%ae|%ad|%s|%P|%D`,
      "--date=iso-strict",
      "--follow",
      `-n`, String(limit),
      "--",
      file,
    ]);

    if (result.exitCode !== 0) {
      return res.status(500).json({ error: result.stderr });
    }

    const commits = parseLog(result.stdout || "");
    res.json({ commits });
  } catch (err) {
    next(err);
  }
});

// ── Grep (code search) ──

router.get("/grep", async (req, res, next) => {
  try {
    const repoPath = req.query.repo as string;
    const pattern = req.query.pattern as string;
    if (!repoPath || !pattern) {
      return res.status(400).json({ error: "repo and pattern required" });
    }

    const caseInsensitive = req.query.ignoreCase !== "false";

    const args = ["grep", "-n", "--heading", "--break"];
    if (caseInsensitive) args.push("-i");
    args.push("-E", pattern);

    const result = await gitInRepo(repoPath, args);

    if (result.exitCode === 1) {
      // git grep exits 1 when no matches found — that's not an error
      return res.json({ matches: [] });
    }

    if (result.exitCode !== 0) {
      return res.status(500).json({ error: result.stderr });
    }

    const matches: Array<{ file: string; line: number; content: string }> = [];

    for (const raw of result.stdout.split("\n")) {
      if (!raw) continue;

      // Skip heading lines (just the filename, no colon-digit pattern)
      if (!/:\d+:/.test(raw)) continue;

      const colonIdx = raw.indexOf(":");
      const secondColonIdx = raw.indexOf(":", colonIdx + 1);

      if (colonIdx > 0 && secondColonIdx > colonIdx) {
        const file = raw.slice(0, colonIdx);
        const lineStr = raw.slice(colonIdx + 1, secondColonIdx);
        const lineNum = Number(lineStr);
        const content = raw.slice(secondColonIdx + 1);

        if (Number.isFinite(lineNum)) {
          matches.push({ file, line: lineNum, content });
        }
      }
    }

    res.json({ matches });
  } catch (err) {
    next(err);
  }
});

// ── Pickaxe search ──

router.get("/pickaxe", async (req, res, next) => {
  try {
    const repoPath = req.query.repo as string;
    const query = req.query.query as string;
    const mode = (req.query.mode as string) === "G" ? "G" : "S";
    if (!repoPath || !query) {
      return res.status(400).json({ error: "repo and query required" });
    }

    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const flag = mode === "G" ? "-G" : "-S";

    const result = await gitInRepo(repoPath, [
      "log",
      `--format=%H|%h|%an|%ae|%ad|%s|%P|%D`,
      "--date=iso-strict",
      flag, query,
      `-n`, String(limit),
    ]);

    if (result.exitCode !== 0) {
      return res.status(500).json({ error: result.stderr });
    }

    const commits = parseLog(result.stdout || "");
    res.json({ commits });
  } catch (err) {
    next(err);
  }
});

// ── Compare refs ──

router.get("/compare", async (req, res, next) => {
  try {
    const repoPath = req.query.repo as string;
    const from = req.query.from as string;
    const to = req.query.to as string;
    if (!repoPath || !from || !to) {
      return res.status(400).json({ error: "repo, from, and to required" });
    }

    const result = await gitInRepo(repoPath, [
      "diff", `${from}..${to}`,
    ]);

    if (result.exitCode !== 0) {
      return res.status(500).json({ error: result.stderr });
    }

    const diffs = parseDiff(result.stdout);
    res.json({ diffs });
  } catch (err) {
    next(err);
  }
});

export default router;
