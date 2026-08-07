import Link from "next/link";
import { AuthForm } from "@/features/auth/components/auth-form";
export default function LoginPage() { return <div><div className="mb-8"><p className="text-sm font-medium text-primary">Welcome back</p><h1 className="mt-2 text-3xl font-bold">Sign in to your school</h1><p className="mt-2 text-sm text-muted-foreground">Use your Firebase account to continue.</p></div><AuthForm /><p className="mt-8 text-center text-xs text-muted-foreground"><Link href="/verify-email" className="hover:text-primary">Email verification help</Link></p></div>; }
