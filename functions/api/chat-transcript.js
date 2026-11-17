export async function onRequestPost({ request, env }) {
  if (!env.BONOECO_FORMS || typeof env.BONOECO_FORMS.fetch !== "function") {
    return new Response("Chat transcript delivery is not configured.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" }
    });
  }
  return env.BONOECO_FORMS.fetch(request);
}
