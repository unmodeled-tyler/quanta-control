import { isGitRepo, expandPath } from "../services/gitExecutor.js";

export function createHttpError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

export async function validateGitRepo(repoPath: string): Promise<string> {
  const resolved = expandPath(repoPath);
  const valid = await isGitRepo(resolved);
  if (!valid) {
    throw createHttpError(400, "Not a valid git repository");
  }
  return resolved;
}

export function assertSafeRef(value: string, label: string) {
  if (value.startsWith("-")) {
    throw createHttpError(400, `${label} must not start with "-"`);
  }
  // Block common shell/command injection characters
  if (/[;&|`$(){}[\]\n\r]/.test(value)) {
    throw createHttpError(400, `${label} contains invalid characters`);
  }
}

export function assertSafeArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value)) {
    throw createHttpError(400, `${label} must be an array`);
  }
  for (const item of value) {
    if (typeof item !== "string") {
      throw createHttpError(400, `${label} must contain only strings`);
    }
  }
  return value;
}
