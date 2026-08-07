import { z } from "zod";

const dateInput = z.coerce.date().refine((value) => !Number.isNaN(value.getTime()), "Enter a valid date.");

export const libraryItemSchema = z.object({
  title: z.string().trim().min(2).max(160),
  author: z.string().trim().max(160).optional(),
  isbn: z.string().trim().max(40).optional(),
});

export const libraryCopySchema = z.object({
  itemId: z.string().min(1),
  accessionNumber: z.string().trim().min(2).max(80),
});

export const issueLibraryCopySchema = z.object({
  copyId: z.string().min(1),
  borrowerType: z.enum(["student", "user"]),
  borrowerId: z.string().min(1),
  dueAt: dateInput,
});

export const returnLibraryCopySchema = z.object({
  transactionId: z.string().min(1),
  outcome: z.enum(["returned", "lost", "damaged"]),
  dailyFineMinor: z.coerce.number().int().min(0).max(100_000).default(100),
});

export const renewLibraryCopySchema = z.object({
  transactionId: z.string().min(1),
  extensionDays: z.coerce.number().int().min(1).max(30).default(14),
});

export const libraryReservationSchema = z.object({
  itemId: z.string().min(1),
});

export const digitalResourceSchema = z.object({
  name: z.string().trim().min(2).max(160),
  url: z.string().trim().url().max(2_000),
  description: z.string().trim().max(500).optional(),
});

export type LibraryItemInput = z.infer<typeof libraryItemSchema>;
export type LibraryCopyInput = z.infer<typeof libraryCopySchema>;
export type IssueLibraryCopyInput = z.infer<typeof issueLibraryCopySchema>;
export type ReturnLibraryCopyInput = z.infer<typeof returnLibraryCopySchema>;
export type RenewLibraryCopyInput = z.infer<typeof renewLibraryCopySchema>;
export type LibraryReservationInput = z.infer<typeof libraryReservationSchema>;
export type DigitalResourceInput = z.infer<typeof digitalResourceSchema>;
