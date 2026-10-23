/* Handles Lab app v1 (preview). Same localStorage keys as the website day pages, so progress is shared:
 *   hl-done {day: "YYYY-MM-DD"} · hl-chk {"day-moveId": 1} · hl-badges {Tier: 1}
 * Lock rule (same as the site): a day is locked until every EARLIER day of a lower level is done. */
(function () {
  "use strict";
  var A = window.HLAPP, DAYS = A.days, TIERS = A.tiers;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  function load(k) { try { return JSON.parse(localStorage.getItem(k) || "{}"); } catch (e) { return {}; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function ymd(dt) { dt = dt || new Date(); return dt.getFullYear() + "-" + ("0" + (dt.getMonth() + 1)).slice(-2) + "-" + ("0" + dt.getDate()).slice(-2); }
  var done = load("hl-done"), chk = load("hl-chk"), badges = load("hl-badges");
  for (var k in done) if (done[k] === 1) done[k] = "";
  var day = function (d) { return DAYS[d - 1]; };
  var ti = function (d) { return TIERS.indexOf(day(d).tier); };
  function missingFor(d) { var m = []; for (var x = 1; x < d; x++) if (ti(x) < ti(d) && !done[x]) m.push(x); return m; }
  function locked(d) { return ti(d) > 0 && missingFor(d).length > 0; }
  function today() { for (var d = 1; d <= 30; d++) if (!done[d] && !locked(d)) return d; for (d = 1; d <= 30; d++) if (!done[d]) return d; return 30; }
  function doneToday() { var t = ymd(), last = 0; for (var d in done) if (done[d] === t) last = Math.max(last, +d); return last; }
  function streak() {
    var dates = {}; for (var k in done) if (done[k]) dates[done[k]] = 1;
    var t = new Date(), n = 0; if (!dates[ymd(t)]) t.setDate(t.getDate() - 1);
    while (dates[ymd(t)]) { n++; t.setDate(t.getDate() - 1); }
    return n;
  }
  function tierDone(t) { return DAYS.every(function (x) { return x.tier !== t || done[x.d]; }); }
  function currentTier() { for (var i = 0; i < TIERS.length; i++) if (!tierDone(TIERS[i])) return TIERS[i]; return TIERS[TIERS.length - 1]; }
  function count() { return Object.keys(done).length; }

  /* ---------- header ---------- */
  function paintTop() {
    var s = streak(), f = $("#streak");
    f.querySelector("b").textContent = s; f.classList.toggle("off", !s); f.setAttribute("aria-label", "Streak: " + s + " day" + (s === 1 ? "" : "s") + ". Open your streak");
    var ct = currentTier(); $("#lvlchip").textContent = "Level " + (TIERS.indexOf(ct) + 1) + " of 4 · " + ct;
  }

  /* ---------- profile card + streak screen (everyone) ----------
   * The athlete here is the brand athlete (Option A, /assets/img/athlete.webp), named "Your athlete". The character picker
   * (feature/character-picker, behind ?picker=1) layers on top by overriding athName() and athImg() only. */
  var DEF_NAME = "Your athlete";
  function athName() { return PICKER ? ath.name : DEF_NAME; }   // picker flag: the chosen name (default "Your athlete")
  function athImg(kind) { return PICKER ? still(kind === "celebrate" ? "celebrate.webp" : "avatar-192.png") : "/assets/img/athlete.webp"; }
  function profileCard() {
    var s = streak(), c = count();
    return '<div class="card profile"><img src="' + athImg("avatar") + '" alt="" width="64" height="64"><div class="pc-t"><p class="kick">Your profile</p>' +
      '<b class="pc-n">' + esc(athName()) + '</b><span class="mute small">🔥 ' + s + "-day streak · " + c + "/30 days</span></div>" +
      '<button type="button" class="pc-e" data-streak aria-label="Open your streak">Streak</button></div>';
  }
  function streakScreen() {
    var s = streak(), c = count(), n = athName(), o = document.createElement("div"), back = document.activeElement;
    o.className = "celebrate streakscr"; o.setAttribute("role", "dialog"); o.setAttribute("aria-modal", "true"); o.setAttribute("aria-labelledby", "stk-h");
    o.innerHTML = '<button type="button" class="x" aria-label="Close">✕</button>' +
      '<div class="ath-cel"><img src="' + athImg("celebrate") + '" alt="" width="720" height="720"><span class="fb" aria-hidden="true">🔥</span></div>' +
      '<h2 class="disp" id="stk-h" tabindex="-1">' + (n && n !== DEF_NAME ? esc(n) + "'s" : "Your") + " streak: " + s + " day" + (s === 1 ? "" : "s") + "</h2>" +
      "<p>" + (doneToday() ? "You practiced today. Nice." : s ? "Practice today to keep it alive." : "Finish a day to start your streak.") + " " + c + "/30 days done.</p>" +
      '<div class="minigrid" aria-label="' + c + ' of 30 days done">' + DAYS.map(function (D) { return "<i" + (done[D.d] ? ' class="on"' : "") + "></i>"; }).join("") + "</div>" +
      '<div class="acts">' + (s ? '<button class="big share" data-share>Share your streak</button><p class="u13">Under 13? Parents, share their streak.</p>' : '<button class="big share" data-c>Go to today</button>') +
      '<button class="big ghost" data-x>Back</button></div>';
    document.body.appendChild(o); document.body.style.overflow = "hidden";
    var sh = $(".shell"); sh.setAttribute("aria-hidden", "true"); sh.inert = true;
    function close() { o.remove(); document.body.style.overflow = ""; sh.removeAttribute("aria-hidden"); sh.inert = false; document.removeEventListener("keydown", esck); if (back && back.focus) back.focus(); }
    function esck(e) { if (e.key === "Escape" && !(document.getElementById("sharesheet") && !document.getElementById("sharesheet").hidden)) close(); }
    document.addEventListener("keydown", esck);
    o.onclick = function (e) { if (e.target.closest("[data-share]")) return openShare(); if (e.target.closest("[data-c]")) { close(); return show("today"); } if (e.target.closest(".x,[data-x]")) close(); };
    $("#stk-h", o).focus();
  }
  $("#streak").addEventListener("click", streakScreen);

  /* ---------- character picker (Phase 1, behind a flag) ----------
   * Flag: ?picker=1 (remembered in localStorage hl.flag.picker=1; ?picker=0 clears it). Flag off = app unchanged.
   * Storage: hl.athlete = {tone: 1-4, name}. No key yet = tone 3 (Option A) + "Your athlete", onboarding shown once.
   * Stills: /assets/img/athlete/tone-N/ (see assets/img/athlete/README.md), requested only when the flag is on and
   * cached by the service worker at runtime (not precached). Lesson clips + diagrams stay Option A. */
  var PICKER = (function () {
    try {
      var q = /[?&]picker=([01])(?:&|$)/.exec(location.search);
      if (q) { if (q[1] === "1") localStorage.setItem("hl.flag.picker", "1"); else localStorage.removeItem("hl.flag.picker"); }
      return localStorage.getItem("hl.flag.picker") === "1";
    } catch (e) { return /[?&]picker=1(?:&|$)/.test(location.search); }
  })();
  var ATH_KEY = "hl.athlete", DEF_TONE = 3, NAME_MAX = 14;   // DEF_NAME ("Your athlete") is defined with the profile card above
  var TONE_LABEL = ["", "Light", "Medium", "Deep warm (Handles Lab default)", "Deepest"];
  function cleanName(s) { return String(s == null ? "" : s).replace(/\s+/g, " ").trim(); }
  function readAth() {
    try {
      var a = JSON.parse(localStorage.getItem(ATH_KEY) || "null");
      if (a && typeof a === "object") {
        var n = cleanName(a.name);
        return { tone: [1, 2, 3, 4].indexOf(+a.tone) >= 0 ? +a.tone : DEF_TONE, name: n && n.length <= NAME_MAX && /^[A-Za-z0-9 ]+$/.test(n) ? n : DEF_NAME, set: true };
      }
    } catch (e) {}
    return { tone: DEF_TONE, name: DEF_NAME, set: false };
  }
  var ath = readAth();
  function saveAth(tone, name) { ath = { tone: tone, name: name, set: true }; try { localStorage.setItem(ATH_KEY, JSON.stringify({ tone: tone, name: name })); } catch (e) {} }
  function still(file, tone) { return "/assets/img/athlete/tone-" + (tone || ath.tone) + "/" + file; }
  function poss(n) { return n + "'s"; }
  // Phase 2 hook: per-tone lesson clips at /assets/clips/tone-N/..., falling back to the Option A path. Disabled for now.
  var TONE_CLIPS = false;
  function clipFor(url) {
    if (!PICKER || !TONE_CLIPS || !url || url.indexOf("/assets/clips/") !== 0) return { src: url, fb: "" };
    return { src: url.replace("/assets/clips/", "/assets/clips/tone-" + ath.tone + "/"), fb: url };
  }
  function bindClipFallback(root) {
    root.querySelectorAll("video[data-fb]").forEach(function (v) {
      v.addEventListener("error", function () { if (v.dataset.fb && v.getAttribute("src") !== v.dataset.fb) { v.src = v.dataset.fb; v.removeAttribute("data-fb"); try { v.play(); } catch (e) {} } }, true);
    });
  }

  // Name check. window.HLNAMES (app-preview/names.js, written by tools/build.py) holds SHA-256 hashes only:
  // b = full real-player names + distinctive single names (data/picker-name-hashes.txt; 1-3 word n-grams as in
  // tools/build.py, but common first names that are also player names are allowed), w = whole-word
  // profanity, s = profanity stems matched anywhere (spaces removed). Plain sync SHA-256 so it also works on http.
  function sha256(str) {
    var K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
    var b = unescape(encodeURIComponent(str)), n = b.length, words = [], i;
    for (i = 0; i < n; i++) words[i >> 2] |= b.charCodeAt(i) << (24 - (i % 4) * 8);
    words[n >> 2] |= 0x80 << (24 - (n % 4) * 8);
    var len = ((n + 8) >> 6) * 16 + 15; for (i = words.length; i <= len; i++) words[i] = words[i] | 0;
    words[len] = n * 8;
    var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19], W = [];
    function r(x, k) { return (x >>> k) | (x << (32 - k)); }
    for (var j = 0; j < words.length; j += 16) {
      var a = H[0], bb = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], hh = H[7];
      for (i = 0; i < 64; i++) {
        if (i < 16) W[i] = words[j + i] | 0;
        else W[i] = (W[i - 16] + (r(W[i - 15], 7) ^ r(W[i - 15], 18) ^ (W[i - 15] >>> 3)) + W[i - 7] + (r(W[i - 2], 17) ^ r(W[i - 2], 19) ^ (W[i - 2] >>> 10))) | 0;
        var t1 = (hh + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + W[i]) | 0, t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & bb) ^ (a & c) ^ (bb & c))) | 0;
        hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = bb; bb = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + bb) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0; H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + hh) | 0;
    }
    return H.map(function (x) { return ("00000000" + (x >>> 0).toString(16)).slice(-8); }).join("");
  }
  var NAMESETS = null;
  function nameSets() {
    if (NAMESETS || !window.HLNAMES) return NAMESETS;
    var L = window.HLNAMES, mk = function (a) { var o = {}; (a || []).forEach(function (x) { o[x] = 1; }); return o; };
    return (NAMESETS = { b: mk(L.b), w: mk(L.w), s: mk(L.s) });
  }
  function leet(s) { return s.replace(/[013457]/g, function (c) { return { 0: "o", 1: "i", 3: "e", 4: "a", 5: "s", 7: "t" }[c]; }); }
  function nameError(raw) {
    var n = cleanName(raw);
    if (!n) return "Give your athlete a name: 1 to 14 letters or numbers.";
    if (n.length > NAME_MAX) return "Keep it to 14 characters or fewer.";
    if (!/^[A-Za-z0-9 ]+$/.test(n)) return "Letters, numbers and spaces only.";
    if (n.toLowerCase() === DEF_NAME.toLowerCase()) return "";
    var S = nameSets(); if (!S) return "One sec, the name check is still loading. Try again.";
    var forms = [n.toLowerCase()], lt = leet(n.toLowerCase()); if (lt !== forms[0]) forms.push(lt);
    for (var f = 0; f < forms.length; f++) {
      var t = forms[f].match(/[a-z0-9]+/g) || [], k, i;
      for (k = 1; k <= 3; k++) for (i = 0; i + k <= t.length; i++) if (S.b[sha256(t.slice(i, i + k).join(" "))]) return "That's a real player's name. Make up your own nickname.";
      for (i = 0; i < t.length; i++) if (S.w[sha256(t[i])]) return "Let's keep it clean. Try another name.";
      var joined = t.join("");
      for (i = 0; i < joined.length; i++) for (k = i + 3; k <= joined.length; k++) if (S.s[sha256(joined.slice(i, k))]) return "Let's keep it clean. Try another name.";
    }
    return "";
  }

  function swatchesHTML(sel, idp) {
    return '<div class="tones" role="radiogroup" aria-label="Skin tone">' + [1, 2, 3, 4].map(function (t) {
      return '<button type="button" class="tone" role="radio" id="' + idp + t + '" data-tone="' + t + '" aria-checked="' + (t === sel) + '" tabindex="' + (t === sel ? 0 : -1) + '" aria-label="Skin tone ' + t + ' of 4' + (t === DEF_TONE ? ", Handles Lab default" : "") + '">' +
        '<img src="' + still("swatch.webp", t) + '" alt="" width="360" height="480"><span class="dot t' + t + '" aria-hidden="true"></span></button>';
    }).join("") + "</div>";
  }
  function bindSwatches(root, onPick) {
    var bs = [].slice.call(root.querySelectorAll(".tone"));
    function pick(t, focus) {
      bs.forEach(function (b) { var on = +b.dataset.tone === t; b.setAttribute("aria-checked", on); b.tabIndex = on ? 0 : -1; if (on && focus) b.focus(); });
      onPick(t);
    }
    bs.forEach(function (b) {
      b.addEventListener("click", function () { pick(+b.dataset.tone); });
      b.addEventListener("keydown", function (e) {
        var t = +b.dataset.tone, nx = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (e.key === "Home") nx = 1 - t; if (e.key === "End") nx = 4 - t;
        if (nx === undefined) return; e.preventDefault(); pick(((t - 1 + nx + 4) % 4) + 1, true);
      });
    });
  }
  function nameFieldHTML(idp, val) {
    return '<label class="fld-l" for="' + idp + 'name">Athlete name</label>' +
      '<input class="fld" id="' + idp + 'name" type="text" value="' + esc(val) + '" maxlength="24" autocomplete="off" autocapitalize="words" spellcheck="false" enterkeyhint="done" aria-describedby="' + idp + 'hint ' + idp + 'err">' +
      '<p class="fld-h" id="' + idp + 'hint">1 to 14 letters, numbers or spaces. Use a nickname, not your full real name.</p>' +
      '<p class="fld-e" id="' + idp + 'err" aria-live="polite"></p>';
  }
  function checkField(inp, err) {
    var m = nameError(inp.value); err.textContent = m ? "⚠ " + m : ""; inp.setAttribute("aria-invalid", m ? "true" : "false");
    return m ? "" : (cleanName(inp.value) || DEF_NAME);
  }
  function setInert(on) { var s = $(".shell"); if (!s) return; if (on) { s.setAttribute("aria-hidden", "true"); s.inert = true; } else { s.removeAttribute("aria-hidden"); s.inert = false; } }

  /* onboarding: 2 skippable steps, shown once before Today */
  function onboard() {
    var tone = ath.tone, name = ath.name, o = document.createElement("div");
    o.className = "onb"; o.setAttribute("role", "dialog"); o.setAttribute("aria-modal", "true"); o.setAttribute("aria-labelledby", "onb-h");
    document.body.appendChild(o); document.body.style.overflow = "hidden"; setInert(true);
    function finish(t, n) { saveAth(t, n); paintMe(); o.remove(); document.body.style.overflow = ""; setInert(false); show("today"); }
    function step1() {
      o.innerHTML = '<div class="onb-in"><div class="onb-top"><span class="kick">Step 1 of 2</span><button type="button" class="linkbtn skip">Skip</button></div>' +
        '<h1 class="disp" id="onb-h" tabindex="-1">Pick your athlete</h1><p class="mute small onb-sub">Choose a skin tone. Same faceless look, same orange and black kit.</p>' +
        '<div class="onb-prev"><img id="onb-img" src="' + still("hero.webp", tone) + '" alt="Your athlete, skin tone ' + tone + ' of 4" width="720" height="1280"></div>' +
        swatchesHTML(tone, "onb-t") + '<button type="button" class="big or onb-next">Next: name your athlete →</button></div>';
      bindSwatches(o, function (t) { tone = t; var im = $("#onb-img", o); im.src = still("hero.webp", t); im.alt = "Your athlete, skin tone " + t + " of 4"; });
      $(".skip", o).onclick = function () { finish(DEF_TONE, DEF_NAME); };
      $(".onb-next", o).onclick = step2;
      $("#onb-h", o).focus();
    }
    function step2() {
      o.innerHTML = '<div class="onb-in"><div class="onb-top"><span class="kick">Step 2 of 2</span><button type="button" class="linkbtn skip">Skip</button></div>' +
        '<h1 class="disp" id="onb-h" tabindex="-1">Name your athlete</h1>' +
        '<div class="onb-card"><img src="' + still("avatar.webp", tone) + '" alt="" width="512" height="512"><b class="onb-nm" aria-hidden="true">' + esc(name) + '</b></div>' +
        '<form class="onb-form" novalidate>' + nameFieldHTML("onb-", name) +
        '<div class="onb-acts"><button type="button" class="big ghost onb-back">← Back</button><button type="submit" class="big or">Let\'s go →</button></div></form></div>';
      var inp = $("#onb-name", o), err = $("#onb-err", o), nm = $(".onb-nm", o);
      inp.addEventListener("input", function () { nm.textContent = cleanName(inp.value) || DEF_NAME; if (err.textContent) checkField(inp, err); });
      $(".onb-form", o).onsubmit = function (e) { e.preventDefault(); var n = checkField(inp, err); if (n) finish(tone, n); else inp.focus(); };
      $(".onb-back", o).onclick = step1;
      $(".skip", o).onclick = function () { finish(tone, DEF_NAME); };
      $("#onb-h", o).focus();
    }
    step1();
  }

  /* settings: "Your athlete" sheet (same #sheet pattern as the map's day sheet) */
  function athleteSheet() {
    var tone = ath.tone, back = document.activeElement, bg = $("#sheet");
    bg.innerHTML = '<div class="sheet ath-sheet" role="dialog" aria-modal="true" aria-labelledby="ath-h"><div class="grab"></div><p class="kick">Settings</p>' +
      '<div class="ath-head"><img id="ath-av" src="' + still("avatar.webp", tone) + '" alt="" width="512" height="512"><h2 class="disp" id="ath-h" tabindex="-1">Your athlete</h2></div>' +
      '<form class="ath-form" novalidate><fieldset><legend class="fld-l">Skin tone</legend>' + swatchesHTML(tone, "ath-t") + '</fieldset>' + nameFieldHTML("ath-", ath.name) +
      '<button type="submit" class="big or">Save</button><button type="button" class="big ghost" data-x>Cancel</button></form></div>';
    bg.hidden = false; setInert(true);
    function close() { bg.hidden = true; bg.innerHTML = ""; bg.onclick = null; document.removeEventListener("keydown", esck); setInert(false); if (back && back.focus) back.focus(); }
    function esck(e) { if (e.key === "Escape") close(); }
    document.addEventListener("keydown", esck);
    bindSwatches(bg, function (t) { tone = t; $("#ath-av", bg).src = still("avatar.webp", t); });
    var inp = $("#ath-name", bg), err = $("#ath-err", bg);
    inp.addEventListener("input", function () { if (err.textContent) checkField(inp, err); });
    $(".ath-form", bg).onsubmit = function (e) { e.preventDefault(); var n = checkField(inp, err); if (!n) return inp.focus(); saveAth(tone, n); close(); paintMe(); show(tab); toast("Saved: " + n); };
    bg.onclick = function (e) { if (e.target === bg || e.target.closest("[data-x]")) close(); };
    $("#ath-h", bg).focus();
  }

  /* header: the athlete avatar button (opens the "Your athlete" sheet) takes the brand icon's spot */
  function paintMe() {
    if (!PICKER) return;
    var br = $(".brand"), me = $("#me");   // the athlete's avatar takes the brand icon's spot (header width unchanged)
    if (!me) { me = document.createElement("button"); me.id = "me"; me.className = "me"; me.type = "button"; br.insertBefore(me, br.firstChild); br.classList.add("has-me"); me.onclick = athleteSheet; }
    me.setAttribute("aria-label", "Your athlete: " + ath.name + ". Change skin tone or name");
    me.innerHTML = '<img src="' + still("avatar-96.png") + '" alt="" width="32" height="32">';
  }
  function loadNames() { if (window.HLNAMES || document.getElementById("hlnames")) return; var s = document.createElement("script"); s.id = "hlnames"; s.src = "/app-preview/names.js"; document.head.appendChild(s); }

  /* ---------- tabs ---------- */
  var tab = "today";
  function show(t) {
    tab = t;
    document.querySelectorAll(".tabs button").forEach(function (b) { if (b.dataset.tab === t) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
    ["today", "map", "founding"].forEach(function (x) { $("#tab-" + x).hidden = x !== t; });
    if (t === "today") renderToday(); if (t === "map") renderMap();
    window.scrollTo(0, 0);
    try { history.replaceState(null, "", t === "today" ? "./" : "#" + t); } catch (e) {}
  }
  document.querySelectorAll(".tabs button").forEach(function (b) { b.addEventListener("click", function () { show(b.dataset.tab); }); });

  /* ---------- Today ---------- */
  function gearOf(D) { var g = {}; D.moves.forEach(function (m) { m.gear.split(/[;,]/).forEach(function (x) { x = x.trim(); if (x && !/^(none|none\/ball|no space)$/i.test(x)) g[x] = 1; }); }); return Object.keys(g).join(", ") || "Ball"; }
  // one-line cue of a day's headline move (the challenge data's cues field), "" if it has none
  function cueOf(D) { var m = D.moves.filter(function (x) { return x.id === D.primary; })[0] || D.moves[0]; return m && m.cues ? String(m.cues).trim() : ""; }
  function renderToday() {
    var dt = doneToday(), d = today(), D = day(d), s = streak(), c = count();
    var restDay = dt && dt < 30 && !done[30] ? dt : 0;  // finished a day today: show tomorrow first
    var h = profileCard(), heroArt = PICKER ? still("hero.webp") : "/assets/img/hero.webp";
    if (restDay) {
      var nx = day(restDay + 1);
      h += '<div class="hero"><img class="art" src="' + heroArt + '" alt=""><span class="daytag">Done for today</span>' +
        '<h1 class="disp">Day ' + restDay + ' done.</h1><div class="meta"><span>🔥 ' + s + '-day streak</span><span>' + c + '/30 days</span></div>' +
        '<button class="big" data-open="' + d + '">Keep going: Day ' + d + '</button></div>' +
        '<div class="card tomorrow"><p class="kick">Tomorrow · Day ' + nx.d + ' · ' + esc(nx.tierLabel) + '</p><b>' + esc(nx.primaryName) + '</b>' + (cueOf(nx) ? '<p class="mute small" style="margin:4px 0 0">' + esc(cueOf(nx)) + '</p>' : "") + '</div>';
    } else {
      h += '<div class="hero"><img class="art" src="' + heroArt + '" alt=""><span class="daytag">Today · Day ' + d + ' of 30</span>' +
        '<h1 class="disp">' + esc(D.title) + '</h1>' + (D.sub ? '<p class="kick">' + esc(D.sub) + '</p>' : '') +
        '<div class="meta"><span>' + esc(D.tierLabel) + '</span><span>' + D.moves.length + ' move' + (D.moves.length > 1 ? "s" : "") + '</span><span>10-15 min</span></div>' +
        '<button class="big" data-open="' + d + '">' + (locked(d) ? "Preview Day " + d : "Start Day " + d) + ' →</button></div>';
    }
    h += '<div class="card streakcard"><span class="fl">' + (s ? "🔥" : "🏀") + '</span><div><b>' + s + '</b> <span class="mute">day streak</span>' +
      '<p>' + (dt ? "You practiced today. Nice." : s ? "Practice today to keep it alive." : "Finish a day to start your streak.") + '</p></div></div>' +
      (s ? '<div class="sharerow">' + '<button class="big share" data-share>Share your streak</button><p class="u13">Under 13? Parents, share their streak.</p>' + '</div>' : "");
    h += '<div class="card"><div class="row"><b>Your 30 days</b><span class="mute small">' + c + '/30 done</span></div><div class="prog"><i style="width:' + (c / 30 * 100) + '%"></i></div></div>';
    if (!restDay) {
      h += '<div class="card"><b>Today\'s moves</b><ul class="movelist">' + D.moves.map(function (m) { return "<li><span>" + esc(m.name) + "</span><span>" + esc(m.tierLabel) + "</span></li>"; }).join("") +
        '</ul><p class="mute small" style="margin:10px 0 0">Gear: ' + esc(gearOf(D)) + '</p></div>';
      if (d < 30) { var n2 = day(d + 1); h += '<div class="card tomorrow"><p class="kick">Tomorrow · Day ' + n2.d + '</p><b>' + esc(n2.primaryName) + '</b></div>'; }
    }
    $("#tab-today").innerHTML = h;
    $("#tab-today").querySelectorAll("[data-share]").forEach(function (b) { b.addEventListener("click", openShare); });
    $("#tab-today").querySelectorAll("[data-streak]").forEach(function (b) { b.addEventListener("click", streakScreen); });
    $("#tab-today").querySelectorAll("[data-open]").forEach(function (b) { b.addEventListener("click", function () { openDay(+b.dataset.open, locked(+b.dataset.open)); }); });
    paintTop();
  }

  /* ---------- Map ---------- */
  function renderMap() {
    var td = today(), c = count();
    var h = '<p class="kick" style="margin-top:6px">30-day map</p><div class="stats"><div class="stat"><b>' + c + '</b><span>days done</span></div><div class="stat"><b>' + streak() + '</b><span>day streak</span></div><div class="stat"><b>' + TIERS.filter(tierDone).length + '/4</b><span>badges</span></div></div>';
    h += '<div class="grid">' + DAYS.map(function (D) {
      var cl = "cell" + (done[D.d] ? " done" : locked(D.d) ? " locked" : "") + (D.d === td && !done[D.d] ? " today" : "");
      return '<button class="' + cl + '" data-t="' + (TIERS.indexOf(D.tier) + 1) + '" data-d="' + D.d + '" aria-label="Day ' + D.d + ': ' + esc(D.title) + (done[D.d] ? ", done" : locked(D.d) ? ", locked" : "") + '">' + D.d + "<small>" + (D.d === td && !done[D.d] ? "Today" : "L" + D.tierN) + "</small></button>";
    }).join("") + "</div>";
    h += '<div class="legend">' + ["#18181b", "#1d1712", "#2a180a", "#3a1c04"].map(function (c, i) { return '<span><i style="background:' + c + '"></i>L' + (i + 1) + " · " + TIERS[i] + "</span>"; }).join("") + "<span>✓ done · 🔒 locked</span></div>";
    h += '<div class="card"><b>Badges</b><p class="mute small" style="margin:2px 0 10px">Finish every day of a level to earn its badge and unlock the next level.</p><div class="badges">' +
      TIERS.map(function (t) { return '<span class="badge' + (tierDone(t) ? " on" : "") + '">' + (tierDone(t) ? "🏅 " : "○ ") + "Level " + (TIERS.indexOf(t) + 1) + " of 4 · " + t + "</span>"; }).join("") + "</div></div>";
    $("#tab-map").innerHTML = h;
    $("#tab-map").querySelectorAll(".cell").forEach(function (b) { b.addEventListener("click", function () { daySheet(+b.dataset.d); }); });
    paintTop();
  }
  function daySheet(d) {
    var D = day(d), lk = !done[d] && locked(d), miss = missingFor(d);
    var h = '<div class="sheet" role="dialog" aria-modal="true" aria-label="Day ' + d + '"><div class="grab"></div><p class="kick">Day ' + d + " · " + esc(D.tierLabel) + '</p><h2 class="disp">' + esc(D.title) + "</h2>" +
      '<ul class="movelist">' + D.moves.map(function (m) { return "<li><span>" + esc(m.name) + "</span><span>" + esc(m.tierLabel) + "</span></li>"; }).join("") + "</ul>";
    if (done[d]) h += '<p class="mute small">✓ Done' + (done[d] ? " on " + esc(done[d]) : "") + '</p><button class="big or" data-go="open">Practice again</button>';
    else if (lk) h += '<div class="preview-note">🔒 <b>' + esc(D.tierLabel) + " is locked.</b> Finish " + miss.map(function (x) { return "Day " + x; }).join(", ") + ' first.</div><button class="big or" data-go="today">Go to today: Day ' + today() + '</button><button class="big ghost" data-go="preview">Preview anyway</button>';
    else h += '<button class="big or" data-go="open">Start Day ' + d + "</button>";
    h += "</div>";
    var bg = $("#sheet"); bg.innerHTML = h; bg.hidden = false;
    bg.onclick = function (e) {
      var g = e.target.closest("[data-go]");
      if (e.target === bg) { bg.hidden = true; return; }
      if (!g) return; bg.hidden = true;
      if (g.dataset.go === "open") openDay(d, false); else if (g.dataset.go === "preview") openDay(d, true); else openDay(today(), locked(today()));
    };
  }

  /* ---------- Player ---------- */
  var P = null;
  function openDay(d, preview) {
    var D = day(d), slides = [];
    D.moves.forEach(function (m, mi) {
      m.steps.forEach(function (s, si) { slides.push({ k: "step", m: m, mi: mi, si: si }); });
      slides.push({ k: "check", m: m, mi: mi });
    });
    slides.push({ k: "finish" });
    P = { d: d, D: D, preview: !!preview && !done[d] && locked(d), slides: slides, i: 0, reps: {}, timer: {} };
    var el = $("#player");
    el.innerHTML = '<div class="pbar"><button class="x" aria-label="Close">✕</button><div class="segs">' + slides.map(function () { return "<i></i>"; }).join("") + '</div></div>' +
      '<div class="pctx"><span>Day ' + d + " · " + esc(D.tierLabel) + '</span><span class="pos"></span></div><div class="stage"></div>' +
      '<div class="pnav"><button class="big back" aria-label="Back">←</button><button class="big or next">Next →</button></div>';
    el.hidden = false; document.body.style.overflow = "hidden";
    $(".x", el).onclick = closePlayer;
    $(".back", el).onclick = function () { go(P.i - 1); };
    $(".next", el).onclick = function () { nextAction(); };
    var st = $(".stage", el), x0 = null, y0 = 0;
    st.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    st.addEventListener("touchend", function (e) {
      if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) { if (dx < 0) nextAction(true); else go(P.i - 1); }
    });
    document.addEventListener("keydown", keys);
    render(0);
  }
  function keys(e) { if (!P) return; if (e.key === "ArrowRight") nextAction(true); if (e.key === "ArrowLeft") go(P.i - 1); if (e.key === "Escape") closePlayer(); }
  function stopTimers() { if (P) for (var k in P.timer) { clearInterval(P.timer[k].run); P.timer[k].run = null; } }
  function closePlayer() { stopTimers(); $("#player").hidden = true; $("#player").innerHTML = ""; document.body.style.overflow = ""; document.removeEventListener("keydown", keys); P = null; show(tab); }
  function ckey(m) { return P.d + "-" + m.id; }
  function allChecked() { return P.D.moves.every(function (m) { return chk[P.d + "-" + m.id]; }); }
  function nextAction(swipe) {
    var s = P.slides[P.i];
    if (s.k === "finish") { if (!swipe) markDone(); return; }
    go(P.i + 1);
  }
  function go(i) { if (!P || i < 0 || i >= P.slides.length) return; stopTimers(); render(i, i > P.i ? "r" : "l"); }
  // animated step diagrams (inline SVG + SMIL): hold still for prefers-reduced-motion
  function stillDiagrams(root) {
    if (!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches)) return;
    root.querySelectorAll("svg.dg").forEach(function (sv) { try { sv.pauseAnimations(); sv.setCurrentTime(0); } catch (e) {} });
  }
  function media(m, s, si) {
    var img = '<img src="/assets/paths/' + m.path + '.svg" alt="Ball path: ' + esc(m.pathLabel) + '" width="160" height="200">';
    var cl = clipFor(s.clip);
    var body = s.dg ? s.dg : s.clip ? '<video muted loop playsinline autoplay preload="auto" src="' + cl.src + '"' + (cl.fb ? ' data-fb="' + cl.fb + '"' : "") + (s.poster ? ' poster="' + s.poster + '"' : "") + ' aria-label="Step ' + (si + 1) + ' loop"></video>' : img;
    return '<figure class="media' + (s.dg ? " dgm" : "") + '">' + body + '<span class="stepno">' + (si + 1) + "</span></figure>";
  }
  function render(i, dir) {
    var el = $("#player"), st = $(".stage", el), s = P.slides[i], h = "";
    if (s.k === "step") {
      var m = s.m, step = m.steps[s.si];
      h = media(m, step, s.si) + '<p class="stepname">' + esc(m.name) + " · Step " + (s.si + 1) + " of 4</p>" +
        '<p class="steptext">' + esc(step.t) + "</p>" +
        '<div class="cue"><span>Cues</span><span>' + esc(m.cues) + "</span></div>" +
        '<p class="note">🐢 → 🐇 <span>Slow first. Speed up only once it\'s clean.</span></p>' +
        (s.si === 0 ? '<details class="kid"><summary>Kid version</summary><p>' + esc(m.kid) + "</p></details>" : "") + counterHTML(i, step.t);
    } else if (s.k === "check") {
      var on = !!chk[ckey(s.m)];
      h = '<div class="check"><p class="kick">' + esc(s.m.name) + ' · self-check</p><h2 class="disp">Did you hit 20 clean reps?</h2>' +
        '<p class="mute" style="margin:0">At the highest step you reached today. Clean = in control, eyes up.</p>' +
        '<button class="yes' + (on ? " on" : "") + '" aria-pressed="' + on + '"><span class="box">' + (on ? "✓" : "") + "</span>Yes, 20 clean reps</button>" +
        '<button class="linkbtn" data-redo>Not yet: back to Step 1</button></div>';
    } else {
      var ok = allChecked();
      h = '<div class="check" style="padding-top:2vh"><p class="kick">Day ' + P.d + " · finish</p><h2 class=\"disp\">" + (done[P.d] ? "Day done ✓" : ok ? "Lock it in." : "Almost there.") + "</h2>" +
        '<ul class="summary">' + P.D.moves.map(function (m) { var c = chk[P.d + "-" + m.id]; return "<li>" + esc(m.name) + '<span class="st ' + (c ? "ok\">✓ 20 clean" : "no\">not checked") + "</span></li>"; }).join("") + "</ul>" +
        (P.preview ? '<div class="preview-note">👀 Preview mode. Finish ' + missingFor(P.d).map(function (x) { return "Day " + x; }).join(", ") + " to unlock this day for real.</div>" : "") + "</div>";
    }
    var n = document.createElement("div"); n.className = "slide" + (dir ? " in-" + dir : ""); n.innerHTML = h;
    var old = st.querySelector(".slide");
    st.appendChild(n);
    if (old) { old.classList.add(dir === "l" ? "in-r" : "in-l"); setTimeout(function () { old.remove(); }, 330); }
    requestAnimationFrame(function () { requestAnimationFrame(function () { n.classList.remove("in-r", "in-l"); }); });
    P.i = i;
    var yes = n.querySelector(".yes");
    if (yes) yes.onclick = function () { var kk = ckey(s.m); if (chk[kk]) delete chk[kk]; else chk[kk] = 1; save("hl-chk", chk); render(P.i); };
    var redo = n.querySelector("[data-redo]"); if (redo) redo.onclick = function () { go(P.i - 4); };
    if (s.k === "step") { bindCounter(n, i, s); if (s.m.steps[s.si].dg) n.classList.add("hasdg"); }
    stillDiagrams(n); bindClipFallback(n);
    var v = n.querySelector("video"); if (v && v.play) { var pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); }
    // chrome
    el.querySelectorAll(".segs i").forEach(function (b, j) { b.className = j < i ? "on" : j === i ? "cur" : ""; });
    $(".pos", el).textContent = s.k === "step" ? "Move " + (s.mi + 1) + "/" + P.D.moves.length : s.k === "check" ? "Self-check" : "Finish";
    var nx = $(".next", el), bk = $(".back", el);
    bk.disabled = i === 0;
    if (s.k === "finish") {
      nx.textContent = done[P.d] ? "✓ Day done" : "Day done 🔥";
      nx.disabled = !!done[P.d] || P.preview || !allChecked();
    } else { nx.disabled = false; nx.textContent = s.k === "check" ? (chk[ckey(s.m)] ? "Next →" : "Skip for now →") : "Next →"; }
  }
  /* ---------- rep counter + timer ---------- */
  var GOAL = 20, CIRC = 2 * Math.PI * 52;
  function timedSecs(t) { var m = /(\d+)\s?s\b/.exec(t); if (!m) return 0; return +m[1] > 30 ? 60 : 30; }
  function buzz(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} }
  function counterHTML(i, text) {
    var tm = P.timer[i] || (P.timer[i] = { on: !!timedSecs(text), secs: timedSecs(text) || 30, left: 0, run: null });
    return '<div class="counter" data-i="' + i + '">' +
      '<button class="pad" aria-label="Tap to count a rep"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52" class="trk"/><circle cx="60" cy="60" r="52" class="fill" stroke-dasharray="' + CIRC + '" stroke-dashoffset="' + CIRC + '"/></svg>' +
      '<span class="num">0</span><span class="of">/ 20</span></button>' +
      '<div class="ctl"><p class="hint">Tap anywhere here for each clean rep</p>' +
      '<div class="btns"><button class="minus" aria-label="Minus one">−1</button><button class="reset">Reset</button>' +
      '<button class="tmr' + (tm.on ? " on" : "") + '" aria-pressed="' + tm.on + '">⏱ Timer</button>' +
      '<button class="secs"' + (tm.on ? "" : " hidden") + '>' + tm.secs + 's</button></div></div></div>';
  }
  function bindCounter(n, i, s) {
    var box = n.querySelector(".counter"), pad = box.querySelector(".pad"), num = box.querySelector(".num"), of = box.querySelector(".of"),
      fill = box.querySelector(".fill"), hint = box.querySelector(".hint"), tm = P.timer[i], last = s.si === 3;
    function paint() {
      if (tm.on) {
        var left = tm.run || tm.left ? tm.left : tm.secs;
        num.textContent = left; of.textContent = "sec"; fill.style.strokeDashoffset = CIRC * (1 - left / tm.secs); box.querySelector(".minus").hidden = true;
        hint.textContent = tm.run ? "Tap to pause" : left === 0 ? "Time! Tap to go again" : "Tap to start the " + tm.secs + "s timer";
        box.classList.toggle("goal", left === 0 && !tm.run);
      } else {
        var c = P.reps[i] || 0;
        num.textContent = c; of.textContent = "/ 20"; fill.style.strokeDashoffset = CIRC * (1 - Math.min(c, GOAL) / GOAL);
        box.classList.toggle("goal", c >= GOAL); box.querySelector(".minus").hidden = false;
        hint.textContent = c >= GOAL ? (last ? "20 clean reps! Self-check ticked ✓" : "20! Swipe for the next step") : c ? (GOAL - c) + " to go" : "Tap anywhere here for each clean rep";
      }
    }
    function tick() {
      tm.left -= 1; if (tm.left <= 0) { tm.left = 0; clearInterval(tm.run); tm.run = null; buzz([120, 80, 120]); if (last) autoTick(s); }
      if (document.body.contains(box)) paint();
    }
    pad.addEventListener("click", function () {
      if (tm.on) {
        if (tm.run) { clearInterval(tm.run); tm.run = null; }
        else { if (!tm.left) tm.left = tm.secs; tm.run = setInterval(tick, 1000); buzz(15); }
      } else {
        var c = (P.reps[i] || 0) + 1; P.reps[i] = c; buzz(c === GOAL ? [60, 40, 160] : 12);
        if (c === GOAL && last) autoTick(s);
        num.classList.remove("bump"); void num.offsetWidth; num.classList.add("bump");
      }
      paint();
    });
    box.querySelector(".minus").onclick = function () { if (!tm.on) { P.reps[i] = Math.max(0, (P.reps[i] || 0) - 1); paint(); } };
    box.querySelector(".reset").onclick = function () { if (tm.on) { clearInterval(tm.run); tm.run = null; tm.left = 0; } else P.reps[i] = 0; paint(); };
    box.querySelector(".tmr").onclick = function () {
      clearInterval(tm.run); tm.run = null; tm.left = 0; tm.on = !tm.on;
      this.classList.toggle("on", tm.on); this.setAttribute("aria-pressed", tm.on); box.querySelector(".secs").hidden = !tm.on; paint();
    };
    box.querySelector(".secs").onclick = function () { clearInterval(tm.run); tm.run = null; tm.left = 0; tm.secs = tm.secs === 30 ? 60 : 30; this.textContent = tm.secs + "s"; paint(); };
    box.addEventListener("click", function (e) { if (!e.target.closest("button")) pad.click(); });   // whole panel is the tap target
    var med = n.querySelector(".media"); if (med) med.addEventListener("click", function () { pad.click(); });
    paint();
  }
  function autoTick(s) {
    var kk = ckey(s.m); if (chk[kk]) return; chk[kk] = 1; save("hl-chk", chk);
    var t = document.createElement("div"); t.className = "toast"; t.textContent = "✓ 20 clean reps: " + s.m.name + " checked";
    document.getElementById("player").appendChild(t); setTimeout(function () { t.remove(); }, 2600);
  }

  function markDone() {
    if (!P || done[P.d] || P.preview || !allChecked()) return;
    var d = P.d; done[d] = ymd(); save("hl-done", done);
    var earned = null;
    TIERS.forEach(function (t) { if (!earned && tierDone(t) && !badges[t]) { badges[t] = 1; earned = t; } }); save("hl-badges", badges);
    $("#player").hidden = true; $("#player").innerHTML = ""; document.removeEventListener("keydown", keys); P = null;
    celebrate(d, earned);
  }
  function celebrate(d, earned) {
    var c = $("#celebrate"), s = streak(), nx = d < 30 ? day(d + 1) : null, ni = earned ? TIERS[TIERS.indexOf(earned) + 1] : null;
    c.innerHTML = (PICKER ? '<div class="ath-cel"><img src="' + athImg("celebrate") + '" alt="" width="720" height="720"><span class="fb" aria-hidden="true">🔥</span></div>' : '<div class="bigflame" aria-hidden="true">🔥</div>') +
      '<div class="count">' + s + '</div><p style="margin:0">day streak</p>' +
      '<h2 class="disp">Day ' + d + (PICKER ? " done, " + esc(athName()) + "!" : " done!") + "</h2><p>" + count() + "/30 days complete.</p>" +
      (earned ? '<div class="earned">🏅 ' + earned + " badge earned" + (ni ? " · " + ni + " unlocked" : "") + "</div>" : "") +
      (nx ? '<div class="tm"><small>Tomorrow · Day ' + nx.d + " · " + esc(nx.tierLabel) + "</small><br><b>" + esc(nx.primaryName) + "</b></div>" : '<div class="tm"><b>You finished all 30 days.</b> Film the gauntlet and compare it with Day 1.</div>') +
      '<div class="acts">' + '<button class="big share" data-share>Share your streak</button><p class="u13">Under 13? Parents, share their streak.</p>' + '<button class="big ghost" data-c="today">Back to Today</button>' + (d === 30 || earned === "Elite" ? '<button class="big ghost" data-c="founding">See the founding offer</button>' : '<button class="big ghost" data-c="map">Open the map</button>') + "</div>";
    c.hidden = false; document.body.style.overflow = "hidden";
    if (!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches)) {
      var cols = ["#0e0e10", "#ffffff", "#FF9A3D", "#7be29a", "#ffd23f"];
      for (var i = 0; i < 70; i++) {
        var p = document.createElement("i"); p.className = "confetti";
        p.style.left = Math.random() * 100 + "%"; p.style.background = cols[i % cols.length];
        p.style.animationDuration = 1.8 + Math.random() * 1.8 + "s"; p.style.animationDelay = Math.random() * .6 + "s";
        p.style.transform = "rotate(" + Math.random() * 360 + "deg)"; if (i % 3 === 0) p.style.borderRadius = "50%";
        c.appendChild(p);
      }
    }
    c.onclick = function (e) { if (e.target.closest("[data-share]")) return openShare(); var b = e.target.closest("[data-c]"); if (!b) return; c.hidden = true; c.innerHTML = ""; document.body.style.overflow = ""; show(b.dataset.c); };
    paintTop();
  }

  /* ---------- streak share card (no name, no photo: just the streak; with the picker flag: the athlete's name + tone still) ---------- */
  var SHARE_ORIGIN = "http://handleslab.com";   // switch to https://handleslab.com once the Pages certificate is issued
  var SHARE_URL = SHARE_ORIGIN + "/?ref=streak";
  function lastDone() { for (var d = 30; d >= 1; d--) if (done[d]) return d; return 0; }
  function loadImg(src) { return new Promise(function (ok) { var i = new Image(); i.onload = function () { ok(i); }; i.onerror = function () { ok(null); }; i.src = src; }); }
  function drawCard() {
    // 9:16 Story card. Story UI safe zones: no text in the top 250px or bottom 340px (text only in y 250-1580).
    var W = 1080, H = 1920, TOP = 250, BOT = H - 340, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    var x = cv.getContext("2d"), s = streak(), c = count(), ld = lastDone(), D = ld ? day(ld) : null;
    var fonts = document.fonts ? Promise.all([document.fonts.load('120px "Lucky"'), document.fonts.load('40px "Anton"')]).catch(function () {}) : Promise.resolve();
    return Promise.all([fonts, loadImg(PICKER ? still("share.png") : "/assets/img/athlete.jpg"), loadImg("/assets/img/icon-180.png")]).then(function (r) {
      var img = r[1], logo = r[2], AY = 330, AH = W * .74, base = "#F7841A";
      x.fillStyle = base; x.fillRect(0, 0, W, H);
      if (PICKER) {   // transparent tone still (1080x1350) on the orange comic background
        var gl = x.createRadialGradient(W * .7, 420, 40, W * .7, 420, 900); gl.addColorStop(0, "#FF9A3D"); gl.addColorStop(1, "rgba(247,132,26,0)");
        x.fillStyle = gl; x.fillRect(0, 0, W, 1100); halftone(x, 0, 0, W, 1100, "rgba(120,40,0,.08)", 14);
        if (img) { var sw = 900, sh = sw * img.height / img.width; x.drawImage(img, (W - sw) / 2, 372, sw, sh); }
      } else if (img) {
        x.drawImage(img, 0, 0, img.width, img.height * .74, 0, AY, W, AH);   // art 330-1129
        // extend the art upward: stretch its top rows over the band (each column keeps its own colour),
        // then feather that band 140px into the art so there is no line
        var bd = document.createElement("canvas"), FE = 140; bd.width = W; bd.height = AY + FE; var bx = bd.getContext("2d");
        var sm = document.createElement("canvas"); sm.width = 24; sm.height = 1;   // average the top rows into 24 soft columns (no streaks)
        sm.getContext("2d").drawImage(img, 0, 0, img.width, 10, 0, 0, 24, 1);
        bx.imageSmoothingEnabled = true; bx.imageSmoothingQuality = "high"; bx.drawImage(sm, 0, 0, 24, 1, 0, 0, W, AY + FE);
        halftone(bx, 0, 0, W, AY + FE, "rgba(120,40,0,.08)", 14);   // comic dot texture, fades out with the band
        var m = bx.createLinearGradient(0, 0, 0, AY + FE); m.addColorStop(0, "rgba(0,0,0,1)"); m.addColorStop(AY / (AY + FE), "rgba(0,0,0,1)"); m.addColorStop(1, "rgba(0,0,0,0)");
        bx.globalCompositeOperation = "destination-in"; bx.fillStyle = m; bx.fillRect(0, 0, W, AY + FE);   // one rect: destination-in clears outside it
        x.drawImage(bd, 0, 0);
      }
      var g = x.createLinearGradient(0, 860, 0, 1090); g.addColorStop(0, "rgba(14,14,16,0)"); g.addColorStop(1, "rgba(14,14,16,1)");
      x.fillStyle = g; x.fillRect(0, 860, W, 232); x.fillStyle = "#0e0e10"; x.fillRect(0, 1090, W, H - 1090);
      halftone(x, 0, 1600, W, H - 1600, "rgba(247,121,20,.10)", 16);   // background texture in the bottom zone (no text)
      // logo lockup: round app icon + wordmark, as in the header
      x.font = '400 48px "Lucky", Impact, sans-serif'; var wm = "HANDLES LAB", ww = x.measureText(wm).width, lw = 84 + 18 + ww + 44, lx = (W - lw) / 2, ly = TOP + 12;
      x.fillStyle = "#0e0e10"; rr(x, lx, ly, lw, 104, 52); x.fill();
      if (logo) { x.save(); x.beginPath(); x.arc(lx + 10 + 42, ly + 52, 42, 0, Math.PI * 2); x.clip(); x.drawImage(logo, lx + 10, ly + 10, 84, 84); x.restore(); }
      x.fillStyle = "#fff"; x.textAlign = "left"; x.textBaseline = "middle"; x.fillText(wm, lx + 10 + 84 + 18, ly + 56);
      // streak block
      x.textAlign = "center"; x.textBaseline = "alphabetic";
      x.font = '400 250px "Lucky", Impact, sans-serif'; x.lineWidth = 22; x.strokeStyle = "#0e0e10"; x.strokeText(String(s), W / 2, 1085);
      x.fillStyle = "#fff"; x.fillText(String(s), W / 2, 1085);
      if (PICKER) { fit(x, (athName() + " · " + s + "-day streak 🔥").toUpperCase(), W - 120, 84, '"Lucky", Impact, sans-serif'); x.fillStyle = "#F77914"; x.fillText(x.__t, W / 2, 1180); }
      else { x.font = '400 84px "Lucky", Impact, sans-serif'; x.fillStyle = "#F77914"; x.fillText("DAY STREAK 🔥", W / 2, 1180); }
      if (D) {
        fit(x, "Day " + ld + " · " + moveTitle(D.primaryName), W - 140, 60, '"Anton", Impact, sans-serif'); x.fillStyle = "#fff"; x.fillText(x.__t, W / 2, 1262);
        x.font = '400 36px "Anton", Impact, sans-serif'; x.fillStyle = "#b6b0a8"; x.fillText(D.tierLabel.toUpperCase() + " · " + c + "/30 DAYS DONE", W / 2, 1316);
      } else { x.font = '400 44px "Anton", Impact, sans-serif'; x.fillStyle = "#fff"; x.fillText("30-DAY DRIBBLING CHALLENGE", W / 2, 1290); }
      var cw = 26, gap = 6, x0 = (W - (30 * cw + 29 * gap)) / 2;
      for (var i = 1; i <= 30; i++) { x.fillStyle = done[i] ? "#F77914" : "#2c2c33"; rr(x, x0 + (i - 1) * (cw + gap), 1350, cw, 48, 8); x.fill(); }
      if (!D) { x.font = '400 36px "Anton", Impact, sans-serif'; x.fillStyle = "#b6b0a8"; x.fillText(c + "/30 DAYS DONE", W / 2, 1316); }
      x.font = '400 46px "Lucky", Impact, sans-serif'; x.fillStyle = "#fff"; x.fillText("START YOUR STREAK, IT'S FREE", W / 2, 1468);
      x.fillStyle = "#F77914"; rr(x, 90, 1504, W - 180, 76, 38); x.fill();   // pill bottom = 1580 safe line
      x.fillStyle = "#0e0e10"; x.font = '400 44px "Anton", Impact, sans-serif'; x.textBaseline = "middle"; x.fillText("handleslab.com · @thehandleslab", W / 2, 1544);
      return cv;
    });
  }
  function halftone(x, a, b, w, h, col, step) { x.save(); x.fillStyle = col; for (var yy = b; yy < b + h; yy += step) for (var xx = a + ((yy / step) % 2 ? step / 2 : 0); xx < a + w; xx += step) { x.beginPath(); x.arc(xx, yy, step * .22, 0, 6.283); x.fill(); } x.restore(); }
  function moveTitle(n) { return n.replace(/\s*\(.*?\)\s*/g, " ").trim().replace(/(^|[\s-])([a-z])/g, function (m, p, ch) { return p + ch.toUpperCase(); }).replace(/\b(And|The|Of|Into|To|A|In)\b(?!$)/g, function (w, _, i) { return i ? w.toLowerCase() : w; }); }
  function fit(x, t, max, px, fam) { do { x.font = "400 " + px + "px " + fam; px -= 2; } while (x.measureText(t).width > max && px > 30); x.__t = t; }
  function rr(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }
  function openShare() {
    var o = document.getElementById("sharesheet");
    if (!o) { o = document.createElement("div"); o.id = "sharesheet"; o.className = "sharesheet"; o.setAttribute("role", "dialog"); o.setAttribute("aria-label", "Share your streak"); document.body.appendChild(o); }
    o.innerHTML = '<div class="ssheet"><button class="x" aria-label="Close">✕</button><p class="kick">Your streak card</p><div class="cardimg"><span class="mute small">Drawing your card…</span></div>' +
      '<button class="big share" data-go>Share your streak</button><button class="big ghost" data-save>Save image</button>' +
      '<p class="u13">Under 13? Parents, share their streak.</p><p class="mute small">' + (PICKER ? "Shows your athlete's name, never a photo." : "No name, no photo: just the streak.") + ' Link: handleslab.com/?ref=streak</p></div>';
    o.hidden = false;
    var blobP = drawCard().then(function (cv) {
      var im = new Image(); im.alt = "Streak card: " + (PICKER ? athName() + " · " : "") + streak() + "-day streak, handleslab.com · @thehandleslab"; im.src = cv.toDataURL("image/png");
      o.querySelector(".cardimg").innerHTML = ""; o.querySelector(".cardimg").appendChild(im);
      return new Promise(function (ok) { cv.toBlob(ok, "image/png"); });
    });
    var text = "I'm on a " + streak() + "-day streak in the free 30-day dribbling challenge. Join me: " + SHARE_URL;
    function close() { o.hidden = true; o.innerHTML = ""; }
    function save(blob) {
      var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "handles-lab-streak.png"; document.body.appendChild(a); a.click(); a.remove();
      try { navigator.clipboard && navigator.clipboard.writeText(SHARE_URL); } catch (e) {}
      toast("Card saved. Link copied: handleslab.com/?ref=streak");
    }
    o.onclick = function (e) {
      if (e.target === o || e.target.closest(".x")) return close();
      if (e.target.closest("[data-save]")) return blobP.then(save);
      if (e.target.closest("[data-go]")) blobP.then(function (blob) {
        var f = blob && window.File ? new File([blob], "handles-lab-streak.png", { type: "image/png" }) : null;
        if (f && navigator.canShare && navigator.canShare({ files: [f] })) return navigator.share({ files: [f], text: text, title: "My Handles Lab streak" }).catch(function () {});
        if (navigator.share) return navigator.share({ title: "My Handles Lab streak", text: text, url: SHARE_URL }).catch(function () {});
        save(blob);
      });
    };
  }
  function toast(msg) { var t = document.createElement("div"); t.className = "toast"; t.textContent = msg; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2800); }
  window.HLAPP_SHARE = drawCard;

  /* ---------- boot ---------- */
  var h0 = (location.hash || "").slice(1);
  if (PICKER) { document.body.classList.add("picker"); loadNames(); paintMe(); }
  show(["map", "founding"].indexOf(h0) >= 0 ? h0 : "today");
  if (PICKER && !ath.set) onboard();
  if ("serviceWorker" in navigator && window.isSecureContext) addEventListener("load", function () { navigator.serviceWorker.register("/app-preview/sw.js", { scope: "/app-preview/" }).catch(function () {}); });
  window.HLAPP_DEBUG = { openDay: openDay, celebrate: celebrate, show: show, streakScreen: streakScreen };
  if (PICKER) { window.HLAPP_DEBUG.athleteSheet = athleteSheet; window.HLAPP_DEBUG.nameError = nameError; window.HLAPP_DEBUG.sha256 = sha256; }
})();
