export type FileStatus =
  | "added"
  | "modified"
  | "deleted"
  | "renamed"
  | "copied"
  | "untracked"
  | "conflicted"
  | "staged"
  | "partially_staged";

export type StagedStatus = "unstaged" | "staged" | "partially_staged";

export interface GitFile {
  path: string;
  oldPath?: string;
  status: FileStatus;
  stagedStatus: StagedStatus;
  additions: number;
  deletions: number;
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  header: string;
  lines: DiffLine[];
}

export interface DiffLine {
  type: "add" | "delete" | "context";
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface FileDiff {
  path: string;
  oldPath?: string;
  additions: number;
  deletions: number;
  hunks: DiffHunk[];
  isBinary: boolean;
  oldFile?: string;
  newFile?: string;
  newMode?: string;
  deletedMode?: string;
}

export interface StashEntry {
  index: number;
  name: string;
  hash: string;
  shortHash: string;
  message: string;
  date: string;
  branch: string;
}

export interface CommitInfo {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  authorEmail: string;
  date: string;
  refs: string[];
  parents: string[];
}

export interface CommitActivityDay {
  date: string;
  count: number;
}

export interface CommitActivitySummary {
  totalCommits: number;
  activeDays: number;
  currentStreak: number;
  longestStreak: number;
  busiestDay: CommitActivityDay | null;
  lastWeekCommits: number;
}

export interface CommitActivity {
  author: {
    name: string;
    email: string;
  };
  days: CommitActivityDay[];
  summary: CommitActivitySummary;
}

export interface Branch {
  name: string;
  isCurrent: boolean;
  isRemote: boolean;
  tracking?: string;
  ahead?: number;
  behind?: number;
}

export interface Remote {
  name: string;
  url: string;
  type: "fetch" | "push";
}

export interface RepoInfo {
  path: string;
  name: string;
  currentBranch: string;
  isGitRepo: boolean;
  remotes: Remote[];
}

export interface StatusResult {
  branch: string;
  files: GitFile[];
  ahead: number;
  behind: number;
  staged: number;
  unstaged: number;
  untracked: number;
  conflicted: number;
}
