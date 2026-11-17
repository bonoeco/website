const transcriptRates = new Map();
const sentTranscripts = new Map();

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get("Origin") || "";
  if (origin !== "https://bonoeco.com" && origin !== "https://www.bonoeco.com") {
    return new Response("Forbidden", { status: 403 });
  }
  if (!env.BONOECO_FORMS || typeof env.BONOECO_FORMS.fetch !== "function") {
    return new Response("Chat transcript delivery is not configured.", { status: 503 });
  }

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const now = Date.now();
  const previous = transcriptRates.get(ip);
  if (previous && now - previous.start < 3600000 && previous.count >= 3) {
    return new Response("Transcript email rate limit reached.", { status: 429 });
  }
  if (!previous || now - previous.start >= 3600000) transcriptRates.set(ip, { start: now, count: 1 });
  else previous.count += 1;

  if (Number(request.headers.get("Content-Length") || 0) > 50000) {
    return new Response("Transcript too large.", { status: 413 });
  }

  let payload;
  try { payload = await request.json(); } catch {
    return new Response("Bad request.", { status: 400 });
  }
  if (payload.consent !== true || typeof payload.id !== "string" || !/^[a-zA-Z0-9-]{1,80}$/.test(payload.id) || !Array.isArray(payload.messages)) {
    return new Response("Consent and transcript are required.", { status: 422 });
  }

  const sentAt = sentTranscripts.get(payload.id);
  if (sentAt && now - sentAt < 86400000) return new Response(JSON.stringify({ sent: true }), { status: 200, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
  if (sentAt) sentTranscripts.delete(payload.id);

  const messages = payload.messages
    .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-40)
    .map(m => ({ role: m.role, content: m.content.trim().slice(0, 800) }))
    .filter(m => m.content);
  if (!messages.some(m => m.role === "user")) return new Response("Empty transcript.", { status: 422 });

  const transcript = [
    "A website visitor chose to email this chat transcript to BONOECO.",
    "Delivered to info.bonoeco@gmail.com. The website does not store this transcript.",
    "Conversation ID: " + payload.id.slice(0, 80),
    "",
    ...messages.map(m => (m.role === "user" ? "Visitor" : "BONOECO Assistant") + ":\n" + m.content),
    ""
  ].join("\n");

  const form = new FormData();
  form.set("_page", "contact");
  form.set("name", "Website chat transcript");
  form.set("email", "info.bonoeco@gmail.com");
  form.set("type", "Chat transcript");
  form.set("message", transcript);

  const workerUrl = new URL("https://bonoeco-forms.internal/api/inquiry");
  const forwarded = new Request(workerUrl, {
    method: "POST",
    headers: { Origin: origin },
    body: form,
    redirect: "manual"
  });

  try {
    const result = await env.BONOECO_FORMS.fetch(forwarded);
    if (result.status !== 303) return new Response("Email delivery failed.", { status: 502 });
    return new Response(JSON.stringify({ sent: true }), {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
    });
  } catch {
    return new Response("Email delivery failed.", { status: 502 });
  }
}
