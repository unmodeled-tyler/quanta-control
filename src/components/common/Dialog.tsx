import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

function BaseDialog({
  title,
  message,
  children,
  onEnter,
  onEscape,
}: {
  title: string;
  message: string;
  children: ReactNode;
  onEnter: () => void;
  onEscape: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        onEnter();
      } else if (e.key === "Escape") {
        onEscape();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onEnter, onEscape]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl shadow-black/50 p-5">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-zinc-400">{message}</p>
        <div className="mt-4 flex items-center gap-2 justify-end">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
  }, []);

  return (
    <BaseDialog title={title} message={message} onEnter={onConfirm} onEscape={onCancel}>
      <button
        onClick={onCancel}
        className="px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 rounded-md hover:bg-zinc-800 transition-colors"
      >
        {cancelLabel}
      </button>
      <button
        ref={confirmRef}
        onClick={onConfirm}
        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
          danger
            ? "bg-red-600 hover:bg-red-500 text-white"
            : "bg-emerald-600 hover:bg-emerald-500 text-white"
        }`}
      >
        {confirmLabel}
      </button>
    </BaseDialog>
  );
}

export function AlertDialog({
  title,
  message,
  onClose,
}: {
  title: string;
  message: string;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  return (
    <BaseDialog title={title} message={message} onEnter={onClose} onEscape={onClose}>
      <button
        ref={closeRef}
        onClick={onClose}
        className="px-4 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded-md text-sm font-medium transition-colors"
      >
        OK
      </button>
    </BaseDialog>
  );
}
