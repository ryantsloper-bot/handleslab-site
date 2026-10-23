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
    f.querySelector("b").textContent = s; f.classList.toggle("off", !s); f.setAttribute("aria-label", "Streak: " + s + " days");
    var ct = currentTier(); $("#lvlchip").textContent = "Level " + (TIERS.indexOf(ct) + 1) + " of 4 · " + ct;
  }

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
  function renderToday() {
    var dt = doneToday(), d = today(), D = day(d), s = streak(), c = count();
    var restDay = dt && dt < 30 && !done[30] ? dt : 0;  // finished a day today: show tomorrow first
    var h = "";
    if (restDay) {
      var nx = day(restDay + 1);
      h += '<div class="hero"><img class="art" src="/assets/img/hero.webp" alt=""><span class="daytag">Done for today</span>' +
        '<h1 class="disp">Day ' + restDay + ' done.</h1><div class="meta"><span>🔥 ' + s + '-day streak</span><span>' + c + '/30 days</span></div>' +
        '<button class="big" data-open="' + d + '">Keep going: Day ' + d + '</button></div>' +
        '<div class="card tomorrow"><p class="kick">Tomorrow · Day ' + nx.d + ' · ' + esc(nx.tierLabel) + '</p><b>' + esc(nx.primaryName) + '</b><p class="mute small" style="margin:4px 0 0">' + esc(nx.title) + '</p></div>';
    } else {
      h += '<div class="hero"><img class="art" src="/assets/img/hero.webp" alt=""><span class="daytag">Today · Day ' + d + ' of 30</span>' +
        '<h1 class="disp">' + esc(D.title) + '</h1>' +
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
    var body = s.dg ? s.dg : s.clip ? '<video muted loop playsinline autoplay preload="auto" src="' + s.clip + '"' + (s.poster ? ' poster="' + s.poster + '"' : "") + ' aria-label="Step ' + (si + 1) + ' loop"></video>' : img;
    return '<figure class="media">' + body + '<span class="stepno">' + (si + 1) + "</span></figure>";
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
    if (s.k === "step") bindCounter(n, i, s);
    stillDiagrams(n);
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
    c.innerHTML = '<div class="bigflame" aria-hidden="true">🔥</div><div class="count">' + s + '</div><p style="margin:0">day streak</p>' +
      '<h2 class="disp">Day ' + d + " done!</h2><p>" + count() + "/30 days complete.</p>" +
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

  /* ---------- streak share card (no name, no photo: just the streak) ---------- */
  var SHARE_ORIGIN = "http://handleslab.com";   // switch to https://handleslab.com once the Pages certificate is issued
  var SHARE_URL = SHARE_ORIGIN + "/?ref=streak";
  function lastDone() { for (var d = 30; d >= 1; d--) if (done[d]) return d; return 0; }
  function loadImg(src) { return new Promise(function (ok) { var i = new Image(); i.onload = function () { ok(i); }; i.onerror = function () { ok(null); }; i.src = src; }); }
  function drawCard() {
    // 9:16 Story card. Story UI safe zones: no text in the top 250px or bottom 340px (text only in y 250-1580).
    var W = 1080, H = 1920, TOP = 250, BOT = H - 340, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    var x = cv.getContext("2d"), s = streak(), c = count(), ld = lastDone(), D = ld ? day(ld) : null;
    var fonts = document.fonts ? Promise.all([document.fonts.load('120px "Lucky"'), document.fonts.load('40px "Anton"')]).catch(function () {}) : Promise.resolve();
    return Promise.all([fonts, loadImg("/assets/img/athlete.jpg"), loadImg("/assets/img/icon-180.png")]).then(function (r) {
      var img = r[1], logo = r[2], AY = 330, AH = W * .74, base = "#F7841A";
      x.fillStyle = base; x.fillRect(0, 0, W, H);
      if (img) {
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
      x.font = '400 84px "Lucky", Impact, sans-serif'; x.fillStyle = "#F77914"; x.fillText("DAY STREAK 🔥", W / 2, 1180);
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
      '<p class="u13">Under 13? Parents, share their streak.</p><p class="mute small">No name, no photo: just the streak. Link: handleslab.com/?ref=streak</p></div>';
    o.hidden = false;
    var blobP = drawCard().then(function (cv) {
      var im = new Image(); im.alt = "Streak card: " + streak() + "-day streak, handleslab.com · @thehandleslab"; im.src = cv.toDataURL("image/png");
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
  show(["map", "founding"].indexOf(h0) >= 0 ? h0 : "today");
  if ("serviceWorker" in navigator && window.isSecureContext) addEventListener("load", function () { navigator.serviceWorker.register("/app-preview/sw.js", { scope: "/app-preview/" }).catch(function () {}); });
  window.HLAPP_DEBUG = { openDay: openDay, celebrate: celebrate, show: show };
})();
