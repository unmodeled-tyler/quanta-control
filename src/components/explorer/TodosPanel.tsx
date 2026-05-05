import { Loader2 } from "lucide-react";
import type { TodoItem } from "../../types/git";
import { groupTodosByTag, TODO_TAG_CLASSES } from "./todos";

export function TodosPanel({
  loading,
  error,
  items,
  truncated,
  onOpenFile,
}: {
  loading: boolean;
  error: string | null;
  items: TodoItem[];
  truncated: boolean;
  onOpenFile: (path: string) => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (error && items.length === 0) {
    return <div className="p-4 text-center text-sm text-zinc-500">{error}</div>;
  }

  return (
    <div className="text-xs">
      {items.length > 0 && (
        <div className="px-3 py-1.5 text-zinc-500 border-b border-zinc-800/40">
          {items.length} item{items.length !== 1 ? "s" : ""}
          {truncated && <span className="block text-[10px] text-amber-400">Showing first {items.length} items</span>}
        </div>
      )}
      {groupTodosByTag(items).map(({ tag, items: groupItems }) => (
        <div key={tag}>
          <div className={`px-3 py-1 text-[10px] font-medium uppercase tracking-wide ${TODO_TAG_CLASSES[tag] ?? "text-zinc-500"}`}>
            {tag} ({groupItems.length})
          </div>
          {groupItems.map((item, i) => (
            <button
              key={`${item.file}:${item.line}:${i}`}
              onClick={() => onOpenFile(item.file)}
              className="w-full text-left px-3 py-1.5 hover:bg-zinc-800/40 transition-colors border-b border-zinc-800/20"
            >
              <div className="text-zinc-400 font-mono truncate">{item.file}</div>
              <div className="flex gap-2 mt-0.5">
                <span className="text-zinc-600 font-mono flex-shrink-0">{item.line}</span>
                <span className="text-zinc-300 truncate">{item.content.trim()}</span>
              </div>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
