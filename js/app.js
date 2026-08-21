/* ============================================================
   CloudPath — App Logic
   Rendering, navigation, theme, and progress persistence.
   ============================================================ */
(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const LEGACY_KEY = "cloudpath.progress.v1";
  const CACHE_KEY = "cloudpath.userdata.v1";
  const THEME_KEY = "cloudpath.theme.v1";

  /* ---------------- User progress state (device cache + cloud) ---------------- */
  const defaultUD = () => ({ done: [], streak: { count: 0, last: null }, log: {}, celebrated: [], weekTarget: 150 });

  function normalizeUD(d) {
    const base = defaultUD();
    if (!d || typeof d !== "object") return base;
    return {
      done: Array.isArray(d.done) ? d.done : base.done,
      streak: d.streak && typeof d.streak === "object"
        ? { count: d.streak.count | 0, last: d.streak.last ?? null } : base.streak,
      log: d.log && typeof d.log === "object" ? d.log : base.log,
      celebrated: Array.isArray(d.celebrated) ? d.celebrated : base.celebrated,
      weekTarget: Number.isFinite(d.weekTarget) ? d.weekTarget : base.weekTarget,
    };
  }

  function loadCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) return normalizeUD(JSON.parse(raw));
      const legacy = localStorage.getItem(LEGACY_KEY); // migrate old done-only storage
      if (legacy) { const ud = defaultUD(); ud.done = JSON.parse(legacy); return ud; }
    } catch {}
    return defaultUD();
  }

  let UD = loadCache();
  let done = new Set(UD.done);

  let persistTimer;
  function serialize() { UD.done = [...done]; UD.celebrated = [...celebrated]; return JSON.parse(JSON.stringify(UD)); }
  function persist(pushCloud = true) {
    UD.done = [...done];
    UD.celebrated = [...celebrated];
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(UD)); } catch {}
    if (pushCloud && window.Cloud && typeof window.Cloud.save === "function") {
      clearTimeout(persistTimer);
      persistTimer = setTimeout(() => window.Cloud.save(serialize()), 400);
    }
  }
  function saveProgress() { persist(); }

  // Bridge used by auth.js to push cloud data into the app in real time.
  window.CloudBridge = {
    applyRemote(data) {
      UD = normalizeUD(data);
      done = new Set(UD.done);
      celebrated = new Set(UD.celebrated);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(UD)); } catch {}
      prevLevel = null; // don't fire level-up/badge celebrations on remote hydrate
      renderTracker();
      const wg = $("#wgTarget"); if (wg) wg.value = UD.weekTarget;
      updateAllProgress();
    },
    localData() { return serialize(); },
    reset() { applyResetState(); },
  };

  const totalTasks = TRACKER.reduce((n, p) => n + p.tasks.length, 0);

  /* ---------------- Renderers ---------------- */
  function renderDaily() {
    $("#dailyTimeline").innerHTML = DAILY.map((d) => `
      <div class="tl-item" style="--accent-color:${d.color}">
        <div class="tl-time">${d.time}<span class="dur">${d.dur}</span></div>
        <div class="tl-body">
          <h4>${d.title}</h4>
          <p>${d.desc}</p>
          <div class="tl-tags">${d.tags.map((t) => `<span class="tag">${t}</span>`).join("")}</div>
        </div>
      </div>`).join("");
  }

  function renderWeek() {
    $("#weekGrid").innerHTML = WEEK.map((d) => `
      <div class="day-card ${d.weekend ? "weekend" : ""}" data-day="${d.day}">
        <div class="day-name">${d.day}</div>
        <div class="day-focus">${d.focus}</div>
        <ul class="day-tasks">
          ${d.tasks.map((t) => `<li style="--kind-color:${KIND_COLOR[t.k]}">${t.t}</li>`).join("")}
        </ul>
      </div>`).join("");
  }

  function renderRoadmap() {
    $("#phaseTabs").innerHTML = PHASES.map((p, i) => `
      <button class="phase-tab ${i === 0 ? "active" : ""}" data-phase="${p.id}">
        <div class="pt-months">${p.months}</div>
        <div class="pt-title">${p.title}</div>
        <div class="pt-goal">${p.goal}</div>
      </button>`).join("");

    $$("#phaseTabs .phase-tab").forEach((btn) =>
      btn.addEventListener("click", () => {
        $$("#phaseTabs .phase-tab").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        renderPhaseBody(btn.dataset.phase);
      })
    );
    renderPhaseBody(PHASES[0].id);
  }

  function renderPhaseBody(id) {
    const p = PHASES.find((x) => x.id === id);
    $("#phaseBody").innerHTML = `
      <div class="phase-head">
        <h3>${p.title}</h3>
        <div class="cert-chips">${p.certs.map((c) => `<span class="cert-chip">🎓 ${c}</span>`).join("")}</div>
      </div>
      <p class="phase-outcome">${p.outcome}</p>
      <div class="month-list">
        ${p.plan.map((m) => `
          <div class="month-block">
            <div class="month-badge">M${m.n}</div>
            <div class="month-body">
              <h4 class="month-title">${m.title}</h4>
              <div class="month-cols">
                <div class="month-col">
                  <h5>📖 Study</h5>
                  <ul>${m.study.map((s) => `<li>${s}</li>`).join("")}</ul>
                </div>
                <div class="month-col">
                  <h5>🔨 Hands-on</h5>
                  <ul>${m.hands.map((h) => `<li>${h}</li>`).join("")}</ul>
                </div>
              </div>
              <div class="month-deliverable"><span>Deliverable</span> ${m.deliverable}</div>
            </div>
          </div>`).join("")}
      </div>`;
  }

  function renderMilestones() {
    $("#milestoneTrack").innerHTML = MILESTONES.map((m) => `
      <div class="ms-item">
        <div class="ms-marker">
          <span class="ms-time">${m.time}<small>${m.sub}</small></span>
          <div class="ms-badge">${m.icon}</div>
        </div>
        <div class="ms-card">
          <div class="ms-role">${m.role}</div>
          <h3>${m.title}</h3>
          <ul class="ms-list">${m.items.map((i) => `<li>${i}</li>`).join("")}</ul>
        </div>
      </div>`).join("");

    const ev = $("#evidenceGrid");
    if (ev) ev.innerHTML = EVIDENCE.map((e) => `<div class="evidence-item">${e}</div>`).join("");
  }

  function renderMethod() {
    const bars = $("#methodBars");
    if (bars) bars.innerHTML = METHOD.ratio.map((r) => `
      <div class="method-row">
        <div class="method-row-head"><span>${r.label}</span><span>${r.pct}%</span></div>
        <div class="method-bar"><div class="method-fill" style="width:${r.pct}%;background:${r.color}"></div></div>
      </div>`).join("");
    const cycle = $("#methodCycle");
    if (cycle) cycle.innerHTML = METHOD.cycle
      .map((c) => `<span class="cycle-chip">${c}</span>`)
      .join('<span class="cycle-arrow">→</span>');
  }

  function renderCompetencies() {
    const el = $("#competencyGrid");
    if (el) el.innerHTML = COMPETENCIES.map((c) => `
      <div class="comp-card">
        <h4>${c.ico} ${c.area}</h4>
        <ul>${c.items.map((i) => `<li>${i}</li>`).join("")}</ul>
      </div>`).join("");
  }

  function renderMistakes() {
    const el = $("#mistakesList");
    if (el) el.innerHTML = MISTAKES.map((m) => `<div class="mistake-item">${m}</div>`).join("");
  }

  function renderResources() {
    $("#resourceGrid").innerHTML = RESOURCES.map((r) => `
      <div class="res-card">
        <div class="res-ico">${r.ico}</div>
        <h4>${r.title}</h4>
        <ul>${r.items.map((i) => `<li>${i}</li>`).join("")}</ul>
      </div>`).join("");
  }

  /* ---------------- Tracker ---------------- */
  let activeFilter = "all";

  function renderTrackerFilter() {
    const filters = [{ id: "all", label: "All Phases" }, ...PHASES.map((p) => ({ id: p.id, label: p.title }))];
    $("#trackerFilter").innerHTML = filters.map((f) =>
      `<button class="filter-btn ${f.id === activeFilter ? "active" : ""}" data-filter="${f.id}">${f.label}</button>`
    ).join("");
    $$("#trackerFilter .filter-btn").forEach((b) =>
      b.addEventListener("click", () => {
        activeFilter = b.dataset.filter;
        renderTrackerFilter();
        applyFilter();
      })
    );
  }

  const checkSVG = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0b1020" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

  function renderTracker() {
    $("#trackerList").innerHTML = TRACKER.map((p) => `
      <div class="track-phase" data-phase="${p.id}">
        <div class="track-phase-head">
          <h4>${p.title}</h4>
          <div class="track-mini-bar"><div class="track-mini-fill" data-fill="${p.id}"></div></div>
        </div>
        <div class="track-tasks">
          ${p.tasks.map((t) => `
            <div class="track-task ${done.has(t.id) ? "done" : ""}" data-id="${t.id}">
              <span class="track-check">${checkSVG}</span>
              <span class="track-label">${t.label}</span>
            </div>`).join("")}
        </div>
      </div>`).join("");

    $$("#trackerList .track-task").forEach((el) =>
      el.addEventListener("click", () => toggleTask(el.dataset.id, el))
    );
    updateAllProgress();
    applyFilter();
  }

  function toggleTask(id, el) {
    if (done.has(id)) {
      done.delete(id); el.classList.remove("done");
      removeFromLog(id);
    } else {
      done.add(id); el.classList.add("done");
      logCompletion(id);
      recordActivity();
      toast(`+${XP_PER_TASK} XP · progress saved ✓`);
    }
    saveProgress();
    updateAllProgress();
  }

  function applyFilter() {
    $$("#trackerList .track-phase").forEach((ph) => {
      ph.classList.toggle("track-hidden", activeFilter !== "all" && ph.dataset.phase !== activeFilter);
    });
  }

  /* ---------------- Scoring / gamification ---------------- */
  let prevLevel = null; // avoids level-up toast on first paint

  function todayStr() { return new Date().toISOString().slice(0, 10); }
  function daysBetween(a, b) { return Math.round((new Date(b) - new Date(a)) / 86400000); }

  // Completion log maps taskId -> date, used for weekly XP.
  function logCompletion(id) { UD.log[id] = todayStr(); }
  function removeFromLog(id) { delete UD.log[id]; }

  // Monday-based start of the current week (YYYY-MM-DD).
  function weekStartStr() {
    const d = new Date();
    const day = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 10);
  }
  function weeklyXp() {
    const start = weekStartStr();
    let count = 0;
    for (const id in UD.log) if (UD.log[id] >= start && done.has(id)) count++;
    return count * XP_PER_TASK;
  }
  function getWeekTarget() {
    return Number.isFinite(UD.weekTarget) && UD.weekTarget >= 10 ? UD.weekTarget : 150;
  }

  function getStreak() { return UD.streak; }
  // Called when a task is completed — advances the daily streak.
  function recordActivity() {
    const s = UD.streak;
    const today = todayStr();
    if (s.last === today) return;
    if (s.last && daysBetween(s.last, today) === 1) s.count += 1;
    else s.count = 1;
    s.last = today;
  }

  // Reset all progress to defaults (used by the Reset button and on logout).
  function applyResetState() {
    UD = defaultUD();
    done = new Set();
    celebrated = new Set();
    prevLevel = null;
    persist();
    $$("#trackerList .track-task").forEach((el) => el.classList.remove("done"));
    const wg = $("#wgTarget"); if (wg) wg.value = UD.weekTarget;
    updateAllProgress();
    prevLevel = levelFromXp(0).level;
  }

  let celebrated = new Set(UD.celebrated);

  // Level curve: level N requires 100*N cumulative XP (triangular).
  function levelFromXp(xp) {
    let lvl = 1, need = 100, acc = 0;
    while (xp >= acc + need) { acc += need; lvl++; need = 100 * lvl; }
    return { level: lvl, floor: acc, next: acc + need };
  }

  function computeState() {
    const doneCount = done.size;
    const xp = doneCount * XP_PER_TASK;
    const pct = totalTasks ? Math.round((doneCount / totalTasks) * 100) : 0;
    const phase = {};
    TRACKER.forEach((p) => {
      const c = p.tasks.filter((t) => done.has(t.id)).length;
      phase[p.id] = p.tasks.length && c === p.tasks.length ? 1 : 0;
    });
    const streak = getStreak().count;
    return { done: doneCount, xp, pct, phase, streak };
  }

  function rankFor(pct) {
    let r = RANKS[0];
    for (const item of RANKS) if (pct >= item.min) r = item;
    return r;
  }

  function renderBadges() {
    const state = computeState();
    $("#badgesGrid").innerHTML = BADGES.map((b) => {
      const on = b.test(state);
      return `<div class="badge ${on ? "unlocked" : ""}" data-badge="${b.id}" title="${b.desc}">
        <span class="badge-ico">${on ? b.ico : "🔒"}</span>
        <span class="badge-text">
          <span class="badge-name">${b.name}</span>
          <span class="badge-desc">${b.desc}</span>
        </span>
      </div>`;
    }).join("");
  }

  /* ---------------- Weekly goal ---------------- */
  function updateWeeklyGoal() {
    const earned = weeklyXp();
    const target = getWeekTarget();
    const pct = Math.min(100, Math.round((earned / target) * 100));
    const fill = $("#wgFill");
    if (fill) fill.style.width = pct + "%";
    setText("#wgText", `${earned} / ${target} XP earned this week`);
    const status = $("#wgStatus");
    if (status) {
      if (earned >= target) { status.textContent = "Goal smashed! 🎉"; status.classList.add("done"); }
      else if (earned >= target * 0.6) { status.textContent = "Almost there 🚀"; status.classList.remove("done"); }
      else { status.textContent = "Keep going 💪"; status.classList.remove("done"); }
    }
  }

  function initWeeklyGoal() {
    const input = $("#wgTarget");
    if (!input) return;
    input.value = getWeekTarget();
    input.addEventListener("change", () => {
      let v = parseInt(input.value);
      if (!Number.isFinite(v) || v < 10) v = 10;
      v = Math.round(v / 10) * 10;
      input.value = v;
      UD.weekTarget = v;
      persist();
      updateWeeklyGoal();
    });
    updateWeeklyGoal();
  }

  /* ---------------- Notifications ---------------- */
  const NOTIF_KEY = "cloudpath.notif.v1";
  let notifEnabled = false;
  let lastNotifBlock = null; // block index we last notified for

  function initNotifications() {
    const btn = $("#notifToggle");
    if (!btn) return;
    notifEnabled = localStorage.getItem(NOTIF_KEY) === "1" && "Notification" in window && Notification.permission === "granted";
    btn.classList.toggle("on", notifEnabled);
    if (notifEnabled) lastNotifBlock = "init";

    btn.addEventListener("click", async () => {
      if (!("Notification" in window)) { toast("This browser doesn't support notifications"); return; }
      if (notifEnabled) {
        notifEnabled = false;
        localStorage.setItem(NOTIF_KEY, "0");
        btn.classList.remove("on");
        toast("Reminders off");
        return;
      }
      let perm = Notification.permission;
      if (perm !== "granted") perm = await Notification.requestPermission();
      if (perm === "granted") {
        notifEnabled = true;
        localStorage.setItem(NOTIF_KEY, "1");
        btn.classList.add("on");
        lastNotifBlock = "init"; // don't fire immediately for the current block
        toast("Reminders on 🔔");
        notify("CloudPath reminders enabled", "You'll get a nudge when your 12:00 PM learning window opens.");
      } else {
        toast("Notifications blocked in browser settings");
      }
    });
  }

  function notify(title, body) {
    if (!notifEnabled || !("Notification" in window) || Notification.permission !== "granted") return;
    try { new Notification(title, { body }); } catch {}
  }

  // Called from the clock tick with the current learning-block index (or null).
  function handleNotifications(blockIdx, isWeekend) {
    if (!notifEnabled || isWeekend || blockIdx == null) { lastNotifBlock = null; return; }
    if (lastNotifBlock === "init") { lastNotifBlock = blockIdx; return; }
    if (blockIdx !== lastNotifBlock) {
      const block = DAILY[blockIdx];
      const opener = blockIdx === 0 ? "🎓 Learning window open! " : "";
      notify(`${opener}${block.title}`, `${block.time} · ${block.desc}`);
      lastNotifBlock = blockIdx;
    }
  }

  function animateNumber(el, to) {
    if (!el) return;
    const from = parseInt(el.textContent.replace(/\D/g, "")) || 0;
    if (from === to) { el.textContent = to; return; }
    const steps = 20, diff = to - from;
    let i = 0;
    clearInterval(el._anim);
    el._anim = setInterval(() => {
      i++;
      el.textContent = Math.round(from + (diff * i) / steps);
      if (i >= steps) { clearInterval(el._anim); el.textContent = to; }
    }, 25);
  }

  function updateAllProgress() {
    const state = computeState();
    const { done: completed, xp, pct } = state;

    // Core stats
    animateNumber($("#statDays"), completed);
    $("#statPct").textContent = pct + "%";
    animateNumber($("#statScore"), xp);
    $("#opPct").textContent = pct + "%";
    $("#opFill").style.width = pct + "%";

    // Score ring (circumference = 2πr, r=52 → ~326.7)
    const C = 326.7;
    const ring = $("#srFill");
    if (ring) ring.style.strokeDashoffset = C - (C * pct) / 100;
    animateNumber($("#srScore"), xp);

    // Rank
    const rank = rankFor(pct);
    setText("#rankName", rank.name);
    setText("#rankEmoji", rank.emoji);

    // Level
    const lv = levelFromXp(xp);
    setText("#levelNum", lv.level);
    setText("#levelTitle", LEVEL_TITLES[Math.min(lv.level - 1, LEVEL_TITLES.length - 1)]);
    const span = lv.next - lv.floor;
    const into = xp - lv.floor;
    const levelPct = span ? Math.round((into / span) * 100) : 100;
    const lbf = $("#levelBarFill");
    if (lbf) lbf.style.width = levelPct + "%";
    setText("#levelXpText", `${into} / ${span} XP to Level ${lv.level + 1}`);

    // Level-up celebration
    if (prevLevel !== null && lv.level > prevLevel) {
      celebrate(`🎉 Level Up! You're now Level ${lv.level} · ${LEVEL_TITLES[Math.min(lv.level - 1, LEVEL_TITLES.length - 1)]}`);
    }
    prevLevel = lv.level;

    // Streak
    setText("#streakNum", state.streak);

    // Weekly goal
    updateWeeklyGoal();

    // Phase mini-bars
    TRACKER.forEach((p) => {
      const total = p.tasks.length;
      const c = p.tasks.filter((t) => done.has(t.id)).length;
      const fill = $(`[data-fill="${p.id}"]`);
      if (fill) fill.style.width = (total ? (c / total) * 100 : 0) + "%";
    });

    const summary = $("#trackerSummary");
    if (summary) summary.innerHTML = `<strong>${completed}</strong> / ${totalTasks} tasks · <strong>${xp}</strong> XP`;

    // Badges
    let unlocked = 0, newlyUnlocked = [];
    BADGES.forEach((b) => {
      const on = b.test(state);
      if (on) { unlocked++; if (!celebrated.has(b.id)) newlyUnlocked.push(b); }
    });
    renderBadges();
    setText("#badgesCount", `${unlocked} / ${BADGES.length} unlocked`);
    animateNumber($("#statBadges"), unlocked);

    // Badge unlock celebrations
    newlyUnlocked.forEach((b) => {
      celebrated.add(b.id);
      const el = $(`[data-badge="${b.id}"]`);
      if (el) el.classList.add("just-unlocked");
      celebrate(`🏆 Achievement unlocked: ${b.name}!`);
    });
    if (newlyUnlocked.length) persist();
  }

  /* ---------------- Navigation ---------------- */
  function initNav() {
    const links = $$(".nav-link");
    const sections = links.map((l) => $(l.getAttribute("href")));

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          const id = "#" + e.target.id;
          links.forEach((l) => l.classList.toggle("active", l.getAttribute("href") === id));
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach((s) => s && io.observe(s));

    // mobile menu
    const sidebar = $("#sidebar");
    $("#menuBtn").addEventListener("click", () => sidebar.classList.toggle("open"));
    links.forEach((l) => l.addEventListener("click", () => sidebar.classList.remove("open")));
  }

  function initScrollProgress() {
    const bar = $("#scrollProgress");
    window.addEventListener("scroll", () => {
      const h = document.documentElement;
      const scrolled = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100;
      bar.style.width = scrolled + "%";
    }, { passive: true });
  }

  /* ---------------- Theme ---------------- */
  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) document.documentElement.dataset.theme = saved;
    updateThemeIcon();
    $("#themeToggle").addEventListener("click", () => {
      const cur = document.documentElement.dataset.theme === "light" ? "dark" : "light";
      document.documentElement.dataset.theme = cur;
      localStorage.setItem(THEME_KEY, cur);
      updateThemeIcon();
    });
  }
  function updateThemeIcon() {
    $("#themeToggle .theme-ico").textContent = document.documentElement.dataset.theme === "light" ? "☀️" : "🌙";
  }

  /* ---------------- Reset ---------------- */
  function initReset() {
    $("#resetBtn").addEventListener("click", () => {
      if (!confirm("Reset all your progress? This can't be undone.")) return;
      applyResetState();
      toast("Progress reset");
    });
  }

  /* ---------------- Live time sync ---------------- */
  // Parse "H:MM" from the afternoon schedule into minutes-of-day.
  function toMinutes(str) {
    const [h, m] = str.trim().split(":").map(Number);
    const hour = h < 6 ? h + 12 : h; // schedule runs noon–3pm
    return hour * 60 + m;
  }

  // Precompute start/end minutes for each daily block.
  const DAILY_RANGES = DAILY.map((d) => {
    const [start, end] = d.time.split(/[–-]/);
    return { start: toMinutes(start), end: toMinutes(end) };
  });

  const WINDOW_START = DAILY_RANGES[0].start;                    // 12:00
  const WINDOW_END = DAILY_RANGES[DAILY_RANGES.length - 1].end;  // 15:00
  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  function fmtClock(date) {
    let h = date.getHours();
    const m = date.getMinutes();
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
  }
  function fmtRemaining(mins) {
    if (mins <= 0) return "0m";
    const h = Math.floor(mins / 60), m = mins % 60;
    return h ? `${h}h ${m}m` : `${m}m`;
  }

  function tick() {
    const now = new Date();
    const dayIdx = now.getDay();
    const isWeekend = dayIdx === 0 || dayIdx === 6;
    const mins = now.getHours() * 60 + now.getMinutes();
    const clock = fmtClock(now);

    // Sidebar mini-clock
    setText("#scTime", clock);
    // Banner clock + date
    setText("#nbTime", clock);
    setText("#nbDate", now.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" }));

    const scDot = $("#scDot");
    const scLabel = $("#scLabel");
    const badge = $("#nbBadge");
    const msg = $("#nbMsg");
    const progWrap = $("#nbProgressWrap");

    // Reset timeline highlights
    const items = $$("#dailyTimeline .tl-item");
    items.forEach((el) => el.classList.remove("now-active", "now-past"));

    let state, label, badgeText, message;
    let activeBlockIdx = null;

    if (isWeekend) {
      state = "off";
      label = "Weekend";
      badgeText = "Rest / Optional";
      message = `It's ${DAY_NAMES[dayIdx] === "Sat" ? "Saturday" : "Sunday"} — rest is productive. Only a light session if you feel fresh. 🌿`;
      hide(progWrap);
    } else if (mins < WINDOW_START) {
      state = mins >= 6 * 60 ? "job" : "off";
      label = state === "job" ? "Work" : "Off";
      badgeText = state === "job" ? "Job Hours" : "Before Work";
      const untilLearn = WINDOW_START - mins;
      message = state === "job"
        ? `Focused on job responsibilities. Learning window opens in <strong>${fmtRemaining(untilLearn)}</strong>.`
        : `Good morning! Your learning window opens at <strong>12:00 PM</strong>.`;
      hide(progWrap);
    } else if (mins >= WINDOW_START && mins < WINDOW_END) {
      state = "learn";
      label = "Learning";
      // Find the active block
      const idx = DAILY_RANGES.findIndex((r) => mins >= r.start && mins < r.end);
      activeBlockIdx = idx;
      items.forEach((el, i) => {
        if (i < idx) el.classList.add("now-past");
        else if (i === idx) el.classList.add("now-active");
      });
      const block = DAILY[idx];
      badgeText = "In Session · " + label;
      const blockEnd = DAILY_RANGES[idx].end;
      message = `Right now: <strong>${block.title}</strong> — ${fmtRemaining(blockEnd - mins)} left in this block.`;
      // Window progress
      const pct = Math.round(((mins - WINDOW_START) / (WINDOW_END - WINDOW_START)) * 100);
      show(progWrap);
      $("#nbProgressFill").style.width = pct + "%";
      setText("#nbRemaining", fmtRemaining(WINDOW_END - mins) + " left today");
    } else {
      state = "off";
      label = "Done";
      badgeText = "Session Complete";
      message = `Learning window closed for today. Great work — review your notes and plan tomorrow. ✅`;
      hide(progWrap);
    }

    // Apply visual states
    if (scDot) scDot.className = "sc-dot " + state;
    if (scLabel) scLabel.textContent = label;
    if (badge) badge.className = "nb-badge is-" + state, (badge.textContent = badgeText);
    if (msg) msg.innerHTML = message;

    // Fire reminders on block changes
    handleNotifications(activeBlockIdx, isWeekend);

    // Highlight today's weekly card
    $$("#weekGrid .day-card").forEach((c) =>
      c.classList.toggle("today", c.dataset.day === DAY_NAMES[dayIdx])
    );
  }

  function initClock() {
    tick();
    setInterval(tick, 1000);
  }

  function setText(sel, val) { const el = $(sel); if (el) el.textContent = val; }
  function show(el) { if (el) el.hidden = false; }
  function hide(el) { if (el) el.hidden = true; }

  /* ---------------- Reveal on scroll ---------------- */
  function initReveal() {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.08 });
    $$(".section > *").forEach((el) => { el.classList.add("reveal"); io.observe(el); });
  }

  /* ---------------- Toast ---------------- */
  let toastEl, toastTimer;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement("div"); toastEl.className = "toast"; document.body.appendChild(toastEl); }
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1800);
  }

  /* ---------------- Celebration ---------------- */
  let celebrateQueue = [];
  function celebrate(msg) {
    toast(msg);
    burstConfetti();
  }
  function burstConfetti() {
    const colors = ["#5b8cff", "#22d3ee", "#8b5cf6", "#34d399", "#fbbf24", "#fb7185"];
    const n = 80;
    for (let i = 0; i < n; i++) {
      const p = document.createElement("div");
      p.className = "confetti";
      p.style.left = 50 + (Math.random() * 30 - 15) + "%";
      p.style.top = "40%";
      p.style.background = colors[i % colors.length];
      const angle = Math.random() * Math.PI * 2;
      const dist = 120 + Math.random() * 260;
      p.style.setProperty("--dx", Math.cos(angle) * dist + "px");
      p.style.setProperty("--dy", Math.sin(angle) * dist + "px");
      p.style.animationDelay = Math.random() * 0.1 + "s";
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 1400);
    }
  }

  /* ---------------- Init ---------------- */
  document.addEventListener("DOMContentLoaded", () => {
    renderDaily();
    renderWeek();
    renderRoadmap();
    renderMilestones();
    renderMethod();
    renderCompetencies();
    renderMistakes();
    renderResources();
    renderTrackerFilter();
    renderTracker();
    initNav();
    initScrollProgress();
    initTheme();
    initReset();
    initReveal();
    initClock();
    initWeeklyGoal();
    initNotifications();
  });
})();
