import type {
  GitFile,
  FileStatus,
  StagedStatus,
  StatusResult,
  DiffHunk,
  FileDiff,
  CommitInfo,
  Branch,
  Remote,
} from "../../src/types/git.js";

export const LOG_SEPARATOR = "|||QUANTA|||";

type StatusMapping = { status: FileStatus; stagedStatus: StagedStatus };

// Table-driven XY pair lookup: porcelain v1 index + working-tree status
const STATUS_TABLE: Record<string, StatusMapping> = {
  "?": { status: "untracked", stagedStatus: "unstaged" },
  "!": { status: "untracked", stagedStatus: "unstaged" },
  // Conflicted (any U in either column)
  "U ": { status: "conflicted", stagedStatus: "partially_staged" },
  " U": { status: "conflicted", stagedStatus: "partially_staged" },
  UU:  { status: "conflicted", stagedStatus: "partially_staged" },
};

const X_STATUS: Record<string, FileStatus> = {
  M: "modified", A: "added", D: "deleted", R: "renamed", C: "copied", U: "conflicted",
};

const Y_STATUS: Record<string, FileStatus> = {
  M: "modified", A: "added", D: "deleted", U: "conflicted",
};

function resolveFileStatus(x: string, y: string): StatusMapping {
  if (x === "?" && y === "?") return STATUS_TABLE["?"]!;
  if (x === "U" || y === "U") return STATUS_TABLE["U "]!;

  if (x !== " " && y !== " ") {
    return { status: Y_STATUS[y] ?? "modified", stagedStatus: "partially_staged" };
  }
  if (x !== " ") {
    return { status: X_STATUS[x] ?? "modified", stagedStatus: "staged" };
  }
  return { status: Y_STATUS[y] ?? "modified", stagedStatus: "unstaged" };
}

export function parseStatus(output: string): StatusResult {
  const files: GitFile[] = [];
  let branch = "";
  let ahead = 0;
  let behind = 0;

  for (const line of output.split("\n").filter(Boolean)) {
    if (line.startsWith("## ")) {
      const header = line.slice(3);
      const branchMatch = header.match(
        /^(.+?)\.\.\.(.+?)(?:\s+\[(ahead\s+(\d+))?(,?\s*behind\s+(\d+))?(?:,\s*)?(gone)?\])?$/,
      );
      if (branchMatch) {
        branch = branchMatch[1] ?? "";
        ahead = branchMatch[4] ? parseInt(branchMatch[4], 10) : 0;
        behind = branchMatch[6] ? parseInt(branchMatch[6], 10) : 0;
      } else {
        branch = header.replace(/\s+\[.*\]/, "");
      }
      continue;
    }

    if (line.length < 4) continue;

    let status: FileStatus;
    let stagedStatus: StagedStatus;
    let oldPath: string | undefined;
    let filePath: string;

    const x = line[0] ?? " ";
    const y = line[1] ?? " ";
    const pathPart = line.slice(3);

    if (x === "R" || x === "C") {
      const parts = pathPart.split(" -> ");
      oldPath = parts[0];
      filePath = parts[1] ?? parts[0] ?? pathPart;
      status = X_STATUS[x] ?? "modified";
      stagedStatus = y !== " " ? "partially_staged" : "staged";
    } else {
      ({ status, stagedStatus } = resolveFileStatus(x, y));
      filePath = pathPart;
    }

    files.push({
      path: filePath,
      oldPath,
      status,
      stagedStatus,
      additions: 0,
      deletions: 0,
    });
  }

  const staged = files.filter((f) => f.stagedStatus === "staged" || f.stagedStatus === "partially_staged").length;
  const unstaged = files.filter((f) => f.stagedStatus === "unstaged" || f.stagedStatus === "partially_staged").length;
  const untracked = files.filter((f) => f.status === "untracked").length;
  const conflicted = files.filter((f) => f.status === "conflicted").length;

  return { branch, files, ahead, behind, staged, unstaged, untracked, conflicted };
}

