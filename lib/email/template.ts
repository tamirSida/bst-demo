/**
 * Branded HTML wrapper for outbound emails.
 *
 * Mail clients can't read CSS variables or fetch a same-origin asset, so the
 * brand has to be inlined at send time: colours as literal hex, and the mark as
 * a wordmark unless the brand supplies an absolute logo URL. `APP_URL` makes a
 * brand-relative logo path absolute — a relative src is a broken image in every
 * mail client.
 */
import { activeBrand } from "../brand/config";

function logoUrl(): string | null {
  const src = activeBrand().logo?.src;
  if (!src) return null;
  if (/^https?:\/\//.test(src)) return src;
  const base = process.env.APP_URL?.replace(/\/$/, "");
  return base ? `${base}${src}` : null;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Wrap a plain-text email body into branded, RTL, email-client-safe HTML:
 * a dark header carrying the brand mark, then the body with any
 * links made clickable. Inline styles + table layout for mail-client support.
 */
export function textToBrandedHtml(text: string): string {
  const brand = activeBrand();
  const p = brand.palette;
  const logo = logoUrl();
  const body = escapeHtml(text)
    .replace(
      /(https?:\/\/[^\s]+)/g,
      '<a href="$1" style="color:${p.brand600};font-weight:bold;">$1</a>',
    )
    .replace(/\n/g, "<br>");

  return `<!doctype html>
<html dir="rtl" lang="he">
<body style="margin:0;padding:0;background:${p.canvas};font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${p.canvas};padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#ffffff;border:1px solid ${p.line};border-radius:12px;overflow:hidden;">
          <tr>
            <td style="background:${p.brand600};padding:20px 24px;text-align:center;">
              ${
                logo
                  ? `<img src="${logo}" alt="${brand.name}" height="40" style="height:40px;width:auto;display:inline-block;border:0;" />`
                  : `<span style="color:${p.logoContrast};font-size:20px;letter-spacing:0.18em;font-weight:300;">${brand.name}</span>`
              }
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px;color:${p.ink900};font-size:15px;line-height:1.75;text-align:right;">
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px;border-top:1px solid ${p.line};color:${p.ink500};font-size:12px;text-align:right;">
              ${brand.name} · התחדשות עירונית
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
