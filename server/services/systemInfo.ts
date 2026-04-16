import { execFile } from "child_process";
import { promisify } from "util";
import { git } from "./gitExecutor.js";
import type { SystemStatus } from "../../src/types/system.js";

const execFileAsync = promisify(execFile);

async function runCommand(command: string, args: string[]): Promise<{
  installed: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
}> {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      env: process.env,
      encoding: "utf-8",
      maxBuffer: 1024 * 1024,
    });

    return {
      installed: true,
      stdout: stdout || "",
      stderr: stderr || "",
      exitCode: 0,
    };
  } catch (error: any) {
    if (error.code === "ENOENT") {
      return {
        installed: false,
        stdout: "",
        stderr: "",
        exitCode: 127,
      };
    }

    return {
      installed: true,
      stdout: error.stdout || "",
      stderr: error.stderr || error.message || "",
      exitCode: error.status ?? 1,
    };
  }
}

async function getCommandVersion(command: string, args: string[] = ["--version"]) {
  const result = await runCommand(command, args);
  return {
    installed: result.installed,
    version: result.installed
      ? (result.stdout || result.stderr).split("\n")[0]?.trim() || undefined
      : undefined,
  };
}

async function getGitIdentity() {
  try {
    const [nameResult, emailResult] = await Promise.all([
      git(["config", "--global", "--get", "user.name"]),
      git(["config", "--global", "--get", "user.email"]),
    ]);

    const name = nameResult.exitCode === 0 ? nameResult.stdout.trim() : "";
    const email = emailResult.exitCode === 0 ? emailResult.stdout.trim() : "";

    return {
      configured: Boolean(name && email),
      name,
      email,
    };
  } catch {
    return {
      configured: false,
      name: "",
      email: "",
    };
  }
}

async function getGithubAuth() {
  const ghVersion = await getCommandVersion("gh");
  if (!ghVersion.installed) {
    return {
      installed: false,
      authenticated: false,
    };
  }

  const status = await runCommand("gh", ["auth", "status", "--hostname", "github.com"]);
  const output = `${status.stdout}\n${status.stderr}`;
  const userMatch =
    output.match(/account\s+([A-Za-z0-9-]+)/i) ||
    output.match(/Logged in to github\.com as ([A-Za-z0-9-]+)/i);

  return {
    installed: true,
    version: ghVersion.version,
    authenticated: status.exitCode === 0,
    user: userMatch?.[1],
    error:
      status.exitCode === 0
        ? undefined
        : "Run `gh auth login` to connect GitHub CLI to your account.",
  };
}

export async function getSystemStatus(): Promise<SystemStatus> {
  const [gitStatus, nodeStatus, npmStatus, githubAuth, gitIdentity] =
    await Promise.all([
      getCommandVersion("git"),
      getCommandVersion("node"),
      getCommandVersion("npm"),
      getGithubAuth(),
      getGitIdentity(),
    ]);

  return {
    git: gitStatus,
    node: nodeStatus,
    npm: npmStatus,
    github: githubAuth,
    gitIdentity,
  };
}
