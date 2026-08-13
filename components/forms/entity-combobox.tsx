"use client";

import { useEffect, useId, useRef, useState } from "react";
import { browserApiFetch } from "@/lib/api-client/browser";
import { FieldError } from "./field-error";

export type EntityOption = { id: string; label: string; detail?: string | null };

type EntityComboboxProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  endpoint: string;
  initialOptions?: EntityOption[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  description?: string;
};

function isOption(value: unknown): value is EntityOption {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return typeof row.id === "string" && typeof row.label === "string";
}

export function EntityCombobox({ label, value, onChange, endpoint, initialOptions = [], placeholder = "Search…", required, disabled, error, description }: EntityComboboxProps) {
  const generatedId = useId().replaceAll(":", "");
  const inputId = `entity-${generatedId}`;
  const listId = `${inputId}-list`;
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<EntityOption[]>(initialOptions);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const requestNumber = useRef(0);
  const selected = options.find((option) => option.id === value);

  useEffect(() => {
    setOptions((current) => {
      const merged = [...initialOptions, ...current.filter((option) => !initialOptions.some((initial) => initial.id === option.id))];
      return merged.length === current.length && merged.every((option, index) => option.id === current[index]?.id && option.label === current[index]?.label) ? current : merged;
    });
  }, [initialOptions]);

  useEffect(() => {
    if (!value && !open) setQuery("");
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const currentRequest = ++requestNumber.current;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const url = new URL(endpoint, window.location.origin);
        if (query.trim()) url.searchParams.set("search", query.trim());
        const response = await browserApiFetch(url.pathname + url.search);
        const payload = await response.json() as { data?: unknown };
        if (currentRequest === requestNumber.current && response.ok) {
          setOptions(Array.isArray(payload.data) ? payload.data.filter(isOption) : []);
          setActiveIndex(-1);
        }
      } catch {
        if (currentRequest === requestNumber.current) setOptions([]);
      } finally {
        if (currentRequest === requestNumber.current) setLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [endpoint, open, query]);

  function choose(option: EntityOption) {
    onChange(option.id);
    setQuery(option.label);
    setOpen(false);
    setActiveIndex(-1);
  }

  function clear() {
    onChange("");
    setQuery("");
    setOpen(true);
  }

  const inputValue = open ? query : selected?.label ?? (value ? "Selected record" : query);
  return <div className="space-y-1">
    <label htmlFor={inputId} className="text-sm font-medium leading-none">{label}{required ? " *" : ""}</label>
    <div className="relative">
      <input
        id={inputId}
        className="flex h-10 w-full rounded-md border bg-background px-3 py-2 pr-20 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        role="combobox"
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={open}
        aria-activedescendant={activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined}
        aria-describedby={error ? `${inputId}-error` : description ? `${inputId}-description` : undefined}
        value={inputValue}
        placeholder={placeholder}
        required={required && !value}
        disabled={disabled}
        onFocus={() => { setOpen(true); setQuery(selected?.label ?? ""); }}
        onChange={(event) => { setQuery(event.target.value); onChange(""); setOpen(true); }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setActiveIndex((index) => Math.min(index + 1, options.length - 1)); }
          if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((index) => Math.max(index - 1, 0)); }
          if (event.key === "Enter" && open && activeIndex >= 0 && options[activeIndex]) { event.preventDefault(); choose(options[activeIndex]); }
          if (event.key === "Escape") { setOpen(false); setActiveIndex(-1); }
        }}
      />
      {value ? <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-1 text-xs text-muted-foreground hover:bg-muted" onClick={clear} aria-label={`Clear ${label}`}>Clear</button> : null}
      {open ? <div id={listId} role="listbox" className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-background p-1 shadow-lg">
        {loading ? <div className="px-3 py-2 text-sm text-muted-foreground" role="status">Searching…</div> : null}
        {!loading && options.length === 0 ? <div className="px-3 py-2 text-sm text-muted-foreground">No matching {label.toLowerCase()} records.</div> : null}
        {!loading ? options.map((option, index) => <button type="button" key={option.id} id={`${listId}-option-${index}`} role="option" aria-selected={option.id === value} className={`block w-full rounded px-3 py-2 text-left text-sm ${index === activeIndex ? "bg-muted" : "hover:bg-muted/70"}`} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(option)}><span className="block font-medium">{option.label}</span>{option.detail ? <span className="block text-xs text-muted-foreground">{option.detail}</span> : null}</button>) : null}
      </div> : null}
    </div>
    {description && !error ? <p id={`${inputId}-description`} className="text-xs text-muted-foreground">{description}</p> : null}
    <FieldError id={`${inputId}-error`} message={error} />
  </div>;
}
