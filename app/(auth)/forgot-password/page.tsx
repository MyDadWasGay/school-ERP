import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";
export default function ForgotPasswordPage() { return <div><h1 className="mb-2 text-3xl font-bold">Reset your password</h1><p className="mb-8 text-sm text-muted-foreground">We’ll send a secure Firebase reset link.</p><ForgotPasswordForm /></div>; }