export function parseDiff(output: string): FileDiff[] {
  if (!output.trim()) return [];

  const diffs: FileDiff[] = [];
  const diffBlocks = output.split(/(?=^diff --git )/m).filter(Boolean);

  for (const block of diffBlocks) {
    const pathMatch = block.match(/^diff --git a\/(.+?) b\/(.+?)$/m);
    if (!pathMatch) continue;

    const isBinary = block.includes("Binary files");
    const additionsMatch = block.match(/^\+(?!\+\+).*$/gm);
    const deletionsMatch = block.match(/^-(?!--).*$/gm);

    const hunks: DiffHunk[] = [];

    if (!isBinary) {
      const lines = block.split("\n");
      let currentHunk: DiffHunk | null = null;
      let oldLine = 0;
      let newLine = 0;

      for (const line of lines) {
        const hunkMatch = line.match(
          /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)/,
        );
        if (hunkMatch) {
          if (currentHunk) hunks.push(currentHunk);
          oldLine = parseInt(hunkMatch[1] ?? "0", 10);
          newLine = parseInt(hunkMatch[3] ?? "0", 10);
          currentHunk = {
            oldStart: oldLine,
            oldLines: parseInt(hunkMatch[2] || "1", 10),
            newStart: newLine,
            newLines: parseInt(hunkMatch[4] || "1", 10),
            header: hunkMatch[5] || "",
            lines: [],
          };
          continue;
        }

        if (!currentHunk) continue;
        if (line.startsWith("diff --git") || line.startsWith("---") || line.startsWith("+++")) continue;

        if (line.startsWith("+")) {
          currentHunk.lines.push({
            type: "add",
            content: line.slice(1),
            newLineNumber: newLine++,
          });
        } else if (line.startsWith("-")) {
          currentHunk.lines.push({
            type: "delete",
            content: line.slice(1),
            oldLineNumber: oldLine++,
          });
        } else if (line.startsWith(" ")) {
          currentHunk.lines.push({
            type: "context",
            content: line.slice(1),
            oldLineNumber: oldLine++,
            newLineNumber: newLine++,
          });
        }
      }

      if (currentHunk) hunks.push(currentHunk);
    }

    diffs.push({
      path: pathMatch[2] ?? "",
      oldPath: pathMatch[1] !== pathMatch[2] ? pathMatch[1] : undefined,
      additions: additionsMatch?.length ?? 0,
      deletions: deletionsMatch?.length ?? 0,
      hunks,
      isBinary,
    });
  }

  return diffs;
}

export function parseLog(output: string): CommitInfo[] {
  if (!output.trim()) return [];

  const sep = LOG_SEPARATOR;
  const commits = output.split(sep).map((p) => p.trim()).filter(Boolean);

  return commits.map((raw) => {
    const lines = raw.split("\n");
    const hash = lines[0]?.trim() ?? "";
    const shortHash = lines[1]?.trim() ?? "";
    const author = lines[2]?.trim() ?? "";
    const email = lines[3]?.trim() ?? "";
    const date = lines[4]?.trim() ?? "";
    const parents = lines[5]?.trim() ? lines[5].trim().split(/\s+/) : [];
    const refsLine = lines[6]?.trim() ?? "";
    const message = lines.slice(7).join("\n").trim();

    const refs = refsLine
      ? refsLine.split(", ").map((r) => r.trim()).filter(Boolean)
      : [];

    return {
      hash,
      shortHash,
      author,
      authorEmail: email,
      date,
      message,
      refs,
      parents,
    };
  });
}

export function parseBranches(output: string): Branch[] {
  return output
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const isCurrent = line.startsWith("*");
      const name = line.slice(2).trim();
      const isRemote = name.startsWith("remotes/");
      const trackingMatch = name.match(/\[(.+?)\]/);
      const tracking = trackingMatch?.[1];
      const cleanName = name.replace(/\[.*?\]/, "").trim();

      return {
        name: cleanName,
        isCurrent,
        isRemote,
        tracking,
      };
    });
}

export function parseRemotes(output: string): Remote[] {
  return output
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [name, type, url] = line.split("\t");
      return { name: name ?? "", url: url ?? "", type: (type as "fetch" | "push") ?? "fetch" };
    });
}
