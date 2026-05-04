import { useState, useEffect, useCallback, useMemo } from "react";
import { useRepoStore } from "../../stores/repoStore";
import * as api from "../../services/api";
import type {
  BlameLine,
  CommitInfo,
  GrepMatch,
  FileTreeNode,
  FileNodeType,
  PickaxeMode,
  FileDiff,
} from "../../types/git";
import { getRelativeTime } from "../../utils/time";
import {
  Search,
  FolderOpen,
  Folder,
  File,
  ChevronRight,
  ChevronDown,
  GitCommit,
  Hash,
  User,
  Clock,
  ArrowRightLeft,
  Loader2,
} from "lucide-react";

// ── Helpers ──

function buildFileTree(files: string[]): FileTreeNode[] {
  const root: FileTreeNode[] = [];
  const dirMap = new Map<string, FileTreeNode>();

  for (const file of files) {
    const parts = file.split("/");
    let current = root;
    let currentPath = "";

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]!;
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isLast = i === parts.length - 1;
      const type: FileNodeType = isLast ? "file" : "directory";

      let node = dirMap.get(currentPath);
      if (!node) {
        node = {
          name: part,
          path: currentPath,
          type,
          children: type === "directory" ? [] : undefined,
        };
        dirMap.set(currentPath, node);
        current.push(node);
      }

      if (type === "directory" && node.children) {
        current = node.children;
      }
    }
  }

  return root;
}

// ── File Tree ──

function FileTree({
  nodes,
  selectedFile,
  onSelectFile,
  expandedDirs,
  onToggleDir,
}: {
  nodes: FileTreeNode[];
  selectedFile: string | null;
  onSelectFile: (path: string) => void;
  expandedDirs: Set<string>;
  onToggleDir: (path: string) => void;
}) {
  return (
    <div className="text-xs">
      {nodes.map((node) => (
        <TreeNode
          key={node.path}
          node={node}
          selectedFile={selectedFile}
          onSelectFile={onSelectFile}
          expandedDirs={expandedDirs}
          onToggleDir={onToggleDir}
          depth={0}
        />
      ))}
      {nodes.length === 0 && (
        <div className="p-4 text-center text-zinc-500">No files to show</div>
      )}
    </div>
  );
}

