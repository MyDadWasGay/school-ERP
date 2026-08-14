"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function focusableElements(root: HTMLElement) {
  return Array.from(root.querySelectorAll<HTMLElement>(focusableSelector)).filter(
    (element) => element.getAttribute("aria-hidden") !== "true",
  );
}

type ConfirmDialogProps = {
  label?: string;
  title?: string;
  description?: string;
  disabled?: boolean;
  triggerVariant?: ButtonVariant;
  triggerSize?: ButtonSize;
  confirmVariant?: ButtonVariant;
  onBeforeOpen?: () => boolean;
  onConfirm: () => void | Promise<void>;
};

export function ConfirmDialog({
  label = "Delete",
  title = "Confirm action",
  description = "This action cannot be undone.",
  disabled = false,
  triggerVariant = "ghost",
  triggerSize = "sm",
  confirmVariant = "destructive",
  onBeforeOpen,
  onConfirm,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const lastTriggerRef = useRef<HTMLButtonElement | null>(null);
  const pendingRef = useRef(false);
  const titleId = useId();
  const descriptionId = useId();

  pendingRef.current = pending;

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFirst = () => {
      cancelRef.current?.focus();
      if (document.activeElement !== cancelRef.current) dialogRef.current?.focus();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (!pendingRef.current) setOpen(false);
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const elements = focusableElements(dialogRef.current);
      if (elements.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    focusFirst();
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      window.queueMicrotask(() => lastTriggerRef.current?.focus());
    };
  }, [open]);

  function openDialog() {
    if (disabled || onBeforeOpen?.() === false) return;
    setError("");
    setOpen(true);
  }

  function closeDialog() {
    if (!pending) setOpen(false);
  }

  async function confirm() {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      await onConfirm();
      setOpen(false);
    } catch (caught) {
      setError(
        caught instanceof Error && caught.message
          ? caught.message
          : "We could not complete this action. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <Button
        ref={(element) => {
          if (element) lastTriggerRef.current = element;
        }}
        type="button"
        variant={triggerVariant}
        size={triggerSize}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={false}
        onClick={openDialog}
      >
        {label}
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="presentation">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className="w-full max-w-md rounded-xl bg-card p-6 shadow-xl"
      >
        <h2 id={titleId} className="font-semibold">{title}</h2>
        <p id={descriptionId} className="mt-2 text-sm text-muted-foreground">{description}</p>
        {error ? <p role="alert" className="mt-3 text-sm text-red-600">{error}</p> : null}
        <div className="mt-6 flex justify-end gap-2">
          <Button ref={cancelRef} type="button" variant="outline" disabled={pending} onClick={closeDialog}>Cancel</Button>
          <Button type="button" variant={confirmVariant} disabled={pending} aria-busy={pending} onClick={confirm}>
            {pending ? "Working..." : label}
          </Button>
        </div>
      </div>
    </div>
  );
}
