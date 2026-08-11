import { createSign } from "node:crypto";
import { getMessaging } from "firebase-admin/messaging";
import { getFirebaseAdminApp } from "@/lib/auth/firebase-admin-core";
import { AppError } from "@/lib/errors/app-error";
import type { CalendarProvider, GpsTrackingProvider, LmsProvider, ProviderResult } from "./providers";
import type { NotificationProvider, NotificationSendInput, NotificationSendResult } from "./notification-provider";

const REQUEST_TIMEOUT_MS = 10_000;
type ProviderConfig = Record<string, string | undefined>;

const RETRYABLE_METHODS = new Set(["GET", "HEAD"]);

function retryDelay(attempt: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, 100 * 2 ** attempt));
}

function required(name: string, value: string | undefined) {
  if (!value?.trim()) throw new AppError("PROVIDER_NOT_CONFIGURED", `${name} is not configured.`, 503);
  return value.trim();
}

async function jsonRequest(provider: string, url: string, init: RequestInit = {}) {
  const retryable = RETRYABLE_METHODS.has((init.method ?? "GET").toUpperCase());
  const maxAttempts = retryable ? 3 : 1;
  let response: Response | undefined;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      response = await fetch(url, { ...init, signal: init.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    } catch {
      if (attempt + 1 >= maxAttempts) {
        throw new AppError("INTEGRATION_ERROR", `${provider} could not be reached.`, 503);
      }
      await retryDelay(attempt);
      continue;
    }
    if (retryable && (response.status === 429 || response.status >= 500) && attempt + 1 < maxAttempts) {
      await retryDelay(attempt);
      continue;
    }
    break;
  }
  if (!response) throw new AppError("INTEGRATION_ERROR", `${provider} could not be reached.`, 503);
  const payload = await response.json().catch(() => undefined) as unknown;
  if (!response.ok) {
    const message = payload && typeof payload === "object" && "message" in payload && typeof payload.message === "string" ? payload.message : `${provider} rejected the request.`;
    throw new AppError("INTEGRATION_ERROR", message.slice(0, 300), response.status === 429 || response.status >= 500 ? 503 : 502);
  }
  return payload;
}

export class ResendEmailProvider implements NotificationProvider {
  private readonly apiKey: string;
  private readonly from: string;

  constructor(config: ProviderConfig = {}) {
    this.apiKey = required("RESEND_API_KEY", config.apiKey ?? process.env.RESEND_API_KEY);
    this.from = required("RESEND_FROM_EMAIL", config.from ?? process.env.RESEND_FROM_EMAIL);
  }

