export type NotificationSendInput = { recipient: string; subject: string; body: string; metadata?: Record<string, string> };
export type NotificationSendResult = { accepted: boolean; providerMessageId?: string; error?: string };

export interface NotificationProvider { send(input: NotificationSendInput): Promise<NotificationSendResult>; }
