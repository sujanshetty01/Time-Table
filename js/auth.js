/* ============================================================
   auth.js — Firebase Auth + Firestore real-time progress sync
   Bridges to app.js via window.CloudBridge / window.Cloud.
   Falls back to local-only mode when Firebase isn't configured.
   ============================================================ */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const cfg = window.FIREBASE_CONFIG || {};
  const configured =
    !!cfg.apiKey && !String(cfg.apiKey).includes("YOUR_") &&
    !!cfg.projectId && !String(cfg.projectId).includes("YOUR_") &&
    typeof firebase !== "undefined";

  /* -------- Local-only mode (no Firebase configured) -------- */
  if (!configured) {
    const boot = () => {
      const o = $("authOverlay"); if (o) o.remove();
      const chip = $("userChip");
      if (chip) chip.innerHTML = `<span class="uc-dot local"></span><span class="uc-email">Local mode</span>`;
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
    return;
  }

  /* -------- Cloud mode -------- */
  firebase.initializeApp(cfg);
  const auth = firebase.auth();
  const db = firebase.firestore();
  auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {});

  let currentUser = null;
  let unsub = null;

  // Gate the app immediately until auth state resolves.
  showOverlay();

  // Save interface consumed by app.js persist().
  window.Cloud = {
    save(data) {
      if (!currentUser) return;
      db.collection("users").doc(currentUser.uid).set(
        {
          progress: data,
          email: currentUser.email,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      ).catch((e) => console.warn("Cloud save failed:", e.message));
    },
  };

  function watch(uid) {
    if (unsub) unsub();
    unsub = db.collection("users").doc(uid).onSnapshot(
      (snap) => {
        if (!snap.exists) {
          // First login on this account: seed cloud from this device's data.
          window.Cloud.save(window.CloudBridge.localData());
          return;
        }
        const progress = snap.data().progress || null;
        if (JSON.stringify(progress) === JSON.stringify(window.CloudBridge.localData())) return;
        window.CloudBridge.applyRemote(progress);
      },
      (err) => console.warn("Snapshot error:", err.message)
    );
  }

  auth.onAuthStateChanged((user) => {
    currentUser = user;
    if (user) {
      setChip(user.email);
      hideOverlay();
      watch(user.uid);
    } else {
      if (unsub) { unsub(); unsub = null; }
      window.CloudBridge.applyRemote(null); // clear UI for the next user
      setChip(null);
      showOverlay();
    }
  });

  /* -------- UI helpers -------- */
  function showOverlay() { const o = $("authOverlay"); if (o) { o.classList.add("show"); document.body.style.overflow = "hidden"; } }
  function hideOverlay() { const o = $("authOverlay"); if (o) { o.classList.remove("show"); document.body.style.overflow = ""; } }

  function setChip(email) {
    const chip = $("userChip");
    if (!chip) return;
    if (email) {
      chip.innerHTML =
        `<span class="uc-dot"></span>` +
        `<span class="uc-email" title="${email}">${email}</span>` +
        `<button class="uc-logout" id="logoutBtn" title="Log out">⏻</button>`;
      const lb = $("logoutBtn");
      if (lb) lb.onclick = () => auth.signOut();
    } else {
      chip.innerHTML = `<span class="uc-dot signed-out"></span><span class="uc-email">Signed out</span>`;
    }
  }

  function showError(msg) { const e = $("authError"); if (e) e.textContent = msg || ""; }
  function mapError(code) {
    return {
      "auth/invalid-email": "Enter a valid email address.",
      "auth/missing-password": "Enter your password.",
      "auth/weak-password": "Password should be at least 6 characters.",
      "auth/email-already-in-use": "That email already has an account — try logging in.",
      "auth/invalid-credential": "Incorrect email or password.",
      "auth/wrong-password": "Incorrect email or password.",
      "auth/user-not-found": "No account with that email — sign up first.",
      "auth/network-request-failed": "Network error — check your connection.",
      "auth/operation-not-allowed": "This sign-in method isn't enabled in Firebase yet.",
      "auth/unauthorized-domain": "This domain isn't authorized in Firebase Auth settings.",
      "auth/popup-blocked": "Popup blocked — allow popups and try again.",
      "auth/too-many-requests": "Too many attempts. Please try again shortly.",
    }[code] || "Something went wrong. Please try again.";
  }

  function wireForm() {
    const email = $("authEmail"), pass = $("authPass"), submit = $("authSubmit");
    if (!submit) return;
    const tabs = document.querySelectorAll(".auth-tab");
    let mode = "login";

    // Google sign-in
    const googleBtn = $("googleBtn");
    if (googleBtn) {
      googleBtn.addEventListener("click", async () => {
        showError("");
        const provider = new firebase.auth.GoogleAuthProvider();
        try {
          await auth.signInWithPopup(provider);
        } catch (ex) {
          // Popups can be blocked (or unavailable on file://) — fall back to redirect.
          if (ex.code === "auth/popup-blocked" || ex.code === "auth/operation-not-supported-in-this-environment" || ex.code === "auth/cancelled-popup-request") {
            try { await auth.signInWithRedirect(provider); return; } catch (e2) { showError(mapError(e2.code)); return; }
          }
          if (ex.code !== "auth/popup-closed-by-user") showError(mapError(ex.code));
        }
      });
    }

    tabs.forEach((t) =>
      t.addEventListener("click", () => {
        mode = t.dataset.mode;
        tabs.forEach((x) => x.classList.toggle("active", x === t));
        submit.textContent = mode === "login" ? "Log in" : "Create account";
        pass.setAttribute("autocomplete", mode === "login" ? "current-password" : "new-password");
        showError("");
      })
    );

    async function go() {
      showError("");
      const e = email.value.trim(), p = pass.value;
      if (!e || !p) { showError("Enter your email and password."); return; }
      submit.disabled = true;
      const original = submit.textContent;
      submit.textContent = "Please wait…";
      try {
        if (mode === "login") await auth.signInWithEmailAndPassword(e, p);
        else await auth.createUserWithEmailAndPassword(e, p);
        pass.value = "";
      } catch (ex) {
        showError(mapError(ex.code));
      } finally {
        submit.disabled = false;
        submit.textContent = original;
      }
    }

    submit.addEventListener("click", go);
    [email, pass].forEach((el) =>
      el.addEventListener("keydown", (ev) => { if (ev.key === "Enter") go(); })
    );
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wireForm);
  else wireForm();
})();
