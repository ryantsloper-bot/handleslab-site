/* Handles Lab email signup: the ONLY place the email provider is wired.
 * Every form on the site is <form data-signup="challenge|waitlist"> built by tools/build.py.
 *
 * PROVIDER = MailerLite (free): one embedded form per group; to change, paste the form's action URL below.
 *
 * MailerLite is live for both tags. If a MailerLite request fails, the signup falls back to the FormSubmit
 * relay, which emails it (with its list tag) to the Handles Lab inbox via a random-string alias.
 */
(function () {
  var MAILERLITE = {                                   // MailerLite account 2735408, one form per group
    challenge: "https://assets.mailerlite.com/jsonp/2735408/forms/202091683553215553/subscribe",
    waitlist: "https://assets.mailerlite.com/jsonp/2735408/forms/202091858275337947/subscribe"
  };
  var INTERIM = "https://formsubmit.co/ajax/e5c2ff303dec10e26ab91f646320f41d"; // FormSubmit alias for the Handles Lab inbox (activated 2026-10-23)
  var COPY = {
    challenge: { ok: "You're in! Check your inbox for Day 1.", subject: "New Handles Lab challenge signup" },
    waitlist: { ok: "You're on the list. Founding price: $29.99 for your first year.", subject: "New Handles Lab app waitlist signup" }
  };
  document.querySelectorAll("form[data-signup]").forEach(function (f) {
    var tag = f.getAttribute("data-signup") in COPY ? f.getAttribute("data-signup") : "challenge";
    var note = f.querySelector(".su-note"), btn = f.querySelector("button");
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var hp = f.querySelector("[name=_honey]"); if (hp && hp.value) return;
      var email = (f.querySelector("[name=email]").value || "").trim();
      var nm = f.querySelector("[name=name]"); var name = nm ? nm.value.trim() : "";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { note.textContent = "Please enter a valid email."; return; }
      btn.disabled = true; note.textContent = "Signing you up…";
      function viaFormSubmit() {
        return fetch(INTERIM, { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify({ email: email, name: name, list: tag, page: location.pathname, _subject: COPY[tag].subject, _template: "table", _captcha: "false" }) })
          .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
          .then(function (j) { if (!j || String(j.success) !== "true") throw new Error((j && j.message) || "failed"); return j; });
      }
      function viaMailerLite() {
        var fd = new FormData();
        fd.append("fields[email]", email); if (name) fd.append("fields[name]", name);
        fd.append("ml-submit", "1"); fd.append("anticsrf", "true");
        return fetch(MAILERLITE[tag], { method: "POST", body: fd })           // CORS-enabled; returns {"success":true}
          .then(function (r) { return r.json(); })
          .then(function (j) { if (!j || j.success !== true) throw new Error("mailerlite"); return j; });
      }
      // MailerLite first; FormSubmit (emails the signup to our inbox) only if MailerLite can't be reached or rejects it.
      var req = MAILERLITE[tag] ? viaMailerLite().catch(viaFormSubmit) : viaFormSubmit();
      req.then(function () { note.textContent = COPY[tag].ok; f.reset(); })
         .catch(function () { note.textContent = "Couldn't sign you up just now. Please try again in a minute."; })
         .finally(function () { btn.disabled = false; });
    });
  });
})();
