export type EmailConfig = {
  apiKey: string;
  from: string;
};

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export function isEmailConfigured(cfg: EmailConfig | null | undefined): cfg is EmailConfig {
  return Boolean(cfg?.apiKey && cfg.from);
}

/**
 * Send via Resend HTTP API (no SDK). Returns false on soft failure so callers
 * can keep the paid flow (ticket already created) without aborting settle.
 */
export async function sendEmail(
  cfg: EmailConfig,
  input: SendEmailInput,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true; id?: string } | { ok: false; error: string }> {
  const res = await fetchImpl("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${cfg.apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: cfg.from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    return { ok: false, error: `resend ${res.status}: ${text.slice(0, 200)}` };
  }
  try {
    const json = JSON.parse(text) as { id?: string };
    return { ok: true, id: json.id };
  } catch {
    return { ok: true };
  }
}

export function notifyTicketEmailHtml(opts: {
  question: string;
  ticketId: string;
  approveUrl: string;
  denyUrl: string;
}): string {
  const q = escapeHtml(opts.question);
  return `<!doctype html><html><body style="font-family:system-ui,sans-serif;line-height:1.4">
  <p><strong>AgentKeep notify</strong></p>
  <p>${q}</p>
  <p>
    <a href="${opts.approveUrl}">Approve</a>
    &nbsp;|&nbsp;
    <a href="${opts.denyUrl}">Deny</a>
  </p>
  <p style="color:#666;font-size:12px">Ticket ${escapeHtml(opts.ticketId)}. Poll GET /v1/notify/${escapeHtml(opts.ticketId)} for status.</p>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
