/* Handles Lab email signup: the ONLY place the email provider is wired.
 * Provider: MailerLite (free plan). To go live:
 *   1. MailerLite > Forms > Embedded form > HTML code; copy the <form action="..."> URL
 *      (looks like https://assets.mailerlite.com/jsonp/ACCOUNT_ID/forms/FORM_ID/subscribe).
 *   2. Paste it into ACTION below and push. Every signup form on the site switches over.
 * Until ACTION is set, the form falls back to opening a pre-filled email (mailto) to FALLBACK_TO.
 */
(function () {
  var ACTION = "";                                   // <- MailerLite form action URL goes here
  var FALLBACK_TO = "handleslab@mail.grokbot.com";
  var forms = document.querySelectorAll("form[data-signup]");
  forms.forEach(function (f) {
    var note = f.querySelector(".su-note");
    var btn = f.querySelector("button");
    if (!ACTION && note) note.textContent = "Sign-ups open soon. For now this opens a pre-filled email to us; or just start Day 1 below.";
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = (f.querySelector("input[type=email]").value || "").trim();
      if (f.querySelector(".hp input") && f.querySelector(".hp input").value) return;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { note.textContent = "Please enter a valid email."; return; }
      if (!ACTION) {
        location.href = "mailto:" + FALLBACK_TO + "?subject=" + encodeURIComponent("Send me the 30-day challenge") +
          "&body=" + encodeURIComponent("Please email each day of the Handles Lab 30-day challenge to: " + email);
        note.textContent = "Opening your email app. Hit send and you're on the list.";
        return;
      }
      var fd = new FormData();
      fd.append("fields[email]", email); fd.append("ml-submit", "1"); fd.append("anticsrf", "true");
      btn.disabled = true; note.textContent = "Signing you up…";
      fetch(ACTION, { method: "POST", body: fd, mode: "no-cors" })
        .then(function () { note.textContent = "You're in! Check your inbox to confirm."; f.reset(); })
        .catch(function () { note.textContent = "Something went wrong. Please try again."; })
        .finally(function () { btn.disabled = false; });
    });
  });
})();
