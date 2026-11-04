// BONOECO site services (Cloudflare Worker)
// 1) /api/inquiry — form handler for contact.html and custom.html; emails
//    submissions to info.bonoeco@gmail.com via the EMAIL send_email binding.
// 2) /api/chat — AI assistant for the site chat widget, powered by the AI
//    (Workers AI) binding and a knowledge base taken from bonoeco.com.
// Both run behind zone routes on bonoeco.com (workers.dev 1101s on this
// account, so the Worker is only reachable through bonoeco.com routes).

import { EmailMessage } from "cloudflare:email";

const FROM = "forms@bonoeco.com";
const TO = "info.bonoeco@gmail.com";
const SITE = "https://bonoeco.com";
const MAX = 6000;

/* ---------------- form handling (unchanged) ---------------- */

function encodeSubject(s) {
  const clean = s.replace(/[\r\n]+/g, " ").slice(0, 120);
  if (/^[\x20-\x7E]*$/.test(clean)) return clean;
  return "=?UTF-8?B?" + btoa(unescape(encodeURIComponent(clean))) + "?=";
}

function toBase64Utf8(s) {
  const b = btoa(unescape(encodeURIComponent(s)));
  return b.replace(/.{76}/g, "$&\r\n");
}

async function handleInquiry(request, env) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let data;
  try {
    data = await request.formData();
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const page = data.get("_page") === "custom" ? "custom" : "contact";
  const back = SITE + "/" + page + "?sent=1";

  if (data.get("website")) {
    return Response.redirect(back, 303);
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

  return Response.redirect(back, 303);
}

/* ---------------- AI chat assistant ---------------- */

const SYSTEM_PROMPT = [
  "You are the BONOECO website assistant. BONOECO makes baseball gloves for personal orders and for wholesale / OEM brand projects. Answer visitor questions briefly and helpfully, in the same language the visitor uses.",
  "",
  "Facts about BONOECO (from bonoeco.com — rely only on these):",
  "- Products: baseball gloves and mitts for infield, outfield and pitcher positions, plus catcher mitts, first base mitts and 9.5 inch training gloves. The Gallery page shows real gloves, for example black and gold or black and orange infield gloves, outfield gloves in several colorways, a cream and black catcher mitt, and A1 grade custom order gloves.",
  "- Leathers used include Japan Kip, Japan Steerhide and cowhide. Japan Kip is lighter and finer-grained; steerhide is more durable and heavier — the blog explains the difference.",
  "- Custom gloves: the Custom page has a step-by-step builder — position, leather, throwing hand, size (10 to 13 inches), web style (I-Web, H-Web, V-Web, Cross, Trapeze, Basket, Two Piece, Shield), shell and trim colors, wrist logo, thumb embroidery and lining text. The visitor submits a brief and BONOECO replies with the confirmed specification, price and timing.",
  "- Wholesale and OEM: for brands, retailers, distributors and teams. The process is: share a brief (position, size, materials, reference images, quantity, target market), then BONOECO confirms feasibility, branding, packaging, minimum quantities and sample arrangements, then the specification, quotation and delivery schedule are agreed before ordering.",
  "- Markets served: North America, Japan, South Korea and Europe. Shipping availability and terms are confirmed by destination.",
  "- Contact: info.bonoeco@gmail.com, or the Contact page form and the Custom builder on bonoeco.com.",
  "",
  "Rules you must follow:",
  "- BONOECO does not publish prices, minimum order quantities, stock levels or delivery times. Never invent them. Say they are confirmed per inquiry and point the visitor to the Custom page, the Contact page, or info.bonoeco@gmail.com.",
  "- Never promise discounts, deadlines or specifications that are not in the facts above.",
  "- Keep answers short: two to four sentences unless the visitor asks for detail.",
  "- If a question is outside baseball gloves and BONOECO, politely say you can only help with BONOECO gloves and orders.",
  "- When a visitor is ready to order or asks for a quote, tell them exactly where to go: the Custom builder for a personal custom glove, the Contact page for retail questions, or the Wholesale & OEM page for brand projects."
].join("\n");

function jsonResponse(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

async function handleChat(request, env) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  const origin = request.headers.get("Origin") || request.headers.get("Referer") || "";
  if (!/^https:\/\/(www\.)?bonoeco\.com/.test(origin)) {
    return jsonResponse({ error: "forbidden" }, 403);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "bad request" }, 400);
  }

  const incoming = Array.isArray(payload.messages) ? payload.messages : [];
  const history = incoming
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-10)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 1000) }));
  if (!history.length || history[history.length - 1].role !== "user") {
    return jsonResponse({ error: "no user message" }, 422);
  }

  try {
    const result = await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
      messages: [{ role: "system", content: SYSTEM_PROMPT }].concat(history),
      max_tokens: 450,
    });
    const reply = (result && result.response ? String(result.response) : "").trim();
    if (!reply) throw new Error("empty response");
    return jsonResponse({ reply });
  } catch (e) {
    return jsonResponse(
      { error: "assistant unavailable", reply: "Sorry, I can't answer right now. Please email us at " + TO + " or use the Contact page — we reply by email." },
      200
    );
  }
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path.startsWith("/api/chat")) return handleChat(request, env);
    return handleInquiry(request, env);
  },
};
