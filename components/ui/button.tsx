import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export function Button({ className, variant = "default", size = "default", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "secondary" | "outline" | "ghost" | "destructive"; size?: "default" | "sm" | "lg" }) {
  return <button className={cn("inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50", { "bg-primary text-primary-foreground hover:opacity-90": variant === "default", "bg-muted text-foreground hover:bg-accent": variant === "secondary", "border bg-transparent hover:bg-accent": variant === "outline", "hover:bg-accent": variant === "ghost", "bg-red-600 text-white hover:bg-red-700": variant === "destructive", "h-9 px-3": size === "sm", "h-10 px-4": size === "default", "h-11 px-6": size === "lg" }, className)} {...props} />;
}
