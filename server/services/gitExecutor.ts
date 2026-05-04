import { execFile, spawn } from "child_process";
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
  input?: string | Buffer;
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
  const { cwd, env, maxBuffer = 10 * 1024 * 1024, input } = options;

  const resolvedCwd = cwd ? expandPath(cwd) : undefined;

  if (input) {
    return new Promise((resolve, reject) => {
      const child = spawn("git", args, {
        cwd: resolvedCwd,
        env: { ...process.env, ...env } as any,
      });

      let stdout = "";
      let stderr = "";

      child.stdout.setEncoding("utf-8");
      child.stderr.setEncoding("utf-8");
      child.stdout.on("data", (data) => { stdout += data; });
      child.stderr.on("data", (data) => { stderr += data; });

      child.on("error", (err: any) => {
        if (err.code === "ENOENT") {
          reject(new Error("git is not installed or not in PATH"));
        } else {
          reject(new Error(err.message || String(err)));
        }
      });

      child.on("close", (code) => {
        resolve({ stdout, stderr, exitCode: code ?? 0 });
      });

      child.stdin.end(input);      
    });
  }

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
  env?: Record<string, string>,
): Promise<GitExecResult> {
  return git(args, { cwd: repoPath, env });
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
