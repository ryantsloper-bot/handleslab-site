/* Handles Lab email signup: the ONLY place the email provider is wired.
 * Every form on the site is <form data-signup="challenge|waitlist"> built by tools/build.py.
 *
 * PROVIDER = MailerLite (free). To go live, in MailerLite create two groups ("challenge", "waitlist"),
 * one embedded form per group (or one form + group), copy each form's <form action="..."> URL
 * (https://assets.mailerlite.com/jsonp/ACCOUNT_ID/forms/FORM_ID/subscribe) into MAILERLITE below, push.
 *
 * Until a MailerLite URL is set for a tag, signups go to the interim FormSubmit relay
 * (emails each signup to INBOX; FormSubmit needs a one-time activation click from that inbox),
 * and if that request fails, the browser opens a pre-filled email to INBOX as a last resort.
 */
(function () {
  var MAILERLITE = { challenge: "", waitlist: "" };   // <- paste MailerLite form action URLs here
  var INBOX = "handleslab@mail.grokbot.com";
  var INTERIM = "https://formsubmit.co/ajax/" + INBOX;
  var COPY = {
    challenge: { ok: "You're in. Day 1 is ready now: grab a ball.", subject: "New Handles Lab challenge signup" },
    waitlist: { ok: "You're on the app waitlist. We'll email you when it opens.", subject: "New Handles Lab app waitlist signup" }
  };
  function mailto(tag, email, name) {
    location.href = "mailto:" + INBOX + "?subject=" + encodeURIComponent(COPY[tag].subject) +
      "&body=" + encodeURIComponent("Please add me (" + tag + "): " + email + (name ? " (" + name + ")" : ""));
  }
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
      var req;
      if (MAILERLITE[tag]) {
        var fd = new FormData();
        fd.append("fields[email]", email); if (name) fd.append("fields[name]", name);
        fd.append("ml-submit", "1"); fd.append("anticsrf", "true");
        req = fetch(MAILERLITE[tag], { method: "POST", body: fd, mode: "no-cors" });
      } else {
        req = fetch(INTERIM, { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify({ email: email, name: name, list: tag, page: location.pathname, _subject: COPY[tag].subject, _template: "table", _captcha: "false" }) })
          .then(function (r) { if (!r.ok) throw new Error(r.status); return r; });
      }
      req.then(function () { note.textContent = COPY[tag].ok; f.reset(); })
         .catch(function () { note.textContent = "Couldn't reach our sign-up service, so we're opening an email instead. Just hit send."; mailto(tag, email, name); })
         .finally(function () { btn.disabled = false; });
    });
  });
})();
