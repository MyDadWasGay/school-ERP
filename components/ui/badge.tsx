import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export function Badge({ className, variant = "default", ...props }: HTMLAttributes<HTMLSpanElement> & { variant?: "default" | "secondary" | "outline" | "success" | "warning" }) { return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", { "bg-primary text-primary-foreground": variant === "default", "bg-muted text-muted-foreground": variant === "secondary", "border": variant === "outline", "bg-emerald-100 text-emerald-700": variant === "success", "bg-amber-100 text-amber-800": variant === "warning" }, className)} {...props} />; }
