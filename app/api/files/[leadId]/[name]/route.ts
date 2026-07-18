import { readLeadFile } from "@/lib/storage/files";

export const runtime = "nodejs";

/** Serve a stored lead attachment (PDF inline; .eml as a download). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ leadId: string; name: string }> },
) {
  const { leadId, name } = await params;
  const decoded = decodeURIComponent(name);
  const buf = await readLeadFile(decodeURIComponent(leadId), decoded);
  if (!buf) return new Response("not found", { status: 404 });

  const isEml = /\.eml$/i.test(decoded);
  const isPdf = /\.pdf$/i.test(decoded);
  const contentType = isPdf
    ? "application/pdf"
    : isEml
      ? "message/rfc822"
      : "application/octet-stream";
  // PDFs open in the browser viewer; .eml downloads so it opens in the mail client.
  const disposition = isEml ? "attachment" : "inline";

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(decoded)}`,
    },
  });
}
