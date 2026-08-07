"use client";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
export function SearchInput({ placeholder = "Search records", value, onChange }: { placeholder?: string; value?: string; onChange?: (value: string) => void }) { return <div className="relative max-w-sm"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder={placeholder} value={value} onChange={(event) => onChange?.(event.target.value)} /></div>; }
