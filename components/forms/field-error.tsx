export function FieldError({ message }: { message?: string }) { return message ? <p className="text-xs text-red-600">{message}</p> : null; }
