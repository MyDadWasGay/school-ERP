import { SchoolSetupForm } from "@/features/auth/components/school-setup-form";

export default function SetupPage() { return <div><div className="mb-8"><p className="text-sm font-medium text-primary">First-time school setup</p><h1 className="mt-2 text-3xl font-bold">Create your school</h1><p className="mt-2 text-sm text-muted-foreground">This is only for the first administrator of a new, empty database.</p></div><SchoolSetupForm /></div>; }
