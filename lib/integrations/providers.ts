export type ProviderResult = { ok: boolean; providerReference?: string; error?: string; retryable?: boolean };
export interface HardwareAttendanceProvider { pushAttendance(payload: Record<string, unknown>): Promise<ProviderResult>; }
export interface GpsTrackingProvider { getVehiclePosition(vehicleId: string): Promise<ProviderResult & { latitude?: number; longitude?: number }>; }
export interface LmsProvider { syncCourse(courseId: string): Promise<ProviderResult>; }
export interface CalendarProvider { createEvent(input: { title: string; startsAt: Date; endsAt: Date }): Promise<ProviderResult>; }
