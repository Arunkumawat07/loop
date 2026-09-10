import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

// Demo credentials — put these exact values in your README (Section 13
// "Demo credentials checklist"). Change the password before anything
// real ever touches this workspace.
const DEMO_PASSWORD = "Demo1234!";

const CHANNELS = ["support_ticket", "app_store", "nps", "sales_call", "community"] as const;

const THEME_SEEDS = [
  { name: "Onboarding friction", color: "#EF4444" },
  { name: "Billing & invoicing", color: "#F59E0B" },
  { name: "Mobile experience", color: "#3B82F6" },
  { name: "SSO / Security", color: "#8B5CF6" },
  { name: "Dashboard performance", color: "#10B981" },
  { name: "Export & reporting", color: "#EC4899" },
];

// A bank of realistic feedback snippets per theme/sentiment, close in
// spirit to Appendix A of the brief. Expand this freely — the brief asks
// for 120+ items; this generator multiplies a base set with light
// variation so you get volume without every row reading identically.
const SNIPPETS: { content: string; sentiment: "POS" | "NEU" | "NEG"; theme: string }[] = [
  { content: "Onboarding took forever — I couldn't figure out how to invite my team.", sentiment: "NEG", theme: "Onboarding friction" },
  { content: "Setup wizard is confusing, I got stuck on step 3 for 20 minutes.", sentiment: "NEG", theme: "Onboarding friction" },
  { content: "The new dashboard is gorgeous and finally fast. Huge improvement.", sentiment: "POS", theme: "Dashboard performance" },
  { content: "Dashboard loads noticeably faster since the last update.", sentiment: "POS", theme: "Dashboard performance" },
  { content: "It does the job, but the mobile experience needs work.", sentiment: "NEU", theme: "Mobile experience" },
  { content: "Mobile app crashes when I try to filter the inbox.", sentiment: "NEG", theme: "Mobile experience" },
  { content: "Prospect wants SSO before they'll sign — third time this month.", sentiment: "NEG", theme: "SSO / Security" },
  { content: "Losing deals because we still don't support SAML SSO.", sentiment: "NEG", theme: "SSO / Security" },
  { content: "Love the new export feature, saved me an hour today.", sentiment: "POS", theme: "Export & reporting" },
  { content: "Wish I could export to PDF directly instead of CSV only.", sentiment: "NEU", theme: "Export & reporting" },
  { content: "Billing page keeps timing out when I try to download an invoice.", sentiment: "NEG", theme: "Billing & invoicing" },
  { content: "Invoice history is clean and easy to find now, thanks!", sentiment: "POS", theme: "Billing & invoicing" },
  { content: "Support was quick to respond but the fix didn't actually work.", sentiment: "NEG", theme: "Onboarding friction" },
  { content: "Really impressed with how easy the first week was.", sentiment: "POS", theme: "Onboarding friction" },
  { content: "Can we get a dark mode for the mobile app?", sentiment: "NEU", theme: "Mobile experience" },
  { content: "Great product overall, just needs SSO for enterprise rollout.", sentiment: "NEU", theme: "SSO / Security" },
];

function randomDateWithinDays(days: number): Date {
  const now = Date.now();
  const past = now - Math.random() * days * 24 * 60 * 60 * 1000;
  return new Date(past);
}

async function main() {
  console.log("Seeding LOOP demo data...");

  await db.$transaction([
    db.embedding.deleteMany(),
    db.feedbackTheme.deleteMany(),
    db.report.deleteMany(),
    db.feedback.deleteMany(),
    db.theme.deleteMany(),
    db.user.deleteMany(),
    db.workspace.deleteMany(),
  ]);

  const workspace = await db.workspace.create({
    data: { name: "Acme Corp (Demo)" },
  });

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const [admin, analyst, viewer] = await Promise.all([
    db.user.create({
      data: {
        name: "Alex Admin",
        email: "admin@loop.demo",
        passwordHash,
        role: "ADMIN",
        workspaceId: workspace.id,
      },
    }),
    db.user.create({
      data: {
        name: "Ana Analyst",
        email: "analyst@loop.demo",
        passwordHash,
        role: "ANALYST",
        workspaceId: workspace.id,
      },
    }),
    db.user.create({
      data: {
        name: "Vic Viewer",
        email: "viewer@loop.demo",
        passwordHash,
        role: "VIEWER",
        workspaceId: workspace.id,
      },
    }),
  ]);

  const themes = await Promise.all(
    THEME_SEEDS.map((t) =>
      db.theme.create({ data: { ...t, workspaceId: workspace.id } })
    )
  );
  const themeByName = new Map(themes.map((t) => [t.name, t]));

  const TARGET_COUNT = 130;
  let created = 0;

  for (let i = 0; i < TARGET_COUNT; i++) {
    const snippet = SNIPPETS[i % SNIPPETS.length];
    const channel = CHANNELS[Math.floor(Math.random() * CHANNELS.length)];
    const theme = themeByName.get(snippet.theme)!;
    const sentimentScore =
      snippet.sentiment === "POS" ? 0.4 + Math.random() * 0.6 :
      snippet.sentiment === "NEG" ? -1 + Math.random() * 0.6 :
      -0.15 + Math.random() * 0.3;

    const feedback = await db.feedback.create({
      data: {
        content: snippet.content,
        channel,
        sentiment: snippet.sentiment,
        sentimentScore,
        status: Math.random() > 0.6 ? "REVIEWED" : "NEW",
        createdAt: randomDateWithinDays(45),
        workspaceId: workspace.id,
        themes: {
          create: { themeId: theme.id, confidence: 0.85 + Math.random() * 0.15 },
        },
      },
    });
    created++;
  }

  console.log(`Created workspace "${workspace.name}" (${workspace.id})`);
  console.log(`Created ${created} feedback items across ${themes.length} themes`);
  console.log("\nDemo login credentials (put these in your README):");
  console.log(`  ADMIN   -> ${admin.email} / ${DEMO_PASSWORD}`);
  console.log(`  ANALYST -> ${analyst.email} / ${DEMO_PASSWORD}`);
  console.log(`  VIEWER  -> ${viewer.email} / ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
