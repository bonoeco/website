/* BONOECO chat assistant widget.
   Floating chat bubble on every page; talks to /api/chat on the
   bonoeco-forms Worker (Workers AI). No third-party services. */
(function () {
  "use strict";
  if (window.__bonoecoChat) return;
  window.__bonoecoChat = true;

  var GREEN = "#142d25", BRASS = "#b6935b", BG = "#f7f4ee";
  var css = [
    "#bnc-btn{position:fixed;right:20px;bottom:20px;z-index:9998;display:flex;align-items:center;gap:8px;background:" + GREEN + ";color:#fff;border:1px solid " + BRASS + ";border-radius:999px;padding:12px 18px;font:600 15px/1 system-ui,-apple-system,'Segoe UI',sans-serif;cursor:pointer;box-shadow:0 6px 24px rgba(0,0,0,.28)}",
    "#bnc-btn:hover{background:#1b3a2f}",
    "#bnc-btn svg{width:20px;height:20px;fill:#fff;flex:none}",
    "#bnc-panel{position:fixed;right:20px;bottom:84px;z-index:9999;width:360px;max-width:calc(100vw - 24px);height:520px;max-height:72vh;display:none;flex-direction:column;background:#fff;border:1px solid #ddd;border-radius:16px;overflow:hidden;box-shadow:0 18px 50px rgba(0,0,0,.30);font:15px/1.45 system-ui,-apple-system,'Segoe UI',sans-serif;color:#222}",
    "#bnc-panel.open{display:flex}",
    ".bnc-head{background:" + GREEN + ";color:#fff;padding:13px 16px;display:flex;align-items:center;justify-content:space-between}",
    ".bnc-head b{font-size:15px;letter-spacing:.02em}",
    ".bnc-head small{display:block;color:" + BRASS + ";font-size:12px;margin-top:1px}",
    ".bnc-x{background:none;border:0;color:#fff;font-size:22px;line-height:1;cursor:pointer;padding:2px 4px}",
    ".bnc-msgs{flex:1;overflow-y:auto;padding:14px;background:" + BG + ";display:flex;flex-direction:column;gap:9px}",
    ".bnc-m{max-width:85%;padding:9px 12px;border-radius:13px;white-space:pre-wrap;word-wrap:break-word}",
    ".bnc-m.bot{background:#fff;border:1px solid #e3ddd0;align-self:flex-start;border-bottom-left-radius:4px}",
    ".bnc-m.me{background:" + GREEN + ";color:#fff;align-self:flex-end;border-bottom-right-radius:4px}",
    ".bnc-m.typing{color:#888;font-style:italic}",
    ".bnc-chips{display:flex;flex-wrap:wrap;gap:6px;padding:0 14px 10px;background:" + BG + "}",
    ".bnc-chip{background:#fff;border:1px solid " + BRASS + ";color:" + GREEN + ";border-radius:999px;padding:5px 11px;font-size:13px;cursor:pointer}",
    ".bnc-chip:hover{background:#efe7d7}",
    ".bnc-row{display:flex;gap:8px;padding:10px;border-top:1px solid #e7e2d6;background:#fff}",
    ".bnc-in{flex:1;border:1px solid #ccc;border-radius:10px;padding:9px 11px;font:inherit;font-size:15px;outline:none}",
    ".bnc-in:focus{border-color:" + BRASS + "}",
    ".bnc-send{background:" + GREEN + ";color:#fff;border:0;border-radius:10px;padding:0 16px;font:600 15px inherit;cursor:pointer}",
    ".bnc-send:disabled{opacity:.55;cursor:default}",
    "@media (max-width:480px){#bnc-panel{right:12px;bottom:78px}}"
  ].join("\n");

  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  var btn = document.createElement("button");
  btn.id = "bnc-btn";
  btn.setAttribute("aria-label", "Chat with the BONOECO assistant");
  btn.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3C6.5 3 2 6.9 2 11.8c0 2.8 1.5 5.3 3.9 6.9-.1 1.2-.6 2.7-1.4 3.8 2.3-.2 4.4-1.2 5.7-2.2.6.1 1.2.2 1.8.2 5.5 0 10-3.9 10-8.7S17.5 3 12 3z"/></svg><span>Chat</span>';

  var panel = document.createElement("div");
  panel.id = "bnc-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "BONOECO assistant chat");
  panel.innerHTML =
    '<div class="bnc-head"><div><b>BONOECO Assistant</b><small>Answers about gloves, custom orders &amp; OEM</small></div>' +
    '<button class="bnc-x" aria-label="Close chat">&times;</button></div>' +
    '<div class="bnc-msgs"></div>' +
    '<div class="bnc-chips"></div>' +
    '<form class="bnc-row"><input class="bnc-in" type="text" maxlength="1000" autocomplete="off" placeholder="Ask about gloves, custom orders, OEM\u2026" aria-label="Type your question">' +
    '<button class="bnc-send" type="submit">Send</button></form>';

  document.body.appendChild(btn);
  document.body.appendChild(panel);

  var msgs = panel.querySelector(".bnc-msgs");
  var chips = panel.querySelector(".bnc-chips");
  var form = panel.querySelector(".bnc-row");
  var input = panel.querySelector(".bnc-in");
  var send = panel.querySelector(".bnc-send");
  var history = [];
  var greeted = false;
  var busy = false;

  var SUGGESTIONS = [
    "What leathers do you offer?",
    "How do custom gloves work?",
    "Do you ship to Japan?",
    "How do I get a price?"
  ];

  function add(text, who, cls) {
    var d = document.createElement("div");
    d.className = "bnc-m " + who + (cls ? " " + cls : "");
    d.textContent = text;
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
    return d;
  }

  function open() {
    panel.classList.add("open");
    if (!greeted) {
      greeted = true;
      add("Hi! I can answer questions about BONOECO gloves, custom orders and wholesale / OEM projects. What would you like to know?", "bot");
      SUGGESTIONS.forEach(function (q) {
        var c = document.createElement("button");
        c.type = "button";
        c.className = "bnc-chip";
        c.textContent = q;
        c.addEventListener("click", function () { ask(q); });
        chips.appendChild(c);
      });
    }
    input.focus();
  }
  function close() { panel.classList.remove("open"); }

  btn.addEventListener("click", function () {
    panel.classList.contains("open") ? close() : open();
  });
  panel.querySelector(".bnc-x").addEventListener("click", close);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });

  function ask(q) {
    var text = (q || input.value || "").trim();
    if (!text || busy) return;
    busy = true;
    send.disabled = true;
    input.value = "";
    chips.style.display = "none";
    add(text, "me");
    history.push({ role: "user", content: text });
    var typing = add("Typing\u2026", "bot", "typing");

    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var reply = (data && data.reply) ||
          "Sorry, I can't answer right now. Please email us at info.bonoeco@gmail.com or use the Contact page.";
        typing.remove();
        add(reply, "bot");
        history.push({ role: "assistant", content: reply });
      })
      .catch(function () {
        typing.remove();
        add("Sorry, something went wrong. Please email us at info.bonoeco@gmail.com or use the Contact page.", "bot");
      })
      .then(function () {
        busy = false;
        send.disabled = false;
        input.focus();
      });
  }

  form.addEventListener("submit", function (e) { e.preventDefault(); ask(); });
})();
