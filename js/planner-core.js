(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.PathCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function shortRange(startMin, endMin) {
    const format = (value) => {
      const hours = Math.floor(value / 60) % 24;
      const minutes = value % 60;
      return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")}`;
    };
    return `${format(startMin)}–${format(endMin)}`;
  }

  function allocateDurations(templates, totalMinutes) {
    const minimum = 10;
    if (totalMinutes < templates.length * minimum) {
      throw new RangeError(
        `Learning window must be at least ${templates.length * minimum} minutes.`,
      );
    }

    const weights = templates.map((template) => {
      const parsed = Number.parseInt(template.dur, 10);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
    });
    const durations = Array(templates.length).fill(0);
    let remaining = totalMinutes;
    let active = templates.map((_, index) => index);

    while (active.length) {
      const weightTotal = active.reduce(
        (sum, index) => sum + weights[index],
        0,
      );
      const constrained = active.filter(
        (index) => (remaining * weights[index]) / weightTotal < minimum,
      );
      if (constrained.length) {
        constrained.forEach((index) => {
          durations[index] = minimum;
          remaining -= minimum;
        });
        active = active.filter((index) => !constrained.includes(index));
        continue;
      }

      const exact = active.map(
        (index) => (remaining * weights[index]) / weightTotal,
      );
      active.forEach((index, position) => {
        durations[index] = Math.floor(exact[position]);
      });
      let remainder =
        remaining - active.reduce((sum, index) => sum + durations[index], 0);
      active
        .map((index, position) => ({ index, fraction: exact[position] % 1 }))
        .sort(
          (left, right) =>
            right.fraction - left.fraction || left.index - right.index,
        )
        .forEach(({ index }) => {
          if (remainder > 0) {
            durations[index] += 1;
            remainder -= 1;
          }
        });
      break;
    }

    return durations;
  }

  function buildSchedule(templates, startMin, endMin) {
    if (!Array.isArray(templates) || templates.length === 0) return [];
    if (
      !Number.isInteger(startMin) ||
      !Number.isInteger(endMin) ||
      endMin <= startMin
    ) {
      throw new TypeError(
        "Learning window must use increasing integer minute values.",
      );
    }

    const durations = allocateDurations(templates, endMin - startMin);
    let cursor = startMin;
    return templates.map((template, index) => {
      const blockStart = cursor;
      const blockEnd = blockStart + durations[index];
      cursor = blockEnd;
      return {
        ...template,
        startMin: blockStart,
        endMin: blockEnd,
        time: shortRange(blockStart, blockEnd),
        dur: `${durations[index]} min`,
      };
    });
  }

  function computeProgress(phases, completedIds, xpPerTask) {
    const completed =
      completedIds instanceof Set ? completedIds : new Set(completedIds || []);
    const tasks = phases.flatMap((phase) => phase.tasks);
    const activeIds = new Set(tasks.map((task) => task.id));
    const done = [...completed].filter((id) => activeIds.has(id)).length;
    const total = tasks.length;
    const phase = {};
    phases.forEach((item) => {
      const phaseDone = item.tasks.filter((task) =>
        completed.has(task.id),
      ).length;
      phase[item.id] =
        item.tasks.length > 0 && phaseDone === item.tasks.length ? 1 : 0;
    });
    return {
      done,
      xp: done * xpPerTask,
      pct: total ? Math.round((done / total) * 100) : 0,
      phase,
    };
  }

  return { buildSchedule, computeProgress };
});
