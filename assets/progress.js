/* Handles Lab progress: stored only in this browser (localStorage). No accounts, no tracking.
 * hl-done   {day: "YYYY-MM-DD"}  days marked done (and the local date they were marked)
 * hl-chk    {"day-moveId": 1}   per-drill self-checks
 * hl-badges {Tier: 1}           level-complete badges already celebrated
 * Locking: a day of level N is locked until every EARLIER day of a lower level is done.
 * Content is always in the page (preview link), so nothing is hidden from search or parents. */
(function () {
  var HL = window.HL || { tiers: {}, order: [] };
  function load(k) { try { return JSON.parse(localStorage.getItem(k) || "{}"); } catch (e) { return {}; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function ymd(dt) { return dt.getFullYear() + "-" + ("0" + (dt.getMonth() + 1)).slice(-2) + "-" + ("0" + dt.getDate()).slice(-2); }
  var done = load("hl-done"), chk = load("hl-chk"), badges = load("hl-badges");
  for (var k in done) if (done[k] === 1) done[k] = "";               // migrate old format
  var tierIdx = function (d) { return HL.order.indexOf(HL.tiers[d]); };
  var label = function (t) { return "Level " + (HL.order.indexOf(t) + 1) + " of 4 · " + t; };
  function missingFor(d) { var m = []; for (var x = 1; x < d; x++) if (tierIdx(x) < tierIdx(d) && !done[x]) m.push(x); return m; }
  function locked(d) { return tierIdx(d) > 0 && missingFor(d).length > 0; }
  var held = function (d) { return (HL.held || []).indexOf(d) >= 0; };   // days behind an "Unlocks" card (tools/day_lock.txt)
  function today() { for (var d = 1; d <= 30; d++) if (!done[d] && !locked(d) && !held(d)) return d; for (d = 1; d <= 30; d++) if (!done[d] && !locked(d)) return d; for (d = 1; d <= 30; d++) if (!done[d]) return d; return 30; }
  function streak() {
    var dates = {}; for (var k in done) if (done[k]) dates[done[k]] = 1;
    var t = new Date(), n = 0;
    if (!dates[ymd(t)]) t.setDate(t.getDate() - 1);                  // streak still alive if last practice was yesterday
    while (dates[ymd(t)]) { n++; t.setDate(t.getDate() - 1); }
    return n;
  }
  function tierComplete(t) { var any = false; for (var d = 1; d <= 30; d++) if (HL.tiers[d] === t) { any = true; if (!done[d]) return false; } return any; }
  function paint() {
    var td = today(), cnt = Object.keys(done).length;
    document.querySelectorAll(".map a[data-day]").forEach(function (a) {
      var d = +a.dataset.day;
      a.classList.toggle("done", !!done[d]); a.classList.toggle("locked", !done[d] && locked(d)); a.classList.toggle("today", d === td && !done[d]);
    });
    document.querySelectorAll("[data-count]").forEach(function (e) { e.textContent = cnt; });
    document.querySelectorAll("[data-streak]").forEach(function (e) { e.textContent = streak(); });
    document.querySelectorAll("[data-today-link],[data-next-open]").forEach(function (a) { a.href = "/day/" + td + "/"; a.textContent = a.hasAttribute("data-today-link") ? "Go to today: Day " + td : "Go to your next open day (Day " + td + ")"; });
    var b = document.querySelector("[data-badges]");
    if (b) b.innerHTML = HL.order.filter(tierComplete).map(function (t) { return '<span class="badge-chip">🏅 ' + label(t) + "</span>"; }).join("");
    var st = document.querySelector("[data-stats]"); if (st && cnt) st.hidden = false;
  }
  // locked state on a day page
  var box = document.querySelector("[data-lock]");
  if (box) {
    var d0 = +document.querySelector("[data-mark]").dataset.mark, miss = missingFor(d0);
    if (miss.length && !sessionStorage.getItem("hl-preview-" + d0)) {
      box.hidden = false; document.body.classList.add("is-locked");
      box.querySelector("[data-missing]").innerHTML = miss.map(function (x) { return '<a href="/day/' + x + '/">Day ' + x + "</a>"; }).join(", ");
      box.querySelector("[data-preview]").addEventListener("click", function (e) {
        e.preventDefault(); try { sessionStorage.setItem("hl-preview-" + d0, 1); } catch (er) {}
        document.body.classList.remove("is-locked"); box.querySelector("p").innerHTML = "<b>👀 Previewing a locked day.</b> You can read everything; mark the earlier days done to unlock it for real.";
        this.parentNode.remove();
      });
    } else if (miss.length) { box.hidden = false; box.querySelector("p").innerHTML = "<b>👀 Previewing a locked day.</b> Mark the earlier days done to unlock it for real."; box.querySelector("[data-preview]").parentNode.remove(); }
  }
  // self-checks gate "Mark day done"
  var btn = document.querySelector("[data-mark]");
  if (btn) {
    var d = btn.dataset.mark, boxes = document.querySelectorAll("[data-chk]"), hint = document.querySelector("[data-hint]");
    boxes.forEach(function (c) { c.checked = !!chk[c.dataset.chk] || !!done[d]; c.addEventListener("change", function () { if (c.checked) chk[c.dataset.chk] = 1; else delete chk[c.dataset.chk]; save("hl-chk", chk); gate(); }); });
    function allChecked() { return Array.prototype.every.call(boxes, function (c) { return c.checked; }); }
    function gate() {
      var ok = allChecked() || !!done[d];
      btn.disabled = !ok;
      btn.textContent = done[d] ? "✓ Day " + d + " done (tap to undo)" : "Mark Day " + d + " done";
      btn.setAttribute("aria-pressed", !!done[d]);
      if (hint) hint.textContent = done[d] ? "Nice work. See you tomorrow." : ok ? "All drills checked. Lock it in!" : "Tick the self-check on every move first.";
    }
    btn.addEventListener("click", function () {
      if (done[d]) delete done[d]; else done[d] = ymd(new Date());
      save("hl-done", done); gate(); paint(); celebrate();
    });
    gate();
  }
  function celebrate() {
    var u = document.querySelector("[data-unlock]"); if (!u) return;
    for (var i = 0; i < HL.order.length; i++) {
      var t = HL.order[i];
      if (tierComplete(t) && !badges[t]) {
        badges[t] = 1; save("hl-badges", badges);
        var nxt = HL.order[i + 1];
        u.innerHTML = '<span class="kicker" style="color:var(--ink)">Level complete</span><span class="disp">🏅 ' + t + " badge earned!</span><p style=\"margin:0\"><b>" + label(t) + " complete.</b></p>" +
          (nxt ? "<p><b>" + label(nxt) + " is unlocked.</b> <a href=\"/day/" + today() + "/\">Go to Day " + today() + " →</a></p>" : "<p><b>Every level done. You finished the challenge!</b></p>");
        u.hidden = false; u.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
    }
  }
  paint();
})();
/* Animated step diagrams (inline SVG): hold still for prefers-reduced-motion. */
(function () {
  if (!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches)) return;
  document.querySelectorAll("svg.dg").forEach(function (sv) { try { sv.pauseAnimations(); sv.setCurrentTime(0); } catch (e) {} });
})();
/* Loop clips: load only when on screen, pause when off screen; respect reduced motion. */
(function () {
  var vids = document.querySelectorAll("video.loop[data-src]"); if (!vids.length) return;
  var still = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function start(v) { if (!v.src) v.src = v.dataset.src; if (!still) { var p = v.play(); if (p && p.catch) p.catch(function () {}); } }
  if (still) vids.forEach(function (v) { v.controls = true; v.preload = "none"; v.src = v.dataset.src; });
  else if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) start(e.target); else e.target.pause(); }); }, { rootMargin: "200px" });
    vids.forEach(function (v) { v.autoplay = true; io.observe(v); });
  } else vids.forEach(function (v) { v.autoplay = true; start(v); });
})();
if ("serviceWorker" in navigator) addEventListener("load", function () { navigator.serviceWorker.register("/sw.js").catch(function () {}); });
