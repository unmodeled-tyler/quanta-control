import { execFile } from "child_process";
import { promisify } from "util";
import { homedir } from "os";
import { resolve } from "path";

const execFileAsync = promisify(execFile);

export function expandPath(p: string): string {
  if (p.startsWith("~")) {
    return resolve(homedir(), p.slice(1));
  }
  return resolve(p);
}

export interface GitExecOptions {
  cwd?: string;
  env?: Record<string, string>;
  maxBuffer?: number;
}

export interface GitExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export async function git(
  args: string[],
  options: GitExecOptions = {},
): Promise<GitExecResult> {
  const { cwd, env, maxBuffer = 10 * 1024 * 1024 } = options;

  const resolvedCwd = cwd ? expandPath(cwd) : undefined;

  try {
    const { stdout, stderr } = await execFileAsync("git", args, {
      cwd: resolvedCwd,
      env: { ...process.env, ...env },
      maxBuffer,
      encoding: "utf-8",
    });
    return { stdout: stdout || "", stderr: stderr || "", exitCode: 0 };
  } catch (err: any) {
    if (err.code === "ENOENT") {
      throw new Error("git is not installed or not in PATH");
    }
    return {
      stdout: err.stdout || "",
      stderr: err.stderr || err.message || "",
      exitCode: err.status ?? 1,
    };
  }
}

export async function gitInRepo(
  repoPath: string,
  args: string[],
): Promise<GitExecResult> {
  return git(args, { cwd: repoPath });
}

export async function isGitRepo(path: string): Promise<boolean> {
  const result = await git(["rev-parse", "--is-inside-work-tree"], { cwd: path });
  return result.exitCode === 0 && result.stdout.trim() === "true";
}

export async function getRepoRoot(path: string): Promise<string | null> {
  const result = await git(["rev-parse", "--show-toplevel"], { cwd: path });
  if (result.exitCode !== 0) return null;
  return result.stdout.trim();
}
