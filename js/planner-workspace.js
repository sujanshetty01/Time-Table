/* ============================================================
   PathPilot constraint planner workspace
   ============================================================ */
(function () {
  "use strict";

  const byId = (id) => document.getElementById(id);
  const state = {
    workspace: null,
    ownerUid: null,
    result: null,
    windowStart: null,
    draggingSessionId: null,
    dragOrigin: null,
    dragActive: false,
    loading: false,
    loadGeneration: 0,
  };

  function todayKey() {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }

  function addDays(value, amount) {
    const date = new Date(`${value}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + amount);
    return date.toISOString().slice(0, 10);
  }

  function toMinutes(value, midnightAsEnd = false) {
    const [hours, minutes] = String(value || "")
      .split(":")
      .map(Number);
    if (midnightAsEnd && hours === 0 && minutes === 0) return 1440;
    return hours * 60 + minutes;
  }

  function toTime(value) {
    const minutes = (((Number(value) || 0) % 1440) + 1440) % 1440;
    return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  }

  function formatTime(value) {
    const hours = Math.floor(value / 60);
    const minutes = value % 60;
    const suffix = hours >= 12 ? "PM" : "AM";
    return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${suffix}`;
  }

  function formatDate(value, options) {
    return new Intl.DateTimeFormat("en", {
      timeZone: "UTC",
      ...options,
    }).format(new Date(`${value}T00:00:00Z`));
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(
      /[&<>"']/g,
      (character) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[character],
    );
  }

  function defaultPreferences() {
    const profile = window.PathProfile && window.PathProfile.get();
    const startDate = todayKey();
    const profileStartMin = Number(profile?.learnStartMin);
    const profileEndMin = Number(profile?.learnEndMin);
    const startMin = Number.isFinite(profileStartMin) ? profileStartMin : 720;
    const endMin = Number.isFinite(profileEndMin) ? profileEndMin : 900;
    const dailyCapMinutes = Math.min(180, endMin - startMin);
    return {
      startDate,
      deadline: addDays(startDate, 83),
      availableDays: [1, 2, 3, 4, 5],
      startMin,
      endMin,
      dailyCapMinutes,
      weeklyCapMinutes: dailyCapMinutes * 5,
    };
  }

  function applyForm(preferences) {
    byId("plannerStartDate").value = preferences.startDate;
    byId("plannerDeadline").value = preferences.deadline;
    byId("plannerStartTime").value = toTime(preferences.startMin);
    byId("plannerEndTime").value = toTime(preferences.endMin);
    byId("plannerDailyCap").value = preferences.dailyCapMinutes;
    byId("plannerWeeklyCap").value = preferences.weeklyCapMinutes;
    document.querySelectorAll("#plannerDays input").forEach((input) => {
      input.checked = preferences.availableDays.includes(Number(input.value));
    });
  }

  function readForm() {
    const availableDays = [
      ...document.querySelectorAll("#plannerDays input:checked"),
    ].map((input) => Number(input.value));
    if (availableDays.length === 0) {
      throw new Error("Choose at least one available day.");
    }
    return window.PathCore.normalizePlannerPreferences(
      {
        startDate: byId("plannerStartDate").value,
        deadline: byId("plannerDeadline").value,
        availableDays,
        startMin: toMinutes(byId("plannerStartTime").value),
        endMin: toMinutes(byId("plannerEndTime").value, true),
        dailyCapMinutes: Number(byId("plannerDailyCap").value),
        weeklyCapMinutes: Number(byId("plannerWeeklyCap").value),
      },
      todayKey(),
    );
  }

  function taskFor(taskId) {
    return state.workspace?.tasks.find((task) => task.taskId === taskId);
  }

  function setStatus(message, tone = "") {
    const status = byId("plannerStatus");
    status.textContent = message;
    status.dataset.tone = tone;
  }

  function setBusy(busy) {
    state.loading = busy;
    byId("plannerBuild").disabled = busy || !state.workspace;
    byId("plannerExport").disabled = busy || !state.result;
    byId("plannerRefresh").disabled = busy;
    byId("plannerPrev").disabled = busy || !state.result;
    byId("plannerNext").disabled = busy || !state.result;
    byId("plannerForm")
      .querySelectorAll("input, select, button")
      .forEach((control) => {
        control.disabled = busy;
      });
    byId("plannerBoard")
      .querySelectorAll("button, input")
      .forEach((control) => {
        control.disabled = busy;
      });
  }

  function buildPreview() {
    if (!state.workspace) return;
    const preferences = readForm();
    state.result = window.PathCore.planConstraintSchedule({
      tasks: state.workspace.tasks,
      sessions: state.workspace.sessions,
      completedTaskIds: state.workspace.completedTaskIds,
      preferences,
      today: todayKey(),
    });
    if (!state.windowStart) state.windowStart = preferences.startDate;
    render();
  }

  function renderMetrics() {
    const summary = state.result.summary;
    const deadline = state.result.preferences.deadline;
    byId("plannerMetrics").innerHTML = [
      [summary.scheduled, "Scheduled"],
      [summary.unscheduled, "Unscheduled"],
      [`${Math.round(summary.totalMinutes / 60)}h`, "Planned work"],
      [formatDate(deadline, { month: "short", day: "numeric" }), "Deadline"],
    ]
      .map(
        ([value, label]) =>
          `<div class="planner-metric"><strong>${escapeHtml(value)}</strong><span>${label}</span></div>`,
      )
      .join("");
  }

  function sessionCard(session) {
    const task = taskFor(session.taskId) || {};
    const taskTitle = task.title || "learning session";
    const lockLabel = `${session.locked ? "Unlock" : "Lock"} ${taskTitle}`;
    return `<article class="planner-session${session.locked ? " locked" : ""}" data-session-id="${escapeHtml(session.sessionId)}">
      <div class="planner-session-top">
        <div class="planner-drag-handle" title="Drag ${escapeHtml(taskTitle)}" aria-hidden="true"><span>⠿</span><span class="planner-phase">${escapeHtml(task.phaseTitle || "Roadmap")}</span></div>
        <button class="planner-lock" type="button" data-action="lock" data-session-id="${escapeHtml(session.sessionId)}" title="${lockLabel}" aria-label="${lockLabel}">${session.locked ? "🔒" : "🔓"}</button>
      </div>
      <h4>${escapeHtml(task.title || "Learning session")}</h4>
      <div class="planner-session-time">${formatTime(session.startMin)} · ${session.durationMin} min</div>
      <p>${escapeHtml(session.explanation)}</p>
      <label class="planner-date-edit"><span>Move to</span><input type="date" value="${session.scheduledDate}" data-action="date" data-session-id="${escapeHtml(session.sessionId)}" aria-label="Move ${escapeHtml(taskTitle)} to another date" /></label>
    </article>`;
  }

  function renderBoard() {
    const start = state.windowStart || state.result.preferences.startDate;
    const end = addDays(start, 13);
    byId("plannerRange").textContent =
      `${formatDate(start, { month: "short", day: "numeric" })} – ${formatDate(end, { month: "short", day: "numeric", year: "numeric" })}`;
    const days = Array.from({ length: 14 }, (_, index) =>
      addDays(start, index),
    );
    const availableDays = state.result.preferences.availableDays;
    byId("plannerBoard").innerHTML = days
      .map((date) => {
        const dayIndex = new Date(`${date}T00:00:00Z`).getUTCDay();
        const sessions = state.result.sessions
          .filter(
            (session) =>
              session.status === "scheduled" && session.scheduledDate === date,
          )
          .sort((left, right) => left.startMin - right.startMin);
        const rest = !availableDays.includes(dayIndex);
        const headingId = `planner-day-${date}`;
        return `<section class="planner-day${rest ? " rest" : ""}" data-date="${date}" aria-labelledby="${headingId}">
          <header><span>${formatDate(date, { weekday: "short" })}</span><h3 id="${headingId}">${formatDate(date, { month: "short", day: "numeric" })}</h3></header>
          <div class="planner-day-sessions">${sessions.map(sessionCard).join("")}</div>
          ${sessions.length === 0 ? `<div class="planner-empty-day">${rest ? "Rest day" : "Available"}</div>` : ""}
        </section>`;
      })
      .join("");
  }

  function renderInsights() {
    const conflicts = state.result.conflicts;
    const recovery = state.result.recovery;
    byId("plannerConflictCount").textContent = conflicts.length;
    byId("plannerRecoveryCount").textContent = recovery.length;
    byId("plannerConflicts").innerHTML = conflicts.length
      ? conflicts
          .map((item) => {
            const task = taskFor(item.taskId);
            return `<div class="planner-message conflict"><strong>${escapeHtml(task?.title || "Session")}</strong><p>${escapeHtml(item.reason)}</p></div>`;
          })
          .join("")
      : '<div class="planner-clear">No scheduling conflicts.</div>';
    byId("plannerRecovery").innerHTML = recovery.length
      ? recovery
          .map((item) => {
            const task = taskFor(item.taskId);
            return `<div class="planner-message recovery"><strong>${escapeHtml(task?.title || "Session")}</strong><p>${escapeHtml(item.fromDate)} → ${escapeHtml(item.toDate)}</p></div>`;
          })
          .join("")
      : '<div class="planner-clear">No missed sessions to recover.</div>';
  }

  function render() {
    if (!state.result) return;
    renderMetrics();
    renderBoard();
    renderInsights();
    setBusy(state.loading);
  }

  async function loadWorkspace() {
    const uid = window.PathAuth?.uid();
    if (!window.PathPlan || !uid) {
      setStatus("Sign in to load your active plan.");
      return;
    }
    const generation = ++state.loadGeneration;
    let outcome = null;
    setBusy(true);
    setStatus("Loading your active plan…");
    try {
      const workspace = await window.PathPlan.workspace();
      if (
        generation !== state.loadGeneration ||
        window.PathAuth?.uid() !== uid
      ) {
        return;
      }
      state.workspace = workspace;
      state.ownerUid = uid;
      const preferences = window.PathCore.normalizePlannerPreferences(
        state.workspace.preferences || defaultPreferences(),
        todayKey(),
      );
      state.workspace.preferences = preferences;
      state.windowStart = preferences.startDate;
      applyForm(preferences);
      buildPreview();
      outcome = {
        message: `${state.workspace.tasks.length} roadmap tasks loaded from revision ${state.workspace.plan.activeRevisionId}.`,
        tone: "success",
      };
    } catch (error) {
      if (
        generation !== state.loadGeneration ||
        window.PathAuth?.uid() !== uid
      ) {
        return;
      }
      state.workspace = null;
      state.ownerUid = null;
      state.result = null;
      outcome = { message: error.message, tone: "error" };
    } finally {
      if (generation === state.loadGeneration) setBusy(false);
    }
    if (outcome && generation === state.loadGeneration) {
      setStatus(outcome.message, outcome.tone);
    }
  }

  function isCurrentOperation(uid, generation, workspace) {
    return (
      window.PathAuth?.uid() === uid &&
      state.loadGeneration === generation &&
      state.ownerUid === uid &&
      state.workspace === workspace
    );
  }

  async function persistResult() {
    const uid = window.PathAuth?.uid();
    const generation = state.loadGeneration;
    const workspace = state.workspace;
    const result = state.result;
    if (!isCurrentOperation(uid, generation, workspace)) return false;
    const saved = await window.PathPlan.saveSchedule({
      planId: workspace.plan.planId,
      activeRevisionId: workspace.plan.activeRevisionId,
      preferences: result.preferences,
      sessions: result.sessions,
      plannerVersion: workspace.plannerVersion || 0,
    });
    if (!isCurrentOperation(uid, generation, workspace)) return false;
    const updates = new Map(
      result.sessions.map((session) => [session.sessionId, session]),
    );
    workspace.sessions = workspace.sessions.map(
      (session) => updates.get(session.sessionId) || session,
    );
    workspace.preferences = result.preferences;
    workspace.plannerVersion = Number.isInteger(saved?.plannerVersion)
      ? saved.plannerVersion
      : (workspace.plannerVersion || 0) + 1;
    return true;
  }

  async function commitPlan() {
    if (
      !state.workspace ||
      state.loading ||
      state.ownerUid !== window.PathAuth?.uid()
    ) {
      return;
    }
    if (!byId("plannerForm").reportValidity()) return;
    const uid = window.PathAuth?.uid();
    const generation = state.loadGeneration;
    const workspace = state.workspace;
    let outcome = null;
    setBusy(true);
    setStatus("Building a feasible schedule…");
    try {
      buildPreview();
      if (!(await persistResult())) return;
      outcome = {
        message: state.result.conflicts.length
          ? `Plan saved with ${state.result.conflicts.length} conflict${state.result.conflicts.length === 1 ? "" : "s"} to resolve.`
          : "Plan saved. Every unlocked session fits the selected constraints.",
        tone: state.result.conflicts.length ? "warning" : "success",
      };
    } catch (error) {
      if (isCurrentOperation(uid, generation, workspace)) {
        applyForm(workspace.preferences);
        state.windowStart = workspace.preferences.startDate;
        buildPreview();
        outcome = { message: error.message, tone: "error" };
      }
    } finally {
      if (isCurrentOperation(uid, generation, workspace)) {
        setBusy(false);
        render();
      }
    }
    if (outcome && isCurrentOperation(uid, generation, workspace)) {
      setStatus(outcome.message, outcome.tone);
    }
  }

  function displayedSession(sessionId) {
    return state.result?.sessions.find(
      (session) => session.sessionId === sessionId,
    );
  }

  async function updateOne(session, message) {
    if (
      !session ||
      state.loading ||
      state.ownerUid !== window.PathAuth?.uid()
    ) {
      return;
    }
    if (!byId("plannerForm").reportValidity()) return;
    const uid = window.PathAuth?.uid();
    const generation = state.loadGeneration;
    const workspace = state.workspace;
    const previousSessions = state.workspace.sessions;
    let outcome = null;
    setBusy(true);
    try {
      state.workspace.sessions = state.workspace.sessions.map((current) =>
        current.sessionId === session.sessionId
          ? { ...current, ...session }
          : current,
      );
      buildPreview();
      if (!(await persistResult())) return;
      outcome = { message, tone: "success" };
    } catch (error) {
      if (isCurrentOperation(uid, generation, workspace)) {
        workspace.sessions = previousSessions;
        buildPreview();
        outcome = { message: error.message, tone: "error" };
      }
    } finally {
      if (isCurrentOperation(uid, generation, workspace)) {
        setBusy(false);
        render();
      }
    }
    if (outcome && isCurrentOperation(uid, generation, workspace)) {
      setStatus(outcome.message, outcome.tone);
    }
  }

  function nextStart(date, sessionId, durationMin) {
    const end = state.result.sessions
      .filter(
        (session) =>
          session.sessionId !== sessionId &&
          session.status === "scheduled" &&
          session.scheduledDate === date,
      )
      .reduce(
        (latest, session) =>
          Math.max(latest, session.startMin + session.durationMin),
        state.result.preferences.startMin,
      );
    return end + durationMin <= state.result.preferences.endMin
      ? end
      : state.result.preferences.startMin;
  }

  async function moveSession(sessionId, date) {
    const session = displayedSession(sessionId);
    if (!session) return;
    const updated = {
      ...session,
      status: "scheduled",
      locked: true,
      scheduledDate: date,
      startMin: nextStart(date, sessionId, session.durationMin),
    };
    delete updated.explanation;
    await updateOne(
      updated,
      `Session moved to ${formatDate(date, { month: "short", day: "numeric" })} and locked.`,
    );
  }

  function exportCalendar() {
    if (
      !state.result ||
      state.loading ||
      state.ownerUid !== window.PathAuth?.uid()
    ) {
      return;
    }
    const calendar = window.PathCore.buildIcsCalendar({
      sessions: state.result.sessions,
      tasks: state.workspace.tasks,
      calendarName: `${state.workspace.plan.careerGoalKey} PathPilot plan`,
      calendarId: `${state.ownerUid}:${state.workspace.plan.planId}`,
    });
    const url = URL.createObjectURL(
      new Blob([calendar], { type: "text/calendar" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "pathpilot-plan.ics";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus("Calendar exported.", "success");
  }

  function dayAtPoint(clientX, clientY) {
    return document.elementFromPoint(clientX, clientY)?.closest(".planner-day");
  }

  function clearDrag() {
    document
      .querySelectorAll(".planner-session.dragging")
      .forEach((card) => card.classList.remove("dragging"));
    document
      .querySelectorAll(".planner-day.drop-target")
      .forEach((day) => day.classList.remove("drop-target"));
    state.draggingSessionId = null;
    state.dragOrigin = null;
    state.dragActive = false;
  }

  function wireEvents() {
    byId("plannerForm").addEventListener("submit", (event) => {
      event.preventDefault();
      commitPlan();
    });
    byId("plannerRefresh").addEventListener("click", loadWorkspace);
    byId("plannerExport").addEventListener("click", exportCalendar);
    byId("plannerPrev").addEventListener("click", () => {
      if (!state.result || !state.windowStart) return;
      state.windowStart = addDays(state.windowStart, -14);
      renderBoard();
    });
    byId("plannerNext").addEventListener("click", () => {
      if (!state.result || !state.windowStart) return;
      state.windowStart = addDays(state.windowStart, 14);
      renderBoard();
    });
    byId("plannerForm").addEventListener("change", () => {
      if (!state.workspace || state.loading) return;
      try {
        state.windowStart = byId("plannerStartDate").value;
        buildPreview();
        setStatus("Constraints changed. Build the plan to save this schedule.");
      } catch (error) {
        setStatus(error.message, "error");
      }
    });
    byId("plannerBoard").addEventListener("click", (event) => {
      const button = event.target.closest('[data-action="lock"]');
      if (!button) return;
      const session = displayedSession(button.dataset.sessionId);
      if (!session) return;
      const updated = { ...session, locked: !session.locked };
      delete updated.explanation;
      updateOne(
        updated,
        updated.locked
          ? "Session locked in place."
          : "Session unlocked and available for the next rebuild.",
      );
    });
    byId("plannerBoard").addEventListener("change", (event) => {
      const input = event.target.closest('[data-action="date"]');
      if (input?.value) moveSession(input.dataset.sessionId, input.value);
    });
    byId("plannerBoard").addEventListener("pointerdown", (event) => {
      if (state.loading) return;
      const handle = event.target.closest(".planner-drag-handle");
      const card = handle?.closest(".planner-session");
      if (!handle || !card || event.button !== 0) return;
      state.draggingSessionId = card.dataset.sessionId;
      state.dragOrigin = {
        pointerId: event.pointerId,
        clientX: event.clientX,
        clientY: event.clientY,
      };
      byId("plannerBoard").setPointerCapture(event.pointerId);
    });
    byId("plannerBoard").addEventListener("pointermove", (event) => {
      if (!state.dragOrigin || state.dragOrigin.pointerId !== event.pointerId) {
        return;
      }
      const distance = Math.hypot(
        event.clientX - state.dragOrigin.clientX,
        event.clientY - state.dragOrigin.clientY,
      );
      if (!state.dragActive && distance < 6) return;
      state.dragActive = true;
      event.preventDefault();
      document
        .querySelectorAll(".planner-day.drop-target")
        .forEach((day) => day.classList.remove("drop-target"));
      dayAtPoint(event.clientX, event.clientY)?.classList.add("drop-target");
      document
        .querySelector(
          `.planner-session[data-session-id="${CSS.escape(state.draggingSessionId)}"]`,
        )
        ?.classList.add("dragging");
    });
    byId("plannerBoard").addEventListener("pointerup", (event) => {
      if (!state.dragOrigin || state.dragOrigin.pointerId !== event.pointerId) {
        return;
      }
      const sessionId = state.draggingSessionId;
      const day = state.dragActive
        ? dayAtPoint(event.clientX, event.clientY)
        : null;
      clearDrag();
      if (sessionId && day) moveSession(sessionId, day.dataset.date);
    });
    byId("plannerBoard").addEventListener("pointercancel", clearDrag);
    window.addEventListener("pathpilot:plan-ready", loadWorkspace);
    const clearWorkspace = (message) => {
      state.loadGeneration += 1;
      state.workspace = null;
      state.ownerUid = null;
      state.result = null;
      clearDrag();
      byId("plannerBoard").innerHTML = "";
      byId("plannerMetrics").innerHTML = "";
      setBusy(false);
      setStatus(message);
    };
    window.addEventListener("pathpilot:account-changed", (event) => {
      clearWorkspace(
        event.detail?.uid
          ? "Waiting for your active plan…"
          : "Sign in to load your active plan.",
      );
    });
    window.addEventListener("pathpilot:signed-out", () =>
      clearWorkspace("Sign in to load your active plan."),
    );
  }

  document.addEventListener("DOMContentLoaded", () => {
    wireEvents();
    setBusy(false);
    if (window.PathAuth?.uid()) loadWorkspace();
  });
})();
