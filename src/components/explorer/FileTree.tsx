import { ChevronDown, ChevronRight, File, Folder, FolderOpen } from "lucide-react";
import type { FileTreeNode } from "../../types/git";

export function FileTree({
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
