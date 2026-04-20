import "dotenv/config";
import cron from "node-cron";
import { fetchUnassignedGoodFirstIssues, postComment, hasAlreadyCommented } from "./github.js";
import { generateClaimComment } from "./gemini.js";
import { emailNewIssue, emailCommentSuccess, emailError } from "./email.js";
import { loadSeenIssues, markSeen } from "./state.js";
import { startDashboard } from "./server.js";

const CRON_SCHEDULE = process.env.CRON_SCHEDULE || "* * * * *";
const ACTION_DELAY_MS = parseInt(process.env.ACTION_DELAY_MS || "2000", 10);

// ─── Startup Validation ────────────────────────────────────────────────────────
const REQUIRED_ENV = [
  "GITHUB_TOKEN",
  "GITHUB_USERNAME",
  "GEMINI_API_KEY",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "RESEND_TO_EMAIL",
];

const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`[Startup] ❌ Missing required environment variables:\n  ${missing.join(", ")}`);
  process.exit(1);
}

console.log("╔══════════════════════════════════════════════════════╗");
console.log("║   OpenMetadata Good-First-Issue Catcher 🤖           ║");
console.log("║   Powered by Gemini AI + GitHub + Resend             ║");
console.log("╚══════════════════════════════════════════════════════╝");
console.log(`[Startup] ✅ All env vars present`);
console.log(`[Startup] 📅 CRON schedule: ${CRON_SCHEDULE}`);
console.log(`[Startup] 👤 GitHub user: ${process.env.GITHUB_USERNAME}`);
console.log(`[Startup] 📧 Notifications → ${process.env.RESEND_TO_EMAIL}`);
console.log(`[Startup] 🔍 Watching: open-metadata/OpenMetadata (label: good-first-issue)`);

// ─── Start Live Log Dashboard ─────────────────────────────────────────────────
startDashboard();

// ─── Delay Helper ──────────────────────────────────────────────────────────────
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ─── Main Job ──────────────────────────────────────────────────────────────────
async function runJob() {
  const startedAt = new Date().toISOString();
  console.log(`\n[Job] 🔄 Running at ${startedAt}`);

  const seenIssues = loadSeenIssues();

  let issues;
  try {
    issues = await fetchUnassignedGoodFirstIssues();
    console.log(`[Job] 📋 Found ${issues.length} unassigned good-first-issue(s)`);
  } catch (err) {
    console.error("[Job] ❌ Failed to fetch issues:", err.message);
    await emailError("Failed to fetch issues from GitHub", err.message);
    return;
  }

  // Filter to only NEW issues we haven't processed yet
  const newIssues = issues.filter((issue) => !seenIssues.has(issue.number));
  console.log(`[Job] 🆕 ${newIssues.length} new issue(s) to process`);

  for (const issue of newIssues) {
    console.log(`\n[Job] 🎯 Processing issue #${issue.number}: ${issue.title}`);

    // Mark seen immediately to avoid duplicate processing across runs
    markSeen(seenIssues, issue.number);

    // Send "new issue found" email
    try {
      await emailNewIssue(issue);
      console.log(`[Job] 📧 New issue notification sent`);
    } catch (err) {
      console.error("[Job] ❌ Failed to send new-issue email:", err.message);
    }

    // Check if we already commented
    let alreadyCommented = false;
    try {
      alreadyCommented = await hasAlreadyCommented(issue.number);
    } catch (err) {
      console.error("[Job] ⚠️  Could not check existing comments:", err.message);
    }

    if (alreadyCommented) {
      console.log(`[Job] ⏭️  Already commented on #${issue.number}, skipping`);
      continue;
    }

    // Generate comment with Gemini
    let commentBody;
    try {
      commentBody = await generateClaimComment(issue);
      console.log(`[Job] 🤖 Generated comment (${commentBody.length} chars)`);
    } catch (err) {
      const errMsg = `Failed to generate comment for issue #${issue.number}`;
      console.error(`[Job] ❌ ${errMsg}:`, err.message);
      await emailError(errMsg, err.message);
      continue;
    }

    await delay(ACTION_DELAY_MS); // Rate-limit protection

    // Post comment to GitHub
    try {
      const comment = await postComment(issue.number, commentBody);
      console.log(`[Job] ✅ Comment posted: ${comment.html_url}`);

      await emailCommentSuccess(issue, commentBody, comment.html_url);
      console.log(`[Job] 📧 Success notification sent`);
    } catch (err) {
      const errMsg = `Failed to post comment on issue #${issue.number}`;
      console.error(`[Job] ❌ ${errMsg}:`, err.message);
      await emailError(errMsg, err.message);
    }

    await delay(ACTION_DELAY_MS); // Space out multiple issues
  }

  console.log(`[Job] ✅ Done at ${new Date().toISOString()}`);
}

// ─── CRON Setup ───────────────────────────────────────────────────────────────
if (!cron.validate(CRON_SCHEDULE)) {
  console.error(`[Startup] ❌ Invalid CRON schedule: "${CRON_SCHEDULE}"`);
  process.exit(1);
}

// Run once immediately on startup
runJob().catch((err) => {
  console.error("[Startup] Uncaught error on first run:", err);
});

// Then schedule CRON
cron.schedule(CRON_SCHEDULE, () => {
  runJob().catch((err) => {
    console.error("[CRON] Uncaught error:", err);
  });
});

console.log(`[CRON] ⏰ Scheduler started with schedule: ${CRON_SCHEDULE}`);

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("\n[Shutdown] Received SIGTERM. Shutting down gracefully...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("\n[Shutdown] Received SIGINT. Shutting down gracefully...");
  process.exit(0);
});
