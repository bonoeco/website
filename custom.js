// BONOECO custom glove builder: step tabs, single-select chips and swatches,
// live preview and summary, and the brief summary used by the Copy button.
(function () {
  "use strict";

  var PALETTE = [
    ["Black", "#1b1b1b"], ["Brown", "#6b4226"], ["Tan", "#c89b6d"],
    ["Camel", "#c8a165"], ["Cream", "#efe6d0"], ["White", "#f5f5f5"],
    ["Red", "#b3202c"], ["Burgundy", "#6e1423"], ["Orange", "#e07b28"],
    ["Gold", "#d9a92c"], ["Green", "#1e5631"], ["Mint", "#a8c8b0"],
    ["Navy", "#1f2a4d"], ["Royal Blue", "#2456a6"], ["Purple", "#6a2a91"],
    ["Pink", "#e58bb1"], ["Gray", "#8a8d90"]
  ];

  var form = document.getElementById("custom-form");
  if (!form) return;
  var status = document.getElementById("custom-status");
  var summary = document.getElementById("summary");
  var preview = document.getElementById("preview");

  function setStatus(msg) { if (status) status.textContent = msg; }

  function selectInGroup(container, btn) {
    container.querySelectorAll("[aria-checked]").forEach(function (el) {
      el.setAttribute("aria-checked", el === btn ? "true" : "false");
    });
    var input = document.getElementById(container.getAttribute("data-target"));
    if (input) input.value = btn.getAttribute("data-value");
    updateSummary();
  }

  // Chips (single-select groups)
  document.querySelectorAll(".chips[data-target]").forEach(function (group) {
    group.querySelectorAll(".chip").forEach(function (chip) {
      chip.addEventListener("click", function () { selectInGroup(group, chip); });
    });
  });

  // Position cards with preview swap
  var posGroup = document.getElementById("position-choices");
  if (posGroup) {
    posGroup.querySelectorAll(".choice").forEach(function (card) {
      card.addEventListener("click", function () {
        posGroup.querySelectorAll(".choice").forEach(function (c) {
          c.setAttribute("aria-checked", c === card ? "true" : "false");
        });
        document.getElementById("f-position").value = card.getAttribute("data-value");
        if (preview) {
          preview.src = card.getAttribute("data-img");
          preview.alt = card.getAttribute("data-value") + " glove preview";
        }
        updateSummary();
      });
    });
  }

  // Swatches (built from the palette, single-select per group)
  document.querySelectorAll(".swatches[data-target]").forEach(function (group) {
    PALETTE.forEach(function (pair) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "swatch";
      b.style.background = pair[1];
      b.title = pair[0];
      b.setAttribute("aria-label", pair[0]);
      b.setAttribute("aria-checked", "false");
      b.setAttribute("data-value", pair[0]);
      b.addEventListener("click", function () { selectInGroup(group, b); });
      group.appendChild(b);
    });
  });

  // Steps
  var tabs = Array.prototype.slice.call(document.querySelectorAll(".steps [data-step]"));
  var panels = Array.prototype.slice.call(document.querySelectorAll("[data-panel]"));
  var current = 0;
  function baseReady() { return !!document.getElementById("f-position").value; }
  function goTo(n) {
    if (n > 0 && !baseReady()) {
      setStatus("Choose a glove position in step 1 (Base) first.");
      n = 0;
    }
    current = n;
    tabs.forEach(function (t) {
      t.setAttribute("aria-selected", Number(t.getAttribute("data-step")) === n ? "true" : "false");
    });
    panels.forEach(function (p) {
      p.classList.toggle("active", Number(p.getAttribute("data-panel")) === n);
    });
    updateSummary();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  tabs.forEach(function (t) {
    t.addEventListener("click", function () { goTo(Number(t.getAttribute("data-step"))); });
  });
  document.querySelectorAll("[data-next]").forEach(function (b) {
    b.addEventListener("click", function () { goTo(Math.min(current + 1, panels.length - 1)); });
  });
  document.querySelectorAll("[data-prev]").forEach(function (b) {
    b.addEventListener("click", function () { goTo(Math.max(current - 1, 0)); });
  });

  // Summary
  var LABELS = [
    ["f-position", "Position"], ["f-leather", "Leather"], ["f-hand", "Hand"],
    ["f-size", "Size"], ["f-web", "Web"], ["f-web-color", "Web color"],
    ["f-palm-color", "Palm color"], ["f-wrist-color", "Wrist color"],
    ["f-wrist-type", "Wrist strap"], ["f-binding-color", "Binding"],
    ["f-welting-color", "Welting"], ["f-lacing-color", "Lacing"],
    ["f-stitching-color", "Stitching"], ["f-logo", "Logo"],
    ["f-logo-color", "Logo color"]
  ];
  function briefLines() {
    var lines = [];
    LABELS.forEach(function (pair) {
      var el = document.getElementById(pair[0]);
      if (el && el.value) lines.push(pair[1] + ": " + el.value);
    });
    var thumb = document.getElementById("thumb-text");
    if (thumb && thumb.value) lines.push("Thumb embroidery: " + thumb.value);
    var lining = document.getElementById("lining-text");
    if (lining && lining.value) lines.push("Lining text: " + lining.value);
    return lines;
  }
  function updateSummary() {
    if (!summary) return;
    var lines = briefLines();
    summary.innerHTML = "";
    if (!lines.length) {
      var li = document.createElement("li");
      li.textContent = "Choose a position to begin.";
      summary.appendChild(li);
      return;
    }
    lines.forEach(function (line) {
      var li = document.createElement("li");
      li.textContent = line;
      summary.appendChild(li);
    });
  }
  ["thumb-text", "lining-text"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener("input", updateSummary);
  });

  // Copy brief
  var copyBtn = document.getElementById("copy-custom");
  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      var lines = briefLines();
      var email = document.getElementById("email");
      var text = "BONOECO custom glove brief\n" + lines.join("\n") +
        (email && email.value ? "\nEmail: " + email.value : "");
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(
          function () { setStatus("Brief copied. You can paste it into an email to info.bonoeco@gmail.com."); },
          function () { setStatus("Copy failed in this browser. Your selections are listed in the summary."); }
        );
      } else {
        setStatus("Copy is not available in this browser. Your selections are listed in the summary.");
      }
    });
  }

  // Thank-you state after the Worker redirects back with ?sent=1
  if (new URLSearchParams(window.location.search).get("sent") === "1") {
    setStatus("Thank you — your custom glove brief has been sent. We reply by email with the confirmed specification, price and timing.");
    goTo(4);
  }
})();