  async send(input: NotificationSendInput): Promise<NotificationSendResult> {
    const payload = await jsonRequest("Resend", "https://api.resend.com/emails", {
      method: "POST",
      headers: { accept: "application/json", authorization: `Bearer ${this.apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ from: this.from, to: [input.recipient], subject: input.subject, text: input.body }),
    }) as { id?: unknown } | undefined;
    if (!payload?.id || typeof payload.id !== "string") throw new AppError("INTEGRATION_ERROR", "Resend returned an invalid message response.", 502);
    return { accepted: true, providerMessageId: payload.id };
  }
}

export type TwilioChannel = "sms" | "whatsapp" | "voice";

export class TwilioProvider implements NotificationProvider {
  private readonly accountSid: string;
  private readonly authToken: string;
  private readonly from: string;
  private readonly channel: TwilioChannel;

  constructor(channel: TwilioChannel, config: ProviderConfig = {}) {
    this.channel = channel;
    this.accountSid = required("TWILIO_ACCOUNT_SID", config.accountSid ?? process.env.TWILIO_ACCOUNT_SID);
    this.authToken = required("TWILIO_AUTH_TOKEN", config.authToken ?? process.env.TWILIO_AUTH_TOKEN);
    this.from = required("TWILIO_FROM_NUMBER", config.from ?? process.env.TWILIO_FROM_NUMBER);
  }

  async send(input: NotificationSendInput): Promise<NotificationSendResult> {
    const endpoint = this.channel === "voice" ? "Calls" : "Messages";
    const to = this.channel === "whatsapp" && !input.recipient.startsWith("whatsapp:") ? `whatsapp:${input.recipient}` : input.recipient;
    const form = new URLSearchParams({ To: to, From: this.channel === "whatsapp" && !this.from.startsWith("whatsapp:") ? `whatsapp:${this.from}` : this.from });
    if (this.channel === "voice") {
      const safeBody = input.body.replace(/[<&>"']/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[character] ?? character));
      form.set("Twiml", `<Response><Say>${safeBody}</Say></Response>`);
    } else {
      form.set("Body", input.body);
    }
    const payload = await jsonRequest("Twilio", `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(this.accountSid)}/${endpoint}.json`, {
      method: "POST",
      headers: { accept: "application/json", authorization: `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString("base64")}`, "content-type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    }) as { sid?: unknown } | undefined;
    if (!payload?.sid || typeof payload.sid !== "string") throw new AppError("INTEGRATION_ERROR", "Twilio returned an invalid message response.", 502);
    return { accepted: true, providerMessageId: payload.sid };
  }
}

export class FcmProvider {
  async send(input: { tokens: string[]; title: string; body: string; data?: Record<string, string> }) {
    const app = getFirebaseAdminApp();
    if (!app) throw new AppError("PROVIDER_NOT_CONFIGURED", "Firebase/FCM is not configured.", 503);
    const tokens = [...new Set(input.tokens.map((token) => token.trim()).filter(Boolean))];
    if (!tokens.length) throw new AppError("VALIDATION_ERROR", "At least one FCM token is required.", 422);
    let successCount = 0;
    let failureCount = 0;
    for (let index = 0; index < tokens.length; index += 500) {
      const result = await getMessaging(app).sendEachForMulticast({ tokens: tokens.slice(index, index + 500), notification: { title: input.title, body: input.body }, data: input.data });
      successCount += result.successCount;
      failureCount += result.failureCount;
    }
    if (!successCount) throw new AppError("INTEGRATION_ERROR", "FCM rejected every delivery token.", 502, { failureCount });
    return { accepted: true, successCount, failureCount };
  }
}

function base64Url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

async function googleAccessToken(config: ProviderConfig) {
  const clientEmail = required("GOOGLE_CALENDAR_CLIENT_EMAIL", config.clientEmail ?? process.env.GOOGLE_CALENDAR_CLIENT_EMAIL);
  const privateKey = required("GOOGLE_CALENDAR_PRIVATE_KEY", config.privateKey ?? process.env.GOOGLE_CALENDAR_PRIVATE_KEY).replace(/\\n/g, "\n");
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${base64Url(JSON.stringify({ iss: clientEmail, scope: "https://www.googleapis.com/auth/calendar", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }))}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(privateKey);
  const payload = await jsonRequest("Google Calendar", "https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${base64Url(signature)}` }).toString() }) as { access_token?: unknown } | undefined;
  if (!payload?.access_token || typeof payload.access_token !== "string") throw new AppError("INTEGRATION_ERROR", "Google Calendar did not issue an access token.", 502);
  return payload.access_token;
}

export class GoogleCalendarProvider implements CalendarProvider {
  constructor(private readonly config: ProviderConfig = {}) {}

