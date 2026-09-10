import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  workspaceName: z.string().min(2, "Workspace name must be at least 2 characters"),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
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

// AI classification response — this is what we force Claude's output to
// match (Section 09.1). Parse the model's JSON through this before saving.
export const classificationResultSchema = z.object({
  sentiment: z.enum(["POS", "NEU", "NEG"]),
  sentimentScore: z.number().min(-1).max(1),
  themes: z.array(z.string()).min(1),
  featureArea: z.string(),
  rationale: z.string(),
});
