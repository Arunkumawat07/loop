import { z } from "zod";

// Password must contain at least one uppercase letter, one lowercase
// letter, one number, and one special character — enforced both here
// (server-side, the real gate) and visually in the UI as the person types.
const strongPassword = z
  .string()
  .min(8, "At least 8 characters")
  .regex(/[A-Z]/, "At least one uppercase letter")
  .regex(/[a-z]/, "At least one lowercase letter")
  .regex(/[0-9]/, "At least one number")
  .regex(/[^A-Za-z0-9]/, "At least one special character");

export const signupRequestSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  workspaceName: z.string().min(2, "Workspace name must be at least 2 characters"),
  email: z.string().email(),
  password: strongPassword,
});

export const otpVerifySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6, "Enter the 6-digit code"),
});

export const otpResendSchema = z.object({
  email: z.string().email(),
});

export const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  workspaceName: z.string().min(2, "Workspace name must be at least 2 characters"),
  email: z.string().email(),
  password: strongPassword,
});

export const feedbackCreateSchema = z.object({
  content: z.string().min(1, "Feedback content is required"),
  channel: z.enum([
    "support_ticket",
    "app_store",
    "nps",
    "sales_call",
    "community",
  ]),
  customerLabel: z.string().optional(),
  sourceRef: z.string().optional(),
});

export const feedbackQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  channel: z.string().optional(),
  sentiment: z.enum(["POS", "NEU", "NEG"]).optional(),
  status: z.enum(["NEW", "REVIEWED", "ACTIONED"]).optional(),
  themeId: z.string().optional(),
  search: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

export const statusUpdateSchema = z.object({
  status: z.enum(["NEW", "REVIEWED", "ACTIONED"]),
});

export const askLoopSchema = z.object({
  question: z.string().min(3, "Ask a real question"),
});

export const reportGenerateSchema = z.object({
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
});

// C3, acceptance criterion 2: CSV bulk import. The client parses the CSV
// (Papaparse) and POSTs an array of raw rows here; this schema is what
// each row must satisfy to be imported. Failed rows are reported back
// with a reason instead of silently dropped.
export const csvRowSchema = z.object({
  content: z.string().min(1, "content is required"),
  channel: z.enum([
    "support_ticket",
    "app_store",
    "nps",
    "sales_call",
    "community",
  ]),
  customer_label: z.string().optional(),
  created_at: z.string().optional(),
});

export const csvImportSchema = z.object({
  rows: z.array(z.record(z.string(), z.string())).min(1).max(2000),
});

export const simulateChannelSchema = z.object({
  channel: z.enum([
    "support_ticket",
    "app_store",
    "nps",
    "sales_call",
    "community",
  ]),
  count: z.coerce.number().int().min(1).max(50).default(15),
});

export const memberCreateSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["ADMIN", "ANALYST", "VIEWER"]),
});

export const roleUpdateSchema = z.object({
  role: z.enum(["ADMIN", "ANALYST", "VIEWER"]),
});

// AI classification response — this is what we force Claude's output to
// match (Section 09.1). Parse the model's JSON through this before saving.
export const classificationResultSchema = z.object({
  sentiment: z.enum(["POS", "NEU", "NEG"]),
  sentimentScore: z.number().min(-1).max(1),
  themes: z.array(z.string()).min(1),
  featureArea: z.string(),
  rationale: z.string(),
});