  async createEvent(input: { title: string; startsAt: Date; endsAt: Date }): Promise<ProviderResult> {
    const calendarId = required("GOOGLE_CALENDAR_ID", this.config.calendarId ?? process.env.GOOGLE_CALENDAR_ID);
    const token = await googleAccessToken(this.config);
    const payload = await jsonRequest("Google Calendar", `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, { method: "POST", headers: { accept: "application/json", authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ summary: input.title, start: { dateTime: input.startsAt.toISOString() }, end: { dateTime: input.endsAt.toISOString() } }) }) as { id?: unknown } | undefined;
    if (!payload?.id || typeof payload.id !== "string") throw new AppError("INTEGRATION_ERROR", "Google Calendar returned an invalid event response.", 502);
    return { ok: true, providerReference: payload.id };
  }
}

export class MoodleProvider implements LmsProvider {
  constructor(private readonly config: ProviderConfig = {}) {}

  async syncCourse(courseId: string): Promise<ProviderResult> {
    const baseUrl = required("MOODLE_BASE_URL", this.config.baseUrl ?? process.env.MOODLE_BASE_URL).replace(/\/$/, "");
    const token = required("MOODLE_TOKEN", this.config.token ?? process.env.MOODLE_TOKEN);
    const query = new URLSearchParams({ wstoken: token, wsfunction: "core_course_get_contents", moodlewsrestformat: "json", courseid: courseId });
    const payload = await jsonRequest("Moodle", `${baseUrl}/webservice/rest/server.php?${query.toString()}`, { headers: { accept: "application/json" } });
    if (!Array.isArray(payload)) throw new AppError("INTEGRATION_ERROR", "Moodle returned an invalid course response.", 502);
    return { ok: true, providerReference: courseId };
  }
}

export class TraccarProvider implements GpsTrackingProvider {
  constructor(private readonly config: ProviderConfig = {}) {}

  async getVehiclePosition(vehicleId: string): Promise<ProviderResult & { latitude?: number; longitude?: number }> {
    const baseUrl = required("TRACCAR_BASE_URL", this.config.baseUrl ?? process.env.TRACCAR_BASE_URL).replace(/\/$/, "");
    const token = required("TRACCAR_TOKEN", this.config.token ?? process.env.TRACCAR_TOKEN);
    const payload = await jsonRequest("Traccar", `${baseUrl}/api/positions?deviceId=${encodeURIComponent(vehicleId)}`, { headers: { accept: "application/json", authorization: `Bearer ${token}` } });
    const position = Array.isArray(payload) ? payload[0] as { latitude?: unknown; longitude?: unknown; deviceId?: unknown } | undefined : undefined;
    if (!position || typeof position.latitude !== "number" || typeof position.longitude !== "number") throw new AppError("NOT_FOUND", "Traccar has no current position for this vehicle.", 404);
    return { ok: true, providerReference: typeof position.deviceId === "string" ? position.deviceId : vehicleId, latitude: position.latitude, longitude: position.longitude };
  }
}

export type TenantSelectedProvider =
  | ResendEmailProvider
  | TwilioProvider
  | GoogleCalendarProvider
  | MoodleProvider
  | TraccarProvider;

/** Resolve a provider from encrypted tenant configuration inside the API.
 * The returned adapter never exposes the decrypted settings to a client. */
export async function createTenantSelectedProvider(input: {
  organizationId: string;
  provider: "resend" | "twilio-sms" | "twilio-whatsapp" | "twilio-voice" | "google-calendar" | "moodle" | "traccar";
  campusId?: string;
}): Promise<TenantSelectedProvider> {
  const { loadIntegrationProviderConfig } = await import("@/features/integrations/services/integration.service");
  const config = await loadIntegrationProviderConfig({
    organizationId: input.organizationId,
    provider: input.provider,
    campusId: input.campusId,
  });
  switch (input.provider) {
    case "resend": return new ResendEmailProvider(config);
    case "twilio-sms": return new TwilioProvider("sms", config);
    case "twilio-whatsapp": return new TwilioProvider("whatsapp", config);
    case "twilio-voice": return new TwilioProvider("voice", config);
    case "google-calendar": return new GoogleCalendarProvider(config);
    case "moodle": return new MoodleProvider(config);
    case "traccar": return new TraccarProvider(config);
  }
}

export function providerDeploymentHealth() {
  return [
    { provider: "firebase-fcm", configured: Boolean(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY), source: "deployment-secret-manager" },
    { provider: "cloudinary", configured: Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET), source: "deployment-secret-manager" },
    { provider: "resend", configured: Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL), source: "deployment-secret-manager" },
    { provider: "twilio", configured: Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER), source: "deployment-secret-manager" },
    { provider: "google-calendar", configured: Boolean(process.env.GOOGLE_CALENDAR_CLIENT_EMAIL && process.env.GOOGLE_CALENDAR_PRIVATE_KEY && process.env.GOOGLE_CALENDAR_ID), source: "deployment-secret-manager-or-tenant-config" },
    { provider: "moodle", configured: Boolean(process.env.MOODLE_BASE_URL && process.env.MOODLE_TOKEN), source: "deployment-secret-manager-or-tenant-config" },
    { provider: "traccar", configured: Boolean(process.env.TRACCAR_BASE_URL && process.env.TRACCAR_TOKEN), source: "deployment-secret-manager-or-tenant-config" },
  ];
}
