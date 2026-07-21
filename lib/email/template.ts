/**
 * Branded HTML wrapper for outbound emails. The BST logo is hardcoded to the
 * production domain so it renders in every mail client regardless of the
 * environment the mail was sent from.
 */

export const LOGO_URL = "https://bst-demo.netlify.app/logo-2.png";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Wrap a plain-text email body into branded, RTL, email-client-safe HTML:
 * a dark-olive header carrying the (cream) BST logo, then the body with any
 * links made clickable. Inline styles + table layout for mail-client support.
 */
export function textToBrandedHtml(text: string): string {
  const body = escapeHtml(text)
    .replace(
      /(https?:\/\/[^\s]+)/g,
      '<a href="$1" style="color:#454a3f;font-weight:bold;">$1</a>',
    )
    .replace(/\n/g, "<br>");

  return `<!doctype html>
<html dir="rtl" lang="he">
<body style="margin:0;padding:0;background:#f4f2ec;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ec;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#ffffff;border:1px solid #e6e3da;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="background:#454a3f;padding:20px 24px;text-align:center;">
              <img src="${LOGO_URL}" alt="BST" height="40" style="height:40px;width:auto;display:inline-block;border:0;" />
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px;color:#2e322a;font-size:15px;line-height:1.75;text-align:right;">
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px;border-top:1px solid #e6e3da;color:#8a8a7e;font-size:12px;text-align:right;">
              קבוצת BST · התחדשות עירונית
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
