export function FieldError({ message, id }: { message?: string; id?: string }) { return message ? <p id={id} role="alert" aria-live="polite" className="text-xs text-red-600">{message}</p> : null; }
