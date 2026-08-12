import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type ComponentProps } from "react";
import { cn } from "@/lib/utils/cn";

export type ButtonVariant = "default" | "secondary" | "outline" | "ghost" | "destructive";
export type ButtonSize = "default" | "sm" | "lg";
export type ButtonStyleProps = { variant?: ButtonVariant; size?: ButtonSize; className?: string };

export function buttonClassName({ className, variant = "default", size = "default" }: ButtonStyleProps = {}) {
  return cn("inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50", {
    "bg-primary text-primary-foreground hover:opacity-90": variant === "default",
    "bg-muted text-foreground hover:bg-accent": variant === "secondary",
    "border bg-transparent hover:bg-accent": variant === "outline",
    "hover:bg-accent": variant === "ghost",
    "bg-destructive text-destructive-foreground hover:opacity-90": variant === "destructive",
    "h-9 px-3": size === "sm",
    "h-10 px-4": size === "default",
    "h-11 px-6": size === "lg",
  }, className);
}

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & Omit<ButtonStyleProps, "className"> & { className?: string }>(function Button({ className, variant, size, ...props }, ref) {
  return <button ref={ref} className={buttonClassName({ className, variant, size })} {...props} />;
});
Button.displayName = "Button";

export function ButtonLink({ className, variant, size, ...props }: Omit<ComponentProps<typeof Link>, "className"> & ButtonStyleProps) {
  return <Link {...props} className={buttonClassName({ className, variant, size })} />;
}
