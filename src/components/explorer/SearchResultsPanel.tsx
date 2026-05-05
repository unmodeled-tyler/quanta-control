import { Loader2 } from "lucide-react";
import type { GrepMatch } from "../../types/git";

export function SearchResultsPanel({
  loading,
  error,
  results,
  truncated,
  onOpenFile,
}: {
  loading: boolean;
  error: string | null;
  results: GrepMatch[];
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

  if (error && results.length === 0) {
    return <div className="p-4 text-center text-sm text-zinc-500">{error}</div>;
  }

  return (
    <div className="text-xs">
      {results.length > 0 && (
        <div className="px-3 py-1.5 text-zinc-500 border-b border-zinc-800/40">
          {results.length} match{results.length !== 1 ? "es" : ""}
          {truncated && <span className="block text-[10px] text-amber-400">Showing first {results.length} results</span>}
        </div>
      )}
      {results.map((match, i) => (
        <button
          key={`${match.file}:${match.line}:${i}`}
          onClick={() => onOpenFile(match.file)}
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
  );
}
