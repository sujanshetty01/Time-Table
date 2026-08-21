/* ============================================================
   admin.js — role-based Admin / Mentor panel + broadcast banner
   Visible only to admins (full) and mentors (read-only).
   Uses window.PathAuth (from auth.js). No-op in local mode.
   ============================================================ */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  let built = false;

  function auth() { return window.PathAuth; }
  function canOpen() { const a = auth(); return a && (a.isAdmin() || a.isMentor()); }

  /* ---- Sidebar access button ---- */
  function refreshAccess() {
    const slot = $("adminSlot");
    if (!slot) return;
    if (!canOpen()) { slot.innerHTML = ""; return; }
    const label = auth().isAdmin() ? "🛠️ Admin panel" : "👥 Team";
    slot.innerHTML = `<button class="admin-open" id="adminOpenBtn">${label}</button>`;
    $("adminOpenBtn").onclick = open;
    watchBroadcast();
  }

  /* ---- Panel ---- */
  function ensureDom() {
    if (built) return;
    const el = document.createElement("div");
    el.id = "adminOverlay";
    el.className = "admin-overlay";
    el.innerHTML = `
      <div class="admin-card">
        <div class="admin-head">
          <h2 id="adminTitle">Admin panel</h2>
          <button class="admin-close" id="adminCloseBtn">✕</button>
        </div>
        <div class="admin-stats" id="adminStats"></div>
        <div class="admin-broadcast" id="adminBroadcast"></div>
        <h3 class="admin-sub">Users</h3>
        <div class="admin-table-wrap"><table class="admin-table" id="adminTable"></table></div>
        <div class="admin-msg" id="adminMsg"></div>
      </div>`;
    document.body.appendChild(el);
    $("adminCloseBtn").onclick = close;
    el.addEventListener("click", (e) => { if (e.target === el) close(); });
    built = true;
  }

  async function open() {
    if (!canOpen()) return;
    ensureDom();
    const a = auth();
    $("adminTitle").textContent = a.isAdmin() ? "Admin panel" : "Team (read-only)";
    $("adminOverlay").classList.add("show");
    document.body.style.overflow = "hidden";
    renderBroadcastForm();
    await load();
  }
  function close() {
    const o = $("adminOverlay");
    if (o) o.classList.remove("show");
    document.body.style.overflow = "";
  }

  const ROLES = ["user", "mentor", "admin"];

  async function load() {
    const msg = $("adminMsg");
    msg.textContent = "Loading users…";
    let users = [];
    try { users = await auth().listUsers(); }
    catch (e) { msg.textContent = "Could not load users: " + e.message; return; }
    msg.textContent = "";

    // Analytics
    const total = users.length;
    const roleCount = { user: 0, mentor: 0, admin: 0 };
    const goalCount = {};
    users.forEach((u) => {
      roleCount[u.role || "user"] = (roleCount[u.role || "user"] || 0) + 1;
      const g = (u.profile && u.profile.careerGoalLabel) || "—";
      goalCount[g] = (goalCount[g] || 0) + 1;
    });
    const topGoals = Object.entries(goalCount).sort((a, b) => b[1] - a[1]).slice(0, 4);
    $("adminStats").innerHTML = `
      <div class="astat"><div class="astat-n">${total}</div><div class="astat-l">Users</div></div>
      <div class="astat"><div class="astat-n">${roleCount.admin}</div><div class="astat-l">Admins</div></div>
      <div class="astat"><div class="astat-n">${roleCount.mentor}</div><div class="astat-l">Mentors</div></div>
      <div class="astat wide"><div class="astat-l">Top goals</div><div class="astat-goals">${
        topGoals.map(([g, n]) => `<span>${g} · ${n}</span>`).join("") || "—"}</div></div>`;

    // Users table
    const isAdmin = auth().isAdmin();
    const rows = users.map((u) => {
      const goal = (u.profile && u.profile.careerGoalLabel) || "—";
      const doneN = (u.progress && Array.isArray(u.progress.done)) ? u.progress.done.length : 0;
      const role = u.role || "user";
      const when = u.updatedAt && u.updatedAt.toDate ? u.updatedAt.toDate().toLocaleDateString() : "—";
      const roleCell = isAdmin
        ? `<select class="admin-role" data-uid="${u.uid}">${ROLES.map((r) => `<option ${r === role ? "selected" : ""}>${r}</option>`).join("")}</select>`
        : `<span class="role-pill ${role}">${role}</span>`;
      return `<tr>
        <td class="a-email">${esc(u.email || u.uid)}</td>
        <td>${esc(goal)}</td>
        <td class="a-num">${doneN}</td>
        <td>${roleCell}</td>
        <td class="a-when">${when}</td>
      </tr>`;
    }).join("");
    $("adminTable").innerHTML =
      `<thead><tr><th>Email</th><th>Goal</th><th>Tasks</th><th>Role</th><th>Updated</th></tr></thead><tbody>${rows}</tbody>`;

    if (isAdmin) {
      $("adminTable").querySelectorAll(".admin-role").forEach((sel) =>
        sel.addEventListener("change", async () => {
          const uid = sel.dataset.uid;
          try {
            await auth().setUserRole(uid, sel.value);
            flash(`Role updated to ${sel.value}`);
          } catch (e) { flash("Update failed: " + e.message, true); }
        }));
    }
  }

  function renderBroadcastForm() {
    const box = $("adminBroadcast");
    if (!auth().isAdmin()) { box.innerHTML = ""; return; }
    box.innerHTML = `
      <h3 class="admin-sub">Broadcast a message</h3>
      <div class="bc-row">
        <input id="bcTitle" class="bc-input" placeholder="Title (e.g. New AI track live!)" />
        <input id="bcBody" class="bc-input" placeholder="Message" />
        <button id="bcSend" class="bc-send">Send</button>
      </div>`;
    $("bcSend").onclick = async () => {
      const t = $("bcTitle").value.trim(), b = $("bcBody").value.trim();
      if (!t) { flash("Enter a title", true); return; }
      try { await auth().broadcast(t, b); $("bcTitle").value = ""; $("bcBody").value = ""; flash("Broadcast sent 📣"); }
      catch (e) { flash("Send failed: " + e.message, true); }
    };
  }

  function flash(text, err) {
    const m = $("adminMsg");
    if (!m) return;
    m.textContent = text;
    m.className = "admin-msg" + (err ? " err" : " ok");
    setTimeout(() => { if (m.textContent === text) m.textContent = ""; }, 2500);
  }
  function esc(s) { return String(s == null ? "" : s).replace(/</g, "&lt;"); }

  /* ---- Broadcast banner (all signed-in users) ---- */
  let bcSub = null;
  function watchBroadcast() {
    if (bcSub || typeof firebase === "undefined") return;
    try {
      bcSub = firebase.firestore().collection("broadcasts").orderBy("at", "desc").limit(1)
        .onSnapshot((snap) => {
          if (snap.empty) return;
          const doc = snap.docs[0];
          if (localStorage.getItem("cloudpath.bcSeen") === doc.id) return;
          showBanner(doc.id, doc.data());
        }, () => {});
    } catch {}
  }
  function showBanner(id, data) {
    let b = $("bcBanner");
    if (!b) { b = document.createElement("div"); b.id = "bcBanner"; b.className = "bc-banner"; document.body.appendChild(b); }
    b.innerHTML = `<span>📣 <strong>${esc(data.title)}</strong> ${esc(data.body || "")}</span><button id="bcDismiss">✕</button>`;
    b.classList.add("show");
    $("bcDismiss").onclick = () => { localStorage.setItem("cloudpath.bcSeen", id); b.classList.remove("show"); };
  }

  window.AdminPanel = { refreshAccess, open, close };
  if (document.readyState !== "loading") refreshAccess();
  else document.addEventListener("DOMContentLoaded", refreshAccess);
})();
