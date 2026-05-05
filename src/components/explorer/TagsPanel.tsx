import { Loader2, TagIcon } from "lucide-react";
import type { Tag } from "../../types/git";

export function TagsPanel({
  loading,
  error,
  tags,
  newTagName,
  newTagMessage,
  newTagRef,
  creating,
  deletingTagName,
  onNewTagNameChange,
  onNewTagMessageChange,
  onNewTagRefChange,
  onCreateTag,
  onDeleteTag,
}: {
  loading: boolean;
  error: string | null;
  tags: Tag[];
  newTagName: string;
  newTagMessage: string;
  newTagRef: string;
  creating: boolean;
  deletingTagName: string | null;
  onNewTagNameChange: (value: string) => void;
  onNewTagMessageChange: (value: string) => void;
  onNewTagRefChange: (value: string) => void;
  onCreateTag: (event: React.FormEvent) => void;
  onDeleteTag: (name: string) => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="text-xs">
      <form onSubmit={onCreateTag} className="p-3 border-b border-zinc-800/40 space-y-2">
        {error && (
          <div className="rounded-md bg-red-500/10 px-2.5 py-1.5 text-red-400">
            {error}
          </div>
        )}
        <input
          type="text"
          value={newTagName}
          onChange={(e) => onNewTagNameChange(e.target.value)}
          placeholder="Tag name…"
          className="w-full bg-zinc-900 border border-zinc-700 rounded-md py-1.5 px-2.5 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/50"
        />
        <input
          type="text"
          value={newTagMessage}
          onChange={(e) => onNewTagMessageChange(e.target.value)}
          placeholder="Message (optional)…"
          className="w-full bg-zinc-900 border border-zinc-700 rounded-md py-1.5 px-2.5 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/50"
        />
        <input
          type="text"
          value={newTagRef}
          onChange={(e) => onNewTagRefChange(e.target.value)}
          placeholder="Ref (optional, defaults to HEAD)…"
          className="w-full bg-zinc-900 border border-zinc-700 rounded-md py-1.5 px-2.5 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/50"
        />
        <button
          type="submit"
          disabled={creating || !newTagName.trim()}
          className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 rounded-md text-xs font-medium text-white transition-colors"
        >
          {creating ? "Creating…" : "Create Tag"}
        </button>
      </form>

      {tags.length === 0 ? (
        <div className="p-4 text-center text-zinc-500">No tags yet</div>
      ) : (
        tags.map((tag) => (
          <div
            key={tag.name}
            className="flex items-center justify-between px-3 py-2 border-b border-zinc-800/20 hover:bg-zinc-800/20 transition-colors"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <TagIcon className="h-3 w-3 flex-shrink-0 text-amber-500/60" />
                <span className="text-zinc-300 truncate font-medium">{tag.name}</span>
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-[10px] text-zinc-500">
                <span className="font-mono">{tag.shortHash}</span>
                {tag.message && <span className="truncate">— {tag.message}</span>}
              </div>
            </div>
            <button
              onClick={() => onDeleteTag(tag.name)}
              disabled={deletingTagName === tag.name}
              title="Delete tag"
              className="p-1 text-zinc-600 hover:text-red-400 disabled:opacity-40 transition-colors"
            >
              {deletingTagName === tag.name ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>
        ))
      )}
    </div>
  );
}
