export type AppUrlEnvironment = {
  NEXT_PUBLIC_APP_URL?: string;
  VERCEL_ENV?: string;
  VERCEL_URL?: string;
};

export function resolveAppUrl(environment: AppUrlEnvironment = process.env as AppUrlEnvironment) {
  const configuredUrl = environment.NEXT_PUBLIC_APP_URL?.trim();
  if (configuredUrl) return configuredUrl.replace(/\/$/, "");

  if (environment.VERCEL_ENV === "preview") {
    const vercelUrl = environment.VERCEL_URL?.trim();
    if (vercelUrl) return `https://${vercelUrl.replace(/\/$/, "")}`;
  }

  return "";
}
