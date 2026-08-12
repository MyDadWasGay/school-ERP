"use client";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
export function SearchInput({ placeholder = "Search records", name = "search", value, defaultValue, onChange }: { placeholder?: string; name?: string; value?: string; defaultValue?: string; onChange?: (value: string) => void }) { return <div className="relative max-w-sm"><Search aria-hidden="true" className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input aria-label={placeholder} name={name} className="pl-9" placeholder={placeholder} value={value} defaultValue={defaultValue} onChange={onChange ? (event) => onChange(event.target.value) : undefined} /></div>; }
