/* Progress is stored only in this browser (localStorage). No accounts, no tracking. */
(function () {
  var K = "hl-done", done = {};
  try { done = JSON.parse(localStorage.getItem(K) || "{}"); } catch (e) {}
  function paint() {
    document.querySelectorAll(".map a[data-day]").forEach(function (a) { a.classList.toggle("done", !!done[a.dataset.day]); });
    var c = document.querySelector("[data-count]"); if (c) c.textContent = Object.keys(done).length;
  }
  var b = document.querySelector("[data-mark]");
  if (b) {
    var d = b.dataset.mark;
    var set = function () { b.textContent = done[d] ? "✓ Day " + d + " done" : "Mark Day " + d + " done"; b.setAttribute("aria-pressed", !!done[d]); };
    b.addEventListener("click", function () { if (done[d]) delete done[d]; else done[d] = 1; try { localStorage.setItem(K, JSON.stringify(done)); } catch (e) {} set(); paint(); });
    set();
  }
  paint();
})();
