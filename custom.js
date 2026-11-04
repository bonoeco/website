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

  function setStatus(msg) { if (!status) return; status.textContent = msg; status.classList.toggle("show", !!msg); }

  function selectInGroup(container, btn) {
    container.querySelectorAll("[aria-checked]").forEach(function (el) {
      el.setAttribute("aria-checked", el === btn ? "true" : "false");
    });
    var input = document.getElementById(container.getAttribute("data-target"));
    if (input) input.value = btn.getAttribute("data-value");
    updateSummary();
  }

  // Chips (single-select groups; the size group is rendered per position)
  document.querySelectorAll(".chips[data-target]:not(#size-choices)").forEach(function (group) {
    group.querySelectorAll(".chip").forEach(function (chip) {
      chip.addEventListener("click", function () { selectInGroup(group, chip); });
    });
  });

  // Sizes depend on the position. Catcher mitts are sized by circumference.
  var SIZES = {
    "Infield": [["10.5 in", "10.5\u2033"], ["11 in", "11\u2033"], ["11.25 in", "11.25\u2033"], ["11.5 in", "11.5\u2033"], ["11.75 in", "11.75\u2033"], ["12 in", "12\u2033"]],
    "Outfield": [["12.5 in", "12.5\u2033"], ["12.75 in", "12.75\u2033"], ["13 in", "13\u2033"]],
    "Pitcher": [["11.5 in", "11.5\u2033"], ["11.75 in", "11.75\u2033"], ["12 in", "12\u2033"], ["12.25 in", "12.25\u2033"], ["12.5 in", "12.5\u2033"]],
    "Catcher": [["31 in circumference", "31\u2033"], ["31.5 in circumference", "31.5\u2033"], ["32 in circumference", "32\u2033"], ["32.5 in circumference", "32.5\u2033"], ["33 in circumference", "33\u2033"], ["33.5 in circumference", "33.5\u2033"], ["34 in circumference", "34\u2033"], ["34.5 in circumference", "34.5\u2033"]],
    "First base": [["12.5 in", "12.5\u2033"], ["12.75 in", "12.75\u2033"], ["13 in", "13\u2033"], ["13.5 in", "13.5\u2033"]],
    "Training": [["9.5 in", "9.5\u2033"]]
  };
  var SIZE_NOTES = {
    "Catcher": "Catcher mitts are sized by circumference (around the mitt), not by length.",
    "Training": "Training (pancake) gloves are made in 9.5 in."
  };
  var sizeGroup = document.getElementById("size-choices");
  var sizeNote = document.getElementById("size-note");
  function renderSizes(position) {
    if (!sizeGroup) return;
    sizeGroup.innerHTML = "";
    var list = SIZES[position] || [];
    var input = document.getElementById("f-size");
    var keep = false;
    list.forEach(function (pair) { if (input && input.value === pair[0]) keep = true; });
    if (input && !keep) input.value = "";
    list.forEach(function (pair) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", input && input.value === pair[0] ? "true" : "false");
      b.setAttribute("data-value", pair[0]);
      b.textContent = pair[1];
      b.addEventListener("click", function () { selectInGroup(sizeGroup, b); });
      sizeGroup.appendChild(b);
    });
    if (sizeNote) {
      var note = SIZE_NOTES[position] || (position ? "" : "Pick a position above \u2014 the size list adjusts to it.");
      sizeNote.textContent = note;
      sizeNote.style.display = note ? "" : "none";
    }
  }


  // Position cards with preview swap
  var posGroup = document.getElementById("position-choices");
  if (posGroup) {
    posGroup.querySelectorAll(".choice").forEach(function (card) {
      card.addEventListener("click", function () {
        posGroup.querySelectorAll(".choice").forEach(function (c) {
          c.setAttribute("aria-checked", c === card ? "true" : "false");
        });
        document.getElementById("f-position").value = card.getAttribute("data-value");
        setStatus("");
        renderSizes(card.getAttribute("data-value"));
        showGlove(card.getAttribute("data-value"));
        updateSummary();
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
    var blocked = false;
    if (n > 0 && !baseReady()) {
      blocked = true;
      setStatus("Choose a glove position first — pick one of the glove photos in step 1 (Base), then the other steps open.");
      n = 0;
      var pg = document.getElementById("position-choices");
      if (pg) {
        pg.classList.remove("nudge");
        void pg.offsetWidth;
        pg.classList.add("nudge");
        pg.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(function () { pg.classList.remove("nudge"); }, 1100);
      }
    }
    current = n;
    tabs.forEach(function (t) {
      t.setAttribute("aria-selected", Number(t.getAttribute("data-step")) === n ? "true" : "false");
    });
    panels.forEach(function (p) {
      p.classList.toggle("active", Number(p.getAttribute("data-panel")) === n);
    });
    updateSummary();
    if (!blocked) window.scrollTo({ top: 0, behavior: "smooth" });
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

  // Live color strip under the preview
  var HEX = {};
  PALETTE.forEach(function (p) { HEX[p[0]] = p[1]; });
  var COLOR_FIELDS = [
    ["f-web-color", "Web"], ["f-palm-color", "Palm"], ["f-wrist-color", "Wrist"],
    ["f-binding-color", "Binding"], ["f-welting-color", "Welting"],
    ["f-lacing-color", "Lacing"], ["f-stitching-color", "Stitching"],
    ["f-logo-color", "Logo"]
  ];
  function updateStrip() {
    var strip = document.getElementById("color-strip");
    if (!strip) return;
    strip.innerHTML = "";
    COLOR_FIELDS.forEach(function (pair) {
      var el = document.getElementById(pair[0]);
      var val = el ? el.value : "";
      var pill = document.createElement("span");
      pill.className = "cs" + (val ? "" : " empty");
      var dot = document.createElement("span");
      dot.className = "dot";
      if (val && HEX[val]) dot.style.background = HEX[val];
      pill.appendChild(dot);
      pill.appendChild(document.createTextNode(pair[1] + ": " + (val || "\u2014")));
      strip.appendChild(pill);
    });
  }

  // Live photo preview: one BONOECO glove per position family, and for
  // fielders one per web style — picking a web style in step 2 switches
  // the glove to one that actually has that web. Every color part has a
  // shading layer normalized to remove the photo's own color, so the
  // glove starts as one blank neutral glove; picking a color covers that
  // part at full strength, and only that part.
  var FAMILY = {
    "Infield": "fielder", "Outfield": "fielder", "Pitcher": "fielder",
    "First base": "firstbase", "Catcher": "catcher", "Training": "training"
  };
  var PART_FOR = {
    "f-web-color": "web", "f-palm-color": "palm", "f-wrist-color": "wrist",
    "f-binding-color": "binding", "f-welting-color": "welting",
    "f-lacing-color": "lacing", "f-stitching-color": "stitching",
    "f-logo-color": "logo"
  };
  var FIELD_FOR_PART = {};
  COLOR_FIELDS.forEach(function (pair) { FIELD_FOR_PART[PART_FOR[pair[0]]] = pair[0]; });
  var DRAW_ORDER = ["palm", "web", "wrist", "binding", "welting", "stitching", "lacing", "logo"];
  var ALL8 = ["palm", "web", "wrist", "binding", "welting", "lacing", "stitching", "logo"];
  var NO_LOGO = ["palm", "web", "wrist", "binding", "welting", "stitching", "lacing"];
  var NO_STITCH = ["palm", "web", "wrist", "binding", "welting", "lacing", "logo"];
  var PREVIEW_PARTS = {
    "fielder": ALL8,  // Two Piece web (the default fielder glove)
    "fielder-iweb": ALL8,
    "fielder-hweb": NO_LOGO,
    "fielder-vweb": NO_LOGO,
    "fielder-cross": NO_LOGO,
    "fielder-basket": NO_LOGO,
    "fielder-trapeze": ALL8,
    "fielder-shield": ALL8,
    "catcher": ALL8,
    "firstbase": NO_LOGO,
    "training": NO_LOGO,
    "fielder-b": ALL8,
    "fielder-iweb-b": NO_LOGO,
    "fielder-hweb-b": NO_LOGO,
    "fielder-vweb-b": NO_LOGO,
    "fielder-cross-b": NO_LOGO,
    "fielder-basket-b": NO_LOGO,
    "fielder-trapeze-b": ALL8,
    "fielder-shield-b": ALL8,
    "catcher-b": ALL8,
    "firstbase-b": NO_STITCH,
    "training-b": NO_STITCH
  };
  // two views per glove: side "a" (the default photo) and side "b" (the
  // glove turned over), with the honest name of each side per glove
  var SIDE_NAMES = {
    "fielder": ["Back side", "Palm side"], "fielder-iweb": ["Back side", "Palm side"],
    "fielder-hweb": ["Back side", "Palm side"], "fielder-vweb": ["Palm side", "Back side"],
    "fielder-cross": ["Back side", "Palm side"], "fielder-basket": ["Palm side", "Back side"],
    "fielder-trapeze": ["Back side", "Palm side"], "fielder-shield": ["Back side", "Palm side"],
    "catcher": ["Front side", "Back side"], "firstbase": ["Palm side", "Back side"],
    "training": ["Palm side", "Back side"]
  };
  var viewSide = "a";
  var WEB_VARIANT = {
    "I-Web": "fielder-iweb", "H-Web": "fielder-hweb", "V-Web": "fielder-vweb",
    "Cross Web": "fielder-cross", "Trapeze / T-Web": "fielder-trapeze",
    "Basket Web": "fielder-basket", "Two Piece": "fielder",
    "Shield / Closed": "fielder-shield"
  };
  var canvas = document.getElementById("glove-canvas");
  var ctx = null;
  try { if (canvas && canvas.getContext) ctx = canvas.getContext("2d"); } catch (e) { ctx = null; }
  var curFamily = "fielder";
  var famCache = {};
  var offCanvas = null;

  function loadFamily(fam) {
    if (famCache[fam] || typeof Image === "undefined") return;
    var entry = { base: null, layers: {} };
    famCache[fam] = entry;
    var dir = "img/preview9/";
    var b = new Image();
    b.onload = function () { entry.base = b; drawPhoto(); };
    b.src = dir + fam + "-base.jpg";
    (PREVIEW_PARTS[fam] || []).forEach(function (part) {
      var im = new Image();
      im.onload = function () { entry.layers[part] = im; drawPhoto(); };
      im.src = dir + fam + "-" + part + ".webp";
    });
    // alternate wrist layer: the same glove with a velcro strap, swapped
    // in when the visitor picks the Velcro wrist-strap option
    var wa = new Image();
    wa.onload = function () { entry.layers.wristalt = wa; drawPhoto(); };
    wa.src = "img/preview7/" + fam + "-wristalt.webp";
  }

  function baseKey() {
    if (curFamily !== "fielder") return curFamily;
    var w = document.getElementById("f-web");
    return WEB_VARIANT[w ? w.value : ""] || "fielder";
  }

  function currentKey() {
    var k = baseKey();
    return viewSide === "b" ? k + "-b" : k;
  }

  function updateSideButtons() {
    var names = SIDE_NAMES[baseKey()] || ["Side 1", "Side 2"];
    [["pv-side-a", "a", names[0]], ["pv-side-b", "b", names[1]]].forEach(function (cfg) {
      var btn = document.getElementById(cfg[0]);
      if (!btn || !btn.style) return;
      btn.textContent = cfg[2];
      var on = viewSide === cfg[1];
      btn.style.background = on ? "#142d25" : "transparent";
      btn.style.color = on ? "#fff" : "inherit";
    });
  }

  function drawPhoto() {
    if (!ctx || !canvas) return;
    updateSideButtons();
    var key = currentKey();
    var entry = famCache[key];
    if (!entry) { loadFamily(key); entry = famCache[key]; }
    if (!entry || !entry.base) return;
    try {
      if (canvas.width !== entry.base.naturalWidth) {
        canvas.width = entry.base.naturalWidth;
        canvas.height = entry.base.naturalHeight;
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(entry.base, 0, 0);
      if (!offCanvas) offCanvas = document.createElement("canvas");
      if (!offCanvas.getContext) return;
      offCanvas.width = canvas.width;
      offCanvas.height = canvas.height;
      var octx = offCanvas.getContext("2d");
      if (!octx) return;
      DRAW_ORDER.forEach(function (part) {
        var img = entry.layers[part];
        if (part === "wrist") {
          var strapEl = document.getElementById("f-wrist-type");
          if (strapEl && strapEl.value === "Velcro" && entry.layers.wristalt) img = entry.layers.wristalt;
        }
        if (!img) return;
        var el = document.getElementById(FIELD_FOR_PART[part]);
        var name = el ? el.value : "";
        // unpicked parts render in the blank neutral tone, so the glove
        // starts colorless and a picked color is what covers the part
        var fill = (name && HEX[name]) ? HEX[name] : "#c9c2b4";
        octx.globalCompositeOperation = "source-over";
        octx.clearRect(0, 0, offCanvas.width, offCanvas.height);
        octx.fillStyle = fill;
        octx.fillRect(0, 0, offCanvas.width, offCanvas.height);
        octx.globalCompositeOperation = "multiply";
        octx.drawImage(img, 0, 0);
        octx.globalCompositeOperation = "destination-in";
        octx.drawImage(img, 0, 0);
        ctx.drawImage(offCanvas, 0, 0);
      });
    } catch (e) { /* preview is decorative; the brief still records colors */ }
  }

  function applyColors() { drawPhoto(); }

  function showGlove(position) {
    curFamily = FAMILY[position] || "fielder";
    loadFamily(currentKey());
    drawPhoto();
  }

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
    updateStrip();
    applyColors();
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

  [["pv-side-a", "a"], ["pv-side-b", "b"]].forEach(function (cfg) {
    var btn = document.getElementById(cfg[0]);
    if (btn) btn.addEventListener("click", function () {
      viewSide = cfg[1];
      loadFamily(currentKey());
      drawPhoto();
    });
  });
  updateSideButtons();

  renderSizes("");
  updateStrip();
  applyColors();
  showGlove("");

  // Thank-you state after the Worker redirects back with ?sent=1
  if (new URLSearchParams(window.location.search).get("sent") === "1") {
    setStatus("Thank you — your custom glove brief has been sent. We reply by email with the confirmed specification, price and timing.");
    goTo(4);
  }
})();