function TreeNode({
  node,
  selectedFile,
  onSelectFile,
  expandedDirs,
  onToggleDir,
  depth,
}: {
  node: FileTreeNode;
  selectedFile: string | null;
  onSelectFile: (path: string) => void;
  expandedDirs: Set<string>;
  onToggleDir: (path: string) => void;
  depth: number;
}) {
  const isExpanded = expandedDirs.has(node.path);
  const isSelected = selectedFile === node.path;

  if (node.type === "directory") {
    return (
      <div>
        <button
          onClick={() => onToggleDir(node.path)}
          className={`flex w-full items-center gap-1 px-2 py-0.5 text-left hover:bg-zinc-800/40 transition-colors ${
            isSelected ? "bg-emerald-500/10 text-emerald-400" : "text-zinc-400"
          }`}
          style={{ paddingLeft: `${8 + depth * 16}px` }}
        >
          {isExpanded ? (
            <ChevronDown className="h-3 w-3 flex-shrink-0" />
          ) : (
            <ChevronRight className="h-3 w-3 flex-shrink-0" />
          )}
          {isExpanded ? (
            <FolderOpen className="h-3.5 w-3.5 flex-shrink-0 text-amber-500/60" />
          ) : (
            <Folder className="h-3.5 w-3.5 flex-shrink-0 text-amber-500/60" />
          )}
          <span className="truncate">{node.name}</span>
        </button>
        {isExpanded && node.children && (
          <div>
            {node.children.map((child) => (
              <TreeNode
                key={child.path}
                node={child}
                selectedFile={selectedFile}
                onSelectFile={onSelectFile}
                expandedDirs={expandedDirs}
                onToggleDir={onToggleDir}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => onSelectFile(node.path)}
      className={`flex w-full items-center gap-1.5 px-2 py-0.5 text-left hover:bg-zinc-800/40 transition-colors ${
        isSelected
          ? "bg-emerald-500/10 text-emerald-400"
          : "text-zinc-300"
      }`}
      style={{ paddingLeft: `${8 + depth * 16}px` }}
    >
      <File className="h-3.5 w-3.5 flex-shrink-0 text-zinc-500" />
      <span className="truncate">{node.name}</span>
    </button>
  );
}

// ── Blame View ──

function BlameView({
  lines,
  loading,
  error,
}: {
  lines: BlameLine[];
  loading: boolean;
  error: string | null;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-400 text-sm">
        {error}
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
        No blame data
      </div>
    );
  }

  return (
    <div className="overflow-auto font-mono text-xs leading-5">
      {lines.map((line, i) => (
        <div
          key={i}
          className="flex hover:bg-zinc-800/30 transition-colors group"
        >
          <div className="flex-shrink-0 w-[180px] flex items-center gap-2 px-2 border-r border-zinc-800/50 text-zinc-500 bg-zinc-950/40 group-hover:bg-zinc-900/40">
            <span className="text-zinc-400 font-mono w-[56px] flex-shrink-0 truncate" title={line.hash}>
              {line.shortHash}
            </span>
            <span className="truncate flex-1 text-[10px]" title={line.summary}>
              {line.author}
            </span>
            <span className="flex-shrink-0 text-[10px] text-zinc-600">
              {getRelativeTime(line.date)}
            </span>
          </div>
          <div className="flex-1 px-3 text-zinc-300 whitespace-pre">
            {line.content}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Commit List (reused for history + pickaxe) ──

function CommitList({
  commits,
  loading,
  emptyMessage,
}: {
  commits: CommitInfo[];
  loading: boolean;
  emptyMessage: string;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (commits.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-auto">
      {commits.map((commit) => (
        <div
          key={commit.hash}
          className="flex items-start gap-3 px-3 py-2 border-b border-zinc-800/40 hover:bg-zinc-800/20 transition-colors"
        >
          <GitCommit className="h-4 w-4 flex-shrink-0 mt-0.5 text-zinc-500" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-mono text-zinc-400">{commit.shortHash}</span>
              <span className="text-zinc-300 truncate font-medium">{commit.message}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-zinc-500">
              <User className="h-2.5 w-2.5" />
              <span>{commit.author}</span>
              <Clock className="h-2.5 w-2.5 ml-1" />
              <span>{getRelativeTime(commit.date)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Compare View ──

function CompareView({
  diffs,
  loading,
  error,
}: {
  diffs: FileDiff[];
  loading: boolean;
  error: string | null;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-400 text-sm">
        {error}
      </div>
    );
  }

  if (diffs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
        No differences between these refs
      </div>
    );
  }

  return (
    <div className="overflow-auto">
      {diffs.map((diff) => (
        <div key={diff.path} className="border-b border-zinc-800/40">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/60 text-xs font-medium text-zinc-300">
            <File className="h-3 w-3 text-zinc-400" />
            <span>{diff.path}</span>
            <span className="text-zinc-500">
              +{diff.additions} −{diff.deletions}
            </span>
          </div>
          <div className="font-mono text-xs">
            {diff.hunks.map((hunk, hi) => (
              <div key={hi}>
                <div className="px-3 py-0.5 text-zinc-500 bg-zinc-900/30 text-[10px]">
                  {hunk.header}
                </div>
                {hunk.lines.map((line, li) => (
                  <div
                    key={li}
                    className={`px-3 py-0 whitespace-pre ${
                      line.type === "add"
                        ? "bg-emerald-500/10 text-emerald-300"
                        : line.type === "delete"
                          ? "bg-red-500/10 text-red-300"
                          : "text-zinc-400"
                    }`}
                  >
                    {line.content}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main ExplorerView ──

type ExplorerMode = "browse" | "search" | "pickaxe" | "compare";

export function ExplorerView() {
  const { repoPath } = useRepoStore();

  // Mode
  const [mode, setMode] = useState<ExplorerMode>("browse");

  // File tree
  const [treeFiles, setTreeFiles] = useState<string[]>([]);
  const [treeLoading, setTreeLoading] = useState(false);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const tree = useMemo(() => buildFileTree(treeFiles), [treeFiles]);

  // Selected file
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  // Blame
  const [blameLines, setBlameLines] = useState<BlameLine[]>([]);
  const [blameLoading, setBlameLoading] = useState(false);
  const [blameError, setBlameError] = useState<string | null>(null);

  // File history
  const [fileHistory, setFileHistory] = useState<CommitInfo[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Search / Pickaxe
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GrepMatch[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [pickaxeMode, setPickaxeMode] = useState<PickaxeMode>("S");

  // Compare
  const [compareFrom, setCompareFrom] = useState("");
  const [compareTo, setCompareTo] = useState("");
  const [compareDiffs, setCompareDiffs] = useState<FileDiff[]>([]);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);

  // ── Load file tree ──

  const loadTree = useCallback(async () => {
    if (!repoPath) return;
    setTreeLoading(true);
    try {
      const result = await api.getFileTree(repoPath);
      setTreeFiles(result.files);
      // Auto-expand first level
      const firstLevel = new Set<string>();
      for (const f of result.files) {
        const slash = f.indexOf("/");
        if (slash > 0) {
          firstLevel.add(f.slice(0, slash));
        }
      }
      setExpandedDirs(firstLevel);
    } catch {
      setTreeFiles([]);
    } finally {
      setTreeLoading(false);
    }
  }, [repoPath]);

  useEffect(() => {
    void loadTree();
  }, [loadTree]);

  // ── Load blame + history when file selected ──

  useEffect(() => {
    if (!repoPath || !selectedFile) {
      setBlameLines([]);
      setFileHistory([]);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setBlameLoading(true);
      setBlameError(null);
      setHistoryLoading(true);

      try {
        const [blameResult, historyResult] = await Promise.all([
          api.getBlame(repoPath, selectedFile),
          api.getFileHistory(repoPath, selectedFile),
        ]);

        if (!cancelled) {
          setBlameLines(blameResult.lines);
          setFileHistory(historyResult.commits);
        }
      } catch (err) {
        if (!cancelled) {
          setBlameError(err instanceof Error ? err.message : "Failed to load blame");
        }
      } finally {
        if (!cancelled) {
          setBlameLoading(false);
          setHistoryLoading(false);
        }
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [repoPath, selectedFile]);

  // ── Search ──

  const runSearch = useCallback(async () => {
    if (!repoPath || !searchQuery.trim()) return;
    setSearchLoading(true);
    setSearchError(null);
    setSearchResults([]);

    try {
      const result = await api.grepCode(repoPath, searchQuery.trim());
      setSearchResults(result.matches);
      if (result.matches.length === 0) {
        setSearchError("No matches found");
      }
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearchLoading(false);
    }
  }, [repoPath, searchQuery]);

  // ── Pickaxe ──

  const [pickaxeResults, setPickaxeResults] = useState<CommitInfo[]>([]);
  const [pickaxeLoading, setPickaxeLoading] = useState(false);
  const [pickaxeError, setPickaxeError] = useState<string | null>(null);

  const runPickaxe = useCallback(async () => {
    if (!repoPath || !searchQuery.trim()) return;
    setPickaxeLoading(true);
    setPickaxeError(null);
    setPickaxeResults([]);

    try {
      const result = await api.pickaxeSearch(repoPath, searchQuery.trim(), pickaxeMode);
      setPickaxeResults(result.commits);
      if (result.commits.length === 0) {
        setPickaxeError("No commits found");
      }
    } catch (err) {
      setPickaxeError(err instanceof Error ? err.message : "Pickaxe search failed");
    } finally {
      setPickaxeLoading(false);
    }
  }, [repoPath, searchQuery, pickaxeMode]);

  // ── Compare ──

  const runCompare = useCallback(async () => {
    if (!repoPath || !compareFrom.trim() || !compareTo.trim()) return;
    setCompareLoading(true);
    setCompareError(null);
    setCompareDiffs([]);

    try {
      const result = await api.compareRefs(repoPath, compareFrom.trim(), compareTo.trim());
      setCompareDiffs(result.diffs);
    } catch (err) {
      setCompareError(err instanceof Error ? err.message : "Compare failed");
    } finally {
      setCompareLoading(false);
    }
  }, [repoPath, compareFrom, compareTo]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "pickaxe") {
      void runPickaxe();
    } else if (mode === "search") {
      void runSearch();
    }
  };

  const handleCompareSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void runCompare();
  };

  const toggleDir = (path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleResultClick = (match: GrepMatch) => {
    setSelectedFile(match.file);
    setMode("browse");
    // Expand dirs to reveal the file
    const parts = match.file.split("/");
    const dirs = new Set(expandedDirs);
    let current = "";
    for (let i = 0; i < parts.length - 1; i++) {
      current = current ? `${current}/${parts[i]}` : parts[i]!;
      dirs.add(current);
    }
    setExpandedDirs(dirs);
  };

  if (!repoPath) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500">
        Open a repository to explore
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-zinc-950">
      {/* ── Header with mode tabs ── */}
      <div className="flex-shrink-0 border-b border-zinc-800/60">
        <div className="flex items-center gap-1 px-3 py-1.5">
          {([
            ["browse", "Browse"],
            ["search", "Code Search"],
            ["pickaxe", "Pickaxe"],
            ["compare", "Compare"],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setMode(id)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                mode === id
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Search / Compare bar ── */}
      {mode !== "browse" && (
        <div className="flex-shrink-0 border-b border-zinc-800/40 px-3 py-2">
          {mode === "search" && (
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search code (regex)…"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-md py-1.5 pl-8 pr-3 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/50"
                />
              </div>
              <button
                type="submit"
                disabled={searchLoading || !searchQuery.trim()}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 rounded-md text-xs font-medium text-white transition-colors"
              >
                {searchLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  "Search"
                )}
              </button>
            </form>
          )}

          {mode === "pickaxe" && (
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder='Find commits that added/removed…'
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-md py-1.5 pl-8 pr-3 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/50"
                />
              </div>
              <select
                value={pickaxeMode}
                onChange={(e) => setPickaxeMode(e.target.value as PickaxeMode)}
                className="bg-zinc-900 border border-zinc-700 rounded-md px-2 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500/50"
              >
                <option value="S">-S (string)</option>
                <option value="G">-G (regex)</option>
              </select>
              <button
                type="submit"
                disabled={pickaxeLoading || !searchQuery.trim()}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 rounded-md text-xs font-medium text-white transition-colors"
              >
                {pickaxeLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  "Search"
                )}
              </button>
            </form>
          )}

          {mode === "compare" && (
            <form onSubmit={handleCompareSubmit} className="flex items-center gap-2">
              <input
                type="text"
                value={compareFrom}
                onChange={(e) => setCompareFrom(e.target.value)}
                placeholder="From (branch/commit)…"
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-md py-1.5 px-3 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/50"
              />
              <ArrowRightLeft className="h-4 w-4 text-zinc-500 flex-shrink-0" />
              <input
                type="text"
                value={compareTo}
                onChange={(e) => setCompareTo(e.target.value)}
                placeholder="To (branch/commit)…"
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-md py-1.5 px-3 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/50"
              />
              <button
                type="submit"
                disabled={compareLoading || !compareFrom.trim() || !compareTo.trim()}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 rounded-md text-xs font-medium text-white transition-colors"
              >
                {compareLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  "Compare"
                )}
              </button>
            </form>
          )}
        </div>
      )}

      {/* ── Main content ── */}
      <div className="flex-1 flex min-h-0">
        {/* Left panel: file tree or search results */}
        <div className="w-64 flex-shrink-0 border-r border-zinc-800/40 overflow-auto bg-zinc-950/60">
          {mode === "browse" && (
            treeLoading ? (
              <div className="flex items-center justify-center h-full text-zinc-500">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              <FileTree
                nodes={tree}
                selectedFile={selectedFile}
                onSelectFile={setSelectedFile}
                expandedDirs={expandedDirs}
                onToggleDir={toggleDir}
              />
            )
          )}

          {mode === "search" && (
            searchLoading ? (
              <div className="flex items-center justify-center h-full text-zinc-500">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : searchError && searchResults.length === 0 ? (
              <div className="p-4 text-center text-sm text-zinc-500">{searchError}</div>
            ) : (
              <div className="text-xs">
                {searchResults.length > 0 && (
                  <div className="px-3 py-1.5 text-zinc-500 border-b border-zinc-800/40">
                    {searchResults.length} match{searchResults.length !== 1 ? "es" : ""}
                  </div>
                )}
                {searchResults.map((match, i) => (
                  <button
                    key={`${match.file}:${match.line}:${i}`}
                    onClick={() => handleResultClick(match)}
                    className="w-full text-left px-3 py-1.5 hover:bg-zinc-800/40 transition-colors border-b border-zinc-800/20"
                  >
                    <div className="text-zinc-400 font-mono truncate">{match.file}</div>
                    <div className="flex gap-2 mt-0.5">
                      <span className="text-zinc-600 font-mono flex-shrink-0">{match.line}</span>
                      <span className="text-zinc-300 truncate">{match.content.trim()}</span>
                    </div>
                  </button>
                ))}
              </div>
            )
          )}

          {mode === "pickaxe" && (
            pickaxeLoading ? (
              <div className="flex items-center justify-center h-full text-zinc-500">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : pickaxeError && pickaxeResults.length === 0 ? (
              <div className="p-4 text-center text-sm text-zinc-500">{pickaxeError}</div>
            ) : (
              <div className="text-xs">
                {pickaxeResults.length > 0 && (
                  <div className="px-3 py-1.5 text-zinc-500 border-b border-zinc-800/40">
                    {pickaxeResults.length} commit{pickaxeResults.length !== 1 ? "s" : ""}
                  </div>
                )}
                <CommitList commits={pickaxeResults} loading={false} emptyMessage="" />
              </div>
            )
          )}

          {mode === "compare" && (
            <div className="p-4 text-xs text-zinc-500 text-center">
              Enter two refs above to compare
            </div>
          )}
        </div>

        {/* Right panel: content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {mode === "browse" && (
            <>
              {!selectedFile ? (
                <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
                  <div className="text-center">
                    <FolderOpen className="h-8 w-8 mx-auto mb-2 text-zinc-700" />
                    <p>Select a file to see blame and history</p>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col">
                  {/* File header */}
                  <div className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 border-b border-zinc-800/40 bg-zinc-900/40">
                    <File className="h-3.5 w-3.5 text-zinc-400" />
                    <span className="text-xs text-zinc-300 font-mono truncate">{selectedFile}</span>
                  </div>

                  {/* Blame (top half) */}
                  <div className="flex-1 min-h-0 overflow-hidden border-b border-zinc-800/40">
                    <div className="flex items-center gap-1.5 px-3 py-1 border-b border-zinc-800/30 bg-zinc-900/20">
                      <Hash className="h-3 w-3 text-zinc-500" />
                      <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">Blame</span>
                    </div>
                    <div className="overflow-auto h-[calc(100%-25px)]">
                      <BlameView lines={blameLines} loading={blameLoading} error={blameError} />
                    </div>
                  </div>

                  {/* History (bottom half) */}
                  <div className="h-[40%] min-h-[120px] overflow-hidden">
                    <div className="flex items-center gap-1.5 px-3 py-1 border-b border-zinc-800/30 bg-zinc-900/20">
                      <Clock className="h-3 w-3 text-zinc-500" />
                      <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">File History</span>
                      {fileHistory.length > 0 && (
                        <span className="text-[10px] text-zinc-600">{fileHistory.length} commits</span>
                      )}
                    </div>
                    <div className="overflow-auto h-[calc(100%-25px)]">
                      <CommitList commits={fileHistory} loading={historyLoading} emptyMessage="No history found" />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {mode === "search" && (
            <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
              <div className="text-center">
                <Search className="h-8 w-8 mx-auto mb-2 text-zinc-700" />
                <p>Search results appear in the left panel</p>
                <p className="text-xs mt-1 text-zinc-600">Click a result to browse that file</p>
              </div>
            </div>
          )}

          {mode === "pickaxe" && (
            <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
              <div className="text-center">
                <GitCommit className="h-8 w-8 mx-auto mb-2 text-zinc-700" />
                <p>Commit results appear in the left panel</p>
              </div>
            </div>
          )}

          {mode === "compare" && (
            <CompareView diffs={compareDiffs} loading={compareLoading} error={compareError} />
          )}
        </div>
      </div>
    </div>
  );
}
