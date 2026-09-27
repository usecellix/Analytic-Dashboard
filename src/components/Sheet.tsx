"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode, type TransitionEvent } from "react";

export interface SheetField {
  label: string;
  value: ReactNode;
}

const DURATION_MS = 280;

/** Row action that opens a right-side detail sheet with key/value rows. */
export function ViewSheet({
  title,
  fields,
  footer,
  label = "View",
}: {
  title: string;
  fields: SheetField[];
  footer?: ReactNode;
  label?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const closingRef = useRef(false);

  const open = useCallback(() => {
    closingRef.current = false;
    setMounted(true);
  }, []);

  const close = useCallback(() => {
    closingRef.current = true;
    setVisible(false);
  }, []);

  // After mount, flip visible on the next frame so the enter transition runs.
  useEffect(() => {
    if (!mounted) return;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true));
    });
    return () => cancelAnimationFrame(id);
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [mounted, close]);

  // Focus the panel when it finishes opening.
  useEffect(() => {
    if (visible && panelRef.current) panelRef.current.focus();
  }, [visible]);

  const onPanelTransitionEnd = (e: TransitionEvent<HTMLElement>) => {
    if (e.target !== e.currentTarget || e.propertyName !== "transform") return;
    if (closingRef.current) {
      setMounted(false);
      closingRef.current = false;
    }
  };

  // Fallback unmount if transitionend doesn't fire (reduced-motion / interrupted).
  useEffect(() => {
    if (mounted && !visible && closingRef.current) {
      const t = window.setTimeout(() => {
        setMounted(false);
        closingRef.current = false;
      }, DURATION_MS + 40);
      return () => window.clearTimeout(t);
    }
  }, [mounted, visible]);

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="rounded-md border border-line bg-surface px-2 py-1 text-xs font-medium text-ink transition-colors hover:bg-surface-hover"
      >
        {label}
      </button>
      {mounted ? (
        <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
          <button
            type="button"
            aria-label="Close details"
            className={`absolute inset-0 bg-ink/30 transition-opacity ease-out motion-reduce:transition-none ${
              visible ? "opacity-100" : "opacity-0"
            }`}
            style={{ transitionDuration: `${DURATION_MS}ms` }}
            onClick={close}
          />
          <aside
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            onTransitionEnd={onPanelTransitionEnd}
            className={`relative flex h-full w-full max-w-md flex-col border-l border-line bg-surface shadow-card outline-none transition-transform ease-out motion-reduce:transition-none ${
              visible ? "translate-x-0" : "translate-x-full"
            }`}
            style={{
              transitionDuration: `${DURATION_MS}ms`,
              transitionTimingFunction: "cubic-bezier(0.32, 0.72, 0, 1)",
            }}
          >
            <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
              <h2 id={titleId} className="text-sm font-semibold text-ink">
                {title}
              </h2>
              <button
                type="button"
                onClick={close}
                className="rounded-md px-2 py-1 text-sm text-ink-2 transition-colors hover:bg-surface-hover hover:text-ink"
              >
                Close
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <dl className="space-y-3">
                {fields.map((f) => (
                  <div key={f.label} className="grid grid-cols-[7rem_1fr] gap-3 text-sm">
                    <dt className="text-ink-3">{f.label}</dt>
                    <dd className="min-w-0 break-words text-ink">{f.value || "—"}</dd>
                  </div>
                ))}
              </dl>
            </div>
            {footer ? <footer className="border-t border-line px-5 py-3">{footer}</footer> : null}
          </aside>
        </div>
      ) : null}
    </>
  );
}
