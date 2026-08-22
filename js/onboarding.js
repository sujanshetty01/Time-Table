/* ============================================================
   onboarding.js — intelligent onboarding wizard
   Collects the user's profile, personalizes the schedule, and
   persists via window.PathProfile.apply(profile, {save:true}).
   ============================================================ */
(function () {
  "use strict";

  const GOALS = [
    { key: "cloud-architect", label: "Cloud Architect", icon: "☁️" },
    { key: "ai-engineer", label: "AI Engineer", icon: "🤖" },
    { key: "devops-engineer", label: "DevOps Engineer", icon: "⚙️" },
    { key: "data-engineer", label: "Data Engineer", icon: "🗄️" },
    { key: "cybersecurity-engineer", label: "Cybersecurity Engineer", icon: "🛡️" },
    { key: "backend-engineer", label: "Backend Engineer", icon: "🧩" },
  ];
  const CLOUDS = ["Azure", "AWS", "GCP"];
  const LEVELS = ["Beginner", "Intermediate", "Advanced"];
  const STYLES = ["Videos", "Documentation", "Hands-on Labs", "Courses", "Reading"];

  function toMin(t) { // "HH:MM" -> minutes
    if (!t) return null;
    const [h, m] = t.split(":").map(Number);
    return h * 60 + (m || 0);
  }
  function toTime(min) {
    if (!Number.isFinite(min)) return "";
    const h = Math.floor(min / 60), m = min % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  let step = 0;
  let draft = {};
  let firstRun = false;
  let lastFocus = null;

  function onKey(e) {
    if (e.key === "Escape" && !firstRun) close();
  }

  function open(existing, opts) {
    firstRun = !!(opts && opts.first);
    draft = existing ? { ...existing } : defaults();
    step = 0;
    ensureDom();
    lastFocus = document.activeElement;
    document.getElementById("obOverlay").classList.add("show");
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    render();
  }
  function close() {
    const o = document.getElementById("obOverlay");
    if (o) o.classList.remove("show");
    document.body.style.overflow = "";
    document.removeEventListener("keydown", onKey);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function defaults() {
    return {
      fullName: "", careerGoalKey: "cloud-architect", careerGoalLabel: "Cloud Architect",
      currentRole: "", yearsExp: 0, skillLevel: "Beginner",
      workStartMin: 6 * 60, workEndMin: 15 * 60,
      learnStartMin: 12 * 60, learnEndMin: 15 * 60,
      afterStartMin: 19 * 60, afterHours: 0,
      learningStyles: ["Hands-on Labs", "Documentation"],
      cloud: "Azure", targetCert: "", timelineMonths: 12, interests: [],
    };
  }

  const STEPS = [
    { title: "About you", render: stepAbout },
    { title: "Your goal", render: stepGoal },
    { title: "Your schedule", render: stepSchedule },
    { title: "Review & generate", render: stepReview },
  ];

  function render() {
    const body = document.getElementById("obBody");
    const s = STEPS[step];
    document.getElementById("obStepTitle").textContent = s.title;
    document.getElementById("obDots").innerHTML = STEPS.map((_, i) =>
      `<span class="ob-dot ${i === step ? "active" : ""} ${i < step ? "done" : ""}"></span>`).join("");
    body.innerHTML = s.render();
    wireStep();
    // Move focus to the first control of this step for keyboard/screen-reader users.
    const first = body.querySelector("input, select, button");
    if (first) first.focus();
    document.getElementById("obBack").style.visibility = step === 0 ? "hidden" : "visible";
    document.getElementById("obNext").textContent = step === STEPS.length - 1 ? "Generate my plan ✨" : "Continue";
    document.getElementById("obSkip").style.display = firstRun ? "none" : "inline";
  }

  /* ---- Steps ---- */
  function field(label, inner, hint) {
    return `<label class="ob-field"><span class="ob-label">${label}</span>${inner}${hint ? `<span class="ob-hint">${hint}</span>` : ""}</label>`;
  }

  function stepAbout() {
    return `
      ${field("Full name", `<input id="f_name" class="ob-input" value="${esc(draft.fullName)}" placeholder="e.g. Sujan Shetty" />`)}
      ${field("Current role", `<input id="f_role" class="ob-input" value="${esc(draft.currentRole)}" placeholder="e.g. Network Engineer" />`)}
      <div class="ob-row">
        ${field("Years of experience", `<input id="f_exp" type="number" min="0" max="50" class="ob-input" value="${draft.yearsExp}" />`)}
        ${field("Skill level", select("f_level", LEVELS, draft.skillLevel))}
      </div>`;
  }

  function stepGoal() {
    return `
      ${field("Career goal", `<div class="ob-goals" id="f_goals">${GOALS.map((g) =>
        `<button type="button" class="ob-goal ${g.key === draft.careerGoalKey ? "sel" : ""}" data-key="${g.key}" data-label="${g.label}"><span>${g.icon}</span>${g.label}</button>`).join("")}</div>`)}
      <div class="ob-row">
        ${field("Preferred cloud", select("f_cloud", CLOUDS, draft.cloud))}
        ${field("Target timeline (months)", `<input id="f_timeline" type="number" min="1" max="36" class="ob-input" value="${draft.timelineMonths}" />`)}
      </div>
      ${field("Target certification", `<input id="f_cert" class="ob-input" value="${esc(draft.targetCert)}" placeholder="e.g. AZ-305 / AWS SA Pro" />`)}
      ${field("Areas of interest", `<input id="f_interests" class="ob-input" value="${esc((draft.interests || []).join(", "))}" placeholder="e.g. networking, security, Kubernetes" />`, "Comma-separated")}`;
  }

  function stepSchedule() {
    return `
      <div class="ob-row">
        ${field("Work start", `<input id="f_ws" type="time" class="ob-input" value="${toTime(draft.workStartMin)}" />`)}
        ${field("Work end", `<input id="f_we" type="time" class="ob-input" value="${toTime(draft.workEndMin)}" />`)}
      </div>
      ${field("Learning window during work", `<div class="ob-row2">
          <input id="f_ls" type="time" class="ob-input" value="${toTime(draft.learnStartMin)}" />
          <span class="ob-to">to</span>
          <input id="f_le" type="time" class="ob-input" value="${toTime(draft.learnEndMin)}" />
        </div>`, "Your daily timetable is built from this window")}
      <div class="ob-row">
        ${field("After-work start", `<input id="f_as" type="time" class="ob-input" value="${toTime(draft.afterStartMin)}" />`)}
        ${field("After-work hours", `<input id="f_ah" type="number" min="0" max="6" step="0.5" class="ob-input" value="${draft.afterHours}" />`)}
      </div>
      ${field("Preferred learning styles", `<div class="ob-chips" id="f_styles">${STYLES.map((s) =>
        `<button type="button" class="ob-chip ${(draft.learningStyles || []).includes(s) ? "sel" : ""}" data-v="${s}">${s}</button>`).join("")}</div>`)}`;
  }

  function stepReview() {
    const g = draft;
    const win = `${toTime(g.learnStartMin)}–${toTime(g.learnEndMin)}`;
    return `
      <div class="ob-review">
        <div class="ob-rev-row"><span>Name</span><b>${esc(g.fullName) || "—"}</b></div>
        <div class="ob-rev-row"><span>Goal</span><b>${esc(g.careerGoalLabel)} · ${esc(g.cloud)}</b></div>
        <div class="ob-rev-row"><span>Level · Experience</span><b>${esc(g.skillLevel)} · ${g.yearsExp} yrs</b></div>
        <div class="ob-rev-row"><span>Learning window</span><b>${win}</b></div>
        <div class="ob-rev-row"><span>After-work</span><b>${g.afterHours} h from ${toTime(g.afterStartMin)}</b></div>
        <div class="ob-rev-row"><span>Target</span><b>${esc(g.targetCert) || "—"} in ${g.timelineMonths} mo</b></div>
        <div class="ob-rev-row"><span>Styles</span><b>${(g.learningStyles || []).join(", ") || "—"}</b></div>
      </div>
      <p class="ob-note">We'll generate your daily timetable, weekly plan, and roadmap from this. You can change it anytime from the sidebar — your progress is preserved.</p>`;
  }

  function select(id, opts, val) {
    return `<select id="${id}" class="ob-input">${opts.map((o) => `<option ${o === val ? "selected" : ""}>${o}</option>`).join("")}</select>`;
  }
  function esc(s) { return String(s == null ? "" : s).replace(/"/g, "&quot;").replace(/</g, "&lt;"); }

  /* ---- Capture step values into draft ---- */
  function captureStep() {
    const v = (id) => { const e = document.getElementById(id); return e ? e.value : undefined; };
    if (step === 0) {
      draft.fullName = v("f_name") || "";
      draft.currentRole = v("f_role") || "";
      draft.yearsExp = parseInt(v("f_exp")) || 0;
      draft.skillLevel = v("f_level") || "Beginner";
    } else if (step === 1) {
      draft.cloud = v("f_cloud") || "Azure";
      draft.timelineMonths = parseInt(v("f_timeline")) || 12;
      draft.targetCert = v("f_cert") || "";
      draft.interests = (v("f_interests") || "").split(",").map((s) => s.trim()).filter(Boolean);
    } else if (step === 2) {
      draft.workStartMin = toMin(v("f_ws"));
      draft.workEndMin = toMin(v("f_we"));
      draft.learnStartMin = toMin(v("f_ls"));
      draft.learnEndMin = toMin(v("f_le"));
      draft.afterStartMin = toMin(v("f_as"));
      draft.afterHours = parseFloat(v("f_ah")) || 0;
    }
  }

  function wireStep() {
    // goal selector
    const goals = document.getElementById("f_goals");
    if (goals) goals.querySelectorAll(".ob-goal").forEach((b) =>
      b.addEventListener("click", () => {
        goals.querySelectorAll(".ob-goal").forEach((x) => x.classList.remove("sel"));
        b.classList.add("sel");
        draft.careerGoalKey = b.dataset.key;
        draft.careerGoalLabel = b.dataset.label;
      }));
    // style chips
    const styles = document.getElementById("f_styles");
    if (styles) styles.querySelectorAll(".ob-chip").forEach((b) =>
      b.addEventListener("click", () => {
        b.classList.toggle("sel");
        const set = new Set(draft.learningStyles || []);
        b.classList.contains("sel") ? set.add(b.dataset.v) : set.delete(b.dataset.v);
        draft.learningStyles = [...set];
      }));
  }

  function validateStep() {
    if (step === 0 && !draft.fullName.trim()) return "Please enter your name.";
    if (step === 2) {
      if (!Number.isFinite(draft.learnStartMin) || !Number.isFinite(draft.learnEndMin) || draft.learnEndMin <= draft.learnStartMin)
        return "Set a valid learning window (end after start).";
    }
    return null;
  }

  function next() {
    captureStep();
    const err = validateStep();
    const e = document.getElementById("obError");
    if (err) { if (e) e.textContent = err; return; }
    if (e) e.textContent = "";
    if (step < STEPS.length - 1) { step++; render(); return; }
    finish();
  }
  function back() { captureStep(); if (step > 0) { step--; render(); } }

  function finish() {
    draft.onboardedAt = draft.onboardedAt || new Date().toISOString();
    if (window.PathProfile) window.PathProfile.apply(draft, { save: true });
    close();
    if (window.__toast) window.__toast("Your plan is personalized ✨");
  }

  /* ---- DOM shell ---- */
  function ensureDom() {
    if (document.getElementById("obOverlay")) return;
    const el = document.createElement("div");
    el.id = "obOverlay";
    el.className = "ob-overlay";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-label", "Personalize your learning plan");
    el.innerHTML = `
      <div class="ob-card">
        <div class="ob-head">
          <div>
            <div class="ob-kicker">Personalize your roadmap</div>
            <h2 class="ob-title" id="obStepTitle">About you</h2>
          </div>
          <div class="ob-dots" id="obDots"></div>
        </div>
        <div class="ob-body" id="obBody"></div>
        <div class="ob-error" id="obError"></div>
        <div class="ob-actions">
          <button class="ob-btn ghost" id="obBack">Back</button>
          <div class="ob-actions-right">
            <button class="ob-btn text" id="obSkip">Skip for now</button>
            <button class="ob-btn primary" id="obNext">Continue</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(el);
    document.getElementById("obNext").addEventListener("click", next);
    document.getElementById("obBack").addEventListener("click", back);
    document.getElementById("obSkip").addEventListener("click", close);
  }

  window.Onboarding = { open, close };
})();
