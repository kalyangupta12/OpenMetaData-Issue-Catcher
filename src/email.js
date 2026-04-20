import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL || "noreply@example.com";
const TO = process.env.RESEND_TO_EMAIL;

/**
 * Internal helper to send an email
 */
async function sendEmail({ subject, html }) {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: [TO],
      subject,
      html,
    });

    if (error) {
      console.error("[Resend] Failed to send email:", error);
    } else {
      console.log(`[Resend] Email sent successfully: ${subject} (id: ${data.id})`);
    }
  } catch (err) {
    console.error("[Resend] Unexpected error sending email:", err.message);
  }
}

/**
 * Email: New issue discovered
 */
export async function emailNewIssue(issue) {
  await sendEmail({
    subject: `🎯 New OpenMetadata Good-First-Issue: #${issue.number} - ${issue.title}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0d1117; color: #c9d1d9; border-radius: 12px;">
        <div style="background: linear-gradient(135deg, #1f6feb 0%, #388bfd 100%); padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h1 style="margin: 0; color: #ffffff; font-size: 22px;">🎯 New Issue Found!</h1>
          <p style="margin: 8px 0 0; color: #cae8ff; font-size: 14px;">OpenMetadata Good-First-Issue Catcher</p>
        </div>

        <div style="background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 20px; margin-bottom: 16px;">
          <h2 style="margin: 0 0 8px; color: #58a6ff; font-size: 18px;">
            <a href="${issue.html_url}" style="color: #58a6ff; text-decoration: none;">#${issue.number} — ${issue.title}</a>
          </h2>
          <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px;">
            ${issue.labels.map((l) => `<span style="background: #1f6feb33; color: #58a6ff; border: 1px solid #1f6feb; padding: 2px 8px; border-radius: 20px; font-size: 12px;">${l.name}</span>`).join("")}
          </div>
          <p style="margin: 0; color: #8b949e; font-size: 14px; line-height: 1.6;">
            ${issue.body ? issue.body.substring(0, 400).replace(/</g, "&lt;").replace(/>/g, "&gt;") + (issue.body.length > 400 ? "..." : "") : "No description provided."}
          </p>
        </div>

        <div style="background: #0d4a1a; border: 1px solid #2ea043; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
          <p style="margin: 0; color: #3fb950; font-size: 14px;">✅ <strong>The bot is now attempting to claim this issue on your behalf.</strong> You'll receive another email with the result.</p>
        </div>

        <div style="text-align: center; margin-top: 20px;">
          <a href="${issue.html_url}" style="background: #1f6feb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">View Issue on GitHub →</a>
        </div>

        <p style="margin-top: 20px; color: #484f58; font-size: 12px; text-align: center;">
          OpenMetadata Issue Catcher • Running on Coolify
        </p>
      </div>
    `,
  });
}

/**
 * Email: Comment posted successfully
 */
export async function emailCommentSuccess(issue, commentBody, commentUrl) {
  await sendEmail({
    subject: `✅ Successfully Claimed Issue #${issue.number} on OpenMetadata!`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0d1117; color: #c9d1d9; border-radius: 12px;">
        <div style="background: linear-gradient(135deg, #196c2e 0%, #2ea043 100%); padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h1 style="margin: 0; color: #ffffff; font-size: 22px;">✅ Issue Claimed!</h1>
          <p style="margin: 8px 0 0; color: #aff7c1; font-size: 14px;">Your comment was posted successfully</p>
        </div>

        <div style="background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 20px; margin-bottom: 16px;">
          <h2 style="margin: 0 0 12px; color: #58a6ff; font-size: 18px;">
            <a href="${issue.html_url}" style="color: #58a6ff; text-decoration: none;">#${issue.number} — ${issue.title}</a>
          </h2>
          <p style="margin: 0 0 8px; color: #8b949e; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Comment Posted:</p>
          <div style="background: #0d1117; border-left: 3px solid #2ea043; padding: 12px 16px; border-radius: 0 6px 6px 0;">
            <p style="margin: 0; color: #c9d1d9; font-size: 14px; line-height: 1.6; font-style: italic;">"${commentBody}"</p>
          </div>
        </div>

        <div style="text-align: center; margin-top: 20px; display: flex; gap: 12px; justify-content: center;">
          <a href="${commentUrl}" style="background: #2ea043; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">View Comment →</a>
          <a href="${issue.html_url}" style="background: #21262d; color: #c9d1d9; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block; border: 1px solid #30363d;">View Issue →</a>
        </div>

        <p style="margin-top: 20px; color: #484f58; font-size: 12px; text-align: center;">
          OpenMetadata Issue Catcher • Running on Coolify
        </p>
      </div>
    `,
  });
}

/**
 * Email: An error occurred
 */
export async function emailError(context, error) {
  await sendEmail({
    subject: `❌ OpenMetadata Issue Catcher Error: ${context}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0d1117; color: #c9d1d9; border-radius: 12px;">
        <div style="background: linear-gradient(135deg, #6e1c1c 0%, #b91c1c 100%); padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h1 style="margin: 0; color: #ffffff; font-size: 22px;">❌ Error Detected</h1>
          <p style="margin: 8px 0 0; color: #fecaca; font-size: 14px;">OpenMetadata Issue Catcher</p>
        </div>

        <div style="background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 20px; margin-bottom: 16px;">
          <p style="margin: 0 0 8px; color: #8b949e; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Context:</p>
          <p style="margin: 0 0 16px; color: #f97583; font-size: 14px;">${context}</p>

          <p style="margin: 0 0 8px; color: #8b949e; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Error Message:</p>
          <div style="background: #0d1117; border-left: 3px solid #b91c1c; padding: 12px 16px; border-radius: 0 6px 6px 0;">
            <code style="color: #ff7b72; font-family: monospace; font-size: 13px; word-break: break-all;">${String(error)}</code>
          </div>
        </div>

        <div style="background: #1c1a0d; border: 1px solid #9e6a03; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
          <p style="margin: 0; color: #d29922; font-size: 14px;">⚠️ The bot will continue running and retry on the next CRON cycle.</p>
        </div>

        <p style="margin-top: 20px; color: #484f58; font-size: 12px; text-align: center;">
          Timestamp: ${new Date().toISOString()} • OpenMetadata Issue Catcher • Running on Coolify
        </p>
      </div>
    `,
  });
}
