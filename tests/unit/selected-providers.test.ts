import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GoogleCalendarProvider,
  MoodleProvider,
  ResendEmailProvider,
  TraccarProvider,
  TwilioProvider,
} from "../../lib/integrations/selected-providers";

describe("selected provider adapters", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("fails closed when Resend and Twilio deployment credentials are absent", () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("RESEND_FROM_EMAIL", "");
    vi.stubEnv("TWILIO_ACCOUNT_SID", "");
    vi.stubEnv("TWILIO_AUTH_TOKEN", "");
    vi.stubEnv("TWILIO_FROM_NUMBER", "");

    expect(() => new ResendEmailProvider()).toThrowError(
      expect.objectContaining({ code: "PROVIDER_NOT_CONFIGURED", status: 503 }),
    );
    expect(() => new TwilioProvider("sms")).toThrowError(
      expect.objectContaining({ code: "PROVIDER_NOT_CONFIGURED", status: 503 }),
    );
  });

  it("fails closed before making a network request for calendar, LMS, and GPS providers", async () => {
    vi.stubEnv("GOOGLE_CALENDAR_ID", "");
    vi.stubEnv("GOOGLE_CALENDAR_CLIENT_EMAIL", "");
    vi.stubEnv("GOOGLE_CALENDAR_PRIVATE_KEY", "");
    vi.stubEnv("MOODLE_BASE_URL", "");
    vi.stubEnv("MOODLE_TOKEN", "");
    vi.stubEnv("TRACCAR_BASE_URL", "");
    vi.stubEnv("TRACCAR_TOKEN", "");

    await expect(
      new GoogleCalendarProvider().createEvent({
        title: "Test event",
        startsAt: new Date("2026-08-09T10:00:00.000Z"),
        endsAt: new Date("2026-08-09T11:00:00.000Z"),
      }),
    ).rejects.toMatchObject({ code: "PROVIDER_NOT_CONFIGURED", status: 503 });
    await expect(new MoodleProvider().syncCourse("course-1")).rejects.toMatchObject({
      code: "PROVIDER_NOT_CONFIGURED",
      status: 503,
    });
    await expect(new TraccarProvider().getVehiclePosition("vehicle-1")).rejects.toMatchObject({
      code: "PROVIDER_NOT_CONFIGURED",
      status: 503,
    });
  });
});
