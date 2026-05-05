import type { TodoItem } from "../../types/git";

export const TODO_TAG_CLASSES: Record<string, string> = {
  FIXME: "text-red-400",
  BUG: "text-red-400",
  HACK: "text-amber-400",
  TODO: "text-blue-400",
  OPTIMIZE: "text-purple-400",
  REVIEW: "text-cyan-400",
  XXX: "text-zinc-400",
};

export function groupTodosByTag(items: TodoItem[]) {
  const order = ["FIXME", "BUG", "TODO", "HACK", "OPTIMIZE", "REVIEW", "XXX"];
  const map = new Map<string, TodoItem[]>();

  for (const item of items) {
    const list = map.get(item.tag);
    if (list) {
      list.push(item);
    } else {
      map.set(item.tag, [item]);
    }
  }

  return order
    .filter((tag) => map.has(tag))
    .map((tag) => ({ tag, items: map.get(tag)! }));
}
