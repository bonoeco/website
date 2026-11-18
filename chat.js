/* BONOECO AI chat assistant — talks to /api/chat on the bonoeco-forms Worker (Workers AI). No third-party scripts. */
(function () {
  'use strict';
  var API = '/api/chat';
  var history = [];
  var sending = false;
  function el(html) { var d = document.createElement('div'); d.innerHTML = html; return d.firstChild; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var css = '' +
    '#bnc-btn{position:fixed;bottom:20px;right:20px;z-index:99999;background:#1a7f4b;color:#fff;border:none;border-radius:999px;padding:12px 20px;font-size:15px;font-weight:600;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.25);font-family:inherit}' +
    '#bnc-btn:hover{background:#166a3f}' +
    '#bnc-win{position:fixed;bottom:76px;right:20px;width:360px;max-width:calc(100vw - 32px);height:520px;max-height:calc(100vh - 110px);z-index:99999;background:#fff;border-radius:14px;box-shadow:0 10px 40px rgba(0,0,0,.3);display:none;flex-direction:column;overflow:hidden;font-family:inherit}' +
    '#bnc-win.open{display:flex}' +
    '#bnc-hd{background:#1a7f4b;color:#fff;padding:12px 16px;font-weight:700;font-size:15px;display:flex;justify-content:space-between;align-items:center}' +
    '#bnc-hd button{background:none;border:none;color:#fff;font-size:20px;cursor:pointer;line-height:1}' +
    '#bnc-msgs{flex:1;overflow-y:auto;padding:14px;background:#f7f7f7}' +
    '.bnc-m{margin-bottom:10px;max-width:85%;padding:9px 12px;border-radius:12px;font-size:14px;line-height:1.45;white-space:pre-wrap;word-wrap:break-word}' +
    '.bnc-u{background:#1a7f4b;color:#fff;margin-left:auto;border-bottom-right-radius:4px}' +
    '.bnc-a{background:#fff;border:1px solid #e2e2e2;color:#222;border-bottom-left-radius:4px}' +
    '.bnc-a a{color:#1a7f4b}' +
    '#bnc-form{display:flex;border-top:1px solid #e2e2e2}' +
    '#bnc-in{flex:1;border:none;padding:13px 14px;font-size:14px;outline:none;font-family:inherit}' +
    '#bnc-form button{background:#1a7f4b;color:#fff;border:none;padding:0 18px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit}' +
    '#bnc-form button:disabled{opacity:.5;cursor:default}' +
    '#bnc-quick{display:flex;gap:6px;flex-wrap:wrap;padding:8px 12px;background:#f7f7f7;border-top:1px solid #eee}' +
    '.bnc-q{background:#fff;border:1px solid #1a7f4b;color:#1a7f4b;border-radius:999px;padding:5px 11px;font-size:12.5px;cursor:pointer;font-family:inherit}' +
    '.bnc-q:hover{background:#eaf5ef}';
  var style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);
  var btn = el('<button id="bnc-btn" type="button">💬 Chat with us</button>');
  var win = el('<div id="bnc-win" role="dialog" aria-label="BONOECO chat"><div id="bnc-hd"><span>BONOECO Assistant</span><button type="button" aria-label="Close chat">&times;</button></div><div id="bnc-msgs"></div><div id="bnc-quick"></div><form id="bnc-form"><input id="bnc-in" type="text" placeholder="Ask about gloves, sizes, custom orders\u2026" autocomplete="off" maxlength="500"><button type="submit">Send</button></form></div>');
  document.body.appendChild(btn); document.body.appendChild(win);
  var msgs = win.querySelector('#bnc-msgs'), input = win.querySelector('#bnc-in'), form = win.querySelector('#bnc-form'), sendBtn = form.querySelector('button');
  var QUICK = ['What glove sizes do you make?', 'How do custom orders work?', 'What is your MOQ?', 'How long does production take?'];
  var quickBox = win.querySelector('#bnc-quick');
  QUICK.forEach(function (q) { var b = document.createElement('button'); b.type = 'button'; b.className = 'bnc-q'; b.textContent = q; b.onclick = function () { input.value = q; form.dispatchEvent(new Event('submit', { cancelable: true })); }; quickBox.appendChild(b); });
  function addMsg(text, who) { var m = document.createElement('div'); m.className = 'bnc-m ' + (who === 'u' ? 'bnc-u' : 'bnc-a'); m.innerHTML = esc(text).replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>'); msgs.appendChild(m); msgs.scrollTop = msgs.scrollHeight; return m; }
  function toggle(open) { win.classList.toggle('open', open); if (open) input.focus(); }
  btn.onclick = function () { toggle(!win.classList.contains('open')); };
  win.querySelector('#bnc-hd button').onclick = function () { toggle(false); };
  if (history.length === 0) addMsg("Hi, I'm the BONOECO assistant \u00b7 ask me about glove models, sizes, customization or ordering.", 'a');
  form.onsubmit = function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text || sending) return;
    input.value = ''; addMsg(text, 'u'); history.push({ role: 'user', content: text });
    sending = true; sendBtn.disabled = true;
    var pending = addMsg('Typing\u2026', 'a');
    fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: history.slice(-12) }) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        pending.remove();
        var reply = (res.j && res.j.reply) || 'Sorry, something went wrong. Please try again or email info@bonoeco.com.';
        addMsg(reply, 'a'); history.push({ role: 'assistant', content: reply });
      })
      .catch(function () { pending.remove(); addMsg('Connection problem \u2014 please check your internet and try again, or email info@bonoeco.com.', 'a'); })
      .finally(function () { sending = false; sendBtn.disabled = false; input.focus(); });
  };
})();
