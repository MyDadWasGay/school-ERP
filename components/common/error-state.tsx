import { AlertCircle } from "lucide-react";
export function ErrorState({ message = "We could not load this data." }: { message?: string }) { return <div role="alert" className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertCircle className="h-5 w-5" />{message}</div>; }
