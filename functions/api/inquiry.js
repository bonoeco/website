// BONOECO inquiry form backend (Cloudflare Pages Function)
// Route: POST /api/inquiry  (used by contact.html and custom.html)
//
// Sends the submission to info.bonoeco@gmail.com through Cloudflare Email
// Sending, using the EMAIL send_email binding configured in the Pages
// project settings (Settings -> Bindings).
// The destination is a verified Email Routing destination address.
// Nothing is stored in a database; the email is the record.

import { EmailMessage } from "cloudflare:email";

const FROM = "forms@bonoeco.com";
const TO = "info.bonoeco@gmail.com";
const MAX = 6000;

function encodeSubject(s) {
  const clean = s.replace(/[\r\n]+/g, " ").slice(0, 120);
  // RFC 2047 encoded-word if non-ASCII is present
  if (/^[\x20-\x7E]*$/.test(clean)) return clean;
  return "=?UTF-8?B?" + btoa(unescape(encodeURIComponent(clean))) + "?=";
}

function toBase64Utf8(s) {
  const b = btoa(unescape(encodeURIComponent(s)));
  return b.replace(/.{76}/g, "$&\r\n");
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let data;
  try {
    data = await request.formData();
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const page = data.get("_page") === "custom" ? "custom" : "contact";
  const back = page === "custom" ? "/custom" : "/contact";

  // Honeypot: humans never fill the hidden "website" field.
  if (data.get("website")) {
    return Response.redirect(new URL(back + "?sent=1", request.url), 303);
  }

  const fields = {};
  for (const [k, v] of data.entries()) {
    if (k.startsWith("_") || k === "website") continue;
    fields[k] = String(v).slice(0, MAX).trim();
  }

  const email = fields.email || "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(
      "Please provide a valid email address so we can reply. Or email us directly at " + TO,
      { status: 422, headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  }

  const isCustom = page === "custom";
  const subject = isCustom
    ? "BONOECO custom glove inquiry - " + (fields.position || "custom")
    : "BONOECO " + (fields.type || "Retail") + " inquiry - " + (fields.name || email);

  const body =
    (isCustom ? "BONOECO custom glove brief" : "BONOECO website inquiry") +
    "\n\n" +
    Object.entries(fields)
      .map(([k, v]) => k.charAt(0).toUpperCase() + k.slice(1) + ": " + v)
      .join("\n\n") +
    "\n";

  const raw =
    "From: BONOECO Website <" + FROM + ">\r\n" +
    "To: " + TO + "\r\n" +
    "Reply-To: " + email + "\r\n" +
    "Subject: " + encodeSubject(subject) + "\r\n" +
    "MIME-Version: 1.0\r\n" +
    "Content-Type: text/plain; charset=utf-8\r\n" +
    "Content-Transfer-Encoding: base64\r\n" +
    "\r\n" +
    toBase64Utf8(body);

  try {
    await env.EMAIL.send(new EmailMessage(FROM, TO, raw));
  } catch (e) {
    return new Response(
      "Sorry, sending failed. Please email your inquiry directly to " + TO,
      { status: 502, headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  }

  return Response.redirect(new URL(back + "?sent=1", request.url), 303);
}
