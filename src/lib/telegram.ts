/**
 * Telegram Bot notification helper.
 *
 * Sends a push notification to the admin's Telegram chat whenever a
 * customer sends a message. Fire-and-forget: the caller never waits
 * for Telegram, and failures are logged but never block the request.
 *
 * Setup:
 *   1. Create a bot via @BotFather → get the API token
 *   2. Message the bot once, then visit
 *      https://api.telegram.org/bot<TOKEN>/getUpdates to find your chat ID
 *   3. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID env vars
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const enabled = Boolean(BOT_TOKEN && CHAT_ID);

interface NotificationPayload {
  /** Visitor's session ID (so admin can find the chat in the dashboard) */
  sessionId: string;
  /** Message text (null if image-only) */
  text?: string | null;
  /** True if the message has an image attachment */
  hasImage?: boolean;
  /** Direct link to the admin dashboard Chats tab */
  dashboardUrl?: string;
}

/**
 * Send a Telegram notification. Always resolves (never throws) —
 * notifications are best-effort and must never break the chat flow.
 */
export async function notifyTelegram(payload: NotificationPayload): Promise<void> {
  if (!enabled) return;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://kholahaq.vercel.app";
  const dashboardUrl =
    payload.dashboardUrl || `${siteUrl}/admin/dashboard`;

  const messageText = payload.text?.trim();
  const preview = messageText
    ? messageText.length > 200
      ? messageText.slice(0, 200) + "…"
      : messageText
    : payload.hasImage
      ? "[image attached]"
      : "(empty)";

  const text = [
    "💬 *New message on Gomen*",
    "",
    `*From:* Anonymous (\`${payload.sessionId.slice(0, 16)}\`)`,
    `*Message:* ${preview}`,
    "",
    `Open dashboard: ${dashboardUrl}`,
  ].join("\n");

  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const body = JSON.stringify({
      chat_id: CHAT_ID,
      text,
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    });
    // Fire-and-forget with a short timeout so we never block long.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: controller.signal,
    });
    clearTimeout(timeout);
  } catch (e) {
    // Log but never throw — notifications are best-effort.
    console.error("[telegram] notification failed:", e instanceof Error ? e.message : String(e));
  }
}
