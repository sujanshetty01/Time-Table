# PathPilot Plan Model

This document describes the versioned Firestore plan model implemented in the current static PathPilot client. It is the persistence foundation for the later constraint-based planner; it does not claim to schedule around deadlines or conflicts yet.

## Document Layout

```text
users/{uid}
  settings/main
    activePlanId
    weekTarget

  plans/{planId}
    schemaVersion: 2
    templateId
    templateVersion
    careerGoalKey
    cloud
    activeRevisionId
    latestRevisionNumber
    sourceHash
    migrationSource

    revisions/{revisionId}
      revisionNumber
      previousRevisionId
      restoredRevisionId
      reason
      taskIds[]
      sessionIds[]
      chunkIds[]
      preservedCompletedTaskIds[]

      chunks/chunk-000 ... chunk-008
        ordinal
        sourceHash
        taskIds[]
        templateTaskIds[]
        titles[]
        phaseIds[]
        phaseTitles[]
        dependencyIds[]
        estimatedMinutes[]
        sessionIds[]
        statuses[]
        locks[]
        scheduledDates[]
        startMinutes[]
        durationMinutes[]

    tasks/{taskId}
      templateTaskId
      phaseId
      order
      dependencyIds[]
      estimatedMinutes
      activeRevisionId
      definitionChunkId
      definitionIndex
      firstRevisionId

    sessions/{sessionId}
      taskId
      ordinal
      status
      locked
      scheduledDate
      startMin
      durationMin
      activeRevisionId
      definitionChunkId
      definitionIndex
      firstRevisionId
```

    Each revision has exactly nine immutable columnar chunks, and each chunk contains at most eight task/session pairs. All arrays in a chunk have the same length, yielding a hard maximum of 72 tasks per plan. A task's absolute order is `chunk.ordinal * 8 + definitionIndex`; `null` in `dependencyIds` represents no predecessor. Keeping values in bounded primitive arrays lets Firestore Rules validate every field without iterating nested maps or exceeding the rules expression budget.

    The immutable chunks are the historical source of truth. The plan-level task and session subcollections are optional materialized caches for the active revision and later interactive scheduling. Each cache document records its chunk and array index, and Rules require its definition to match those authoritative columns. Missing cache documents do not invalidate an otherwise complete revision.

`taskProgress/main` remains the source of truth for completion, streak, and XP data. Plan migration and rollback read it from Firestore when available and never remove IDs from that document.

## Identity And Mapping

- A user plan ID is deterministic for a career/cloud pair: `plan-{careerGoalKey}-{cloud}`.
- `templateId` explicitly records which curated template produced the user plan, independently of the user's career/cloud plan identity. Until a dedicated GCP cloud-architect template exists, a GCP-selected plan records `cloud-architect:Azure` as its resolved template while retaining the user's GCP plan ID and legacy-compatible task IDs.
- Template tasks use semantic keys based on phase, month, task role, and an authored or content-derived lab key. Inserting or reordering tasks does not change existing IDs.
- Every shipped roadmap has a frozen semantic-key-to-legacy-ID order, so all current completion data remains valid while positional identity is retired.
- New tasks that are not in that compatibility table use the semantic key namespaced by goal and, where applicable, cloud.
- The first session for a task uses `{taskId}::1`. Later planning may add more ordinals without replacing existing IDs.
- A conservative dependency DAG links each task to the preceding task. The future planner may enrich these edges, but it must continue to reject missing dependencies and cycles.

## Revisions

Revisions are append-only. Creating or activating a revision is one Firestore batch that writes:

1. The plan root with the new `activeRevisionId` and incremented `latestRevisionNumber`.
2. The immutable revision document and all nine immutable definition chunks.
3. New or updated optional materialized task and session definitions.
4. `settings/main.activePlanId`.

Security rules reject a plan root unless its active revision and all nine chunks exist after the same atomic write and match the revision number, source hash, chunk IDs, and ordinals. New-definition chunks validate every bounded column entry, including absolute task order, predecessor dependency, session identity, schedule fields, and duration. Existing revision documents and chunks cannot be changed or deleted.

At the 72-task maximum, a complete activation writes 156 documents: one plan, one revision, nine chunks, 72 task caches, 72 session caches, and settings. This remains below Firestore's 500-write batch limit. Removed tasks and sessions remain in their cache subcollections, while the active revision's frozen chunks determine the current plan. An older revision therefore remains restorable even after a later template overwrites a materialized definition with the same ID.

## Migration

On the first authenticated load after this release:

1. The roadmap is resolved directly from the normalized queued profile, independent of mutable UI state.
2. PathPilot derives a deterministic plan snapshot from the current tracker.
3. Firestore completion IDs, or local IDs only when no cloud progress document exists, are intersected with the snapshot and recorded as `preservedCompletedTaskIds`.
4. A `legacy-migration` revision is created when the old `plans/active` pointer exists.
5. Existing task/session records are reused, including lock and schedule fields.
6. The old pointer remains readable and temporarily writable for rollout compatibility.

The migration is idempotent: when `sourceHash` already matches, no revision is added.

## Rollback

`window.PathPlan.rollback(revisionId)` restores a prior snapshot by appending a new revision whose `restoredRevisionId` points to the target. The target's nine frozen chunks are cloned into the rollback revision and rematerialized in the plan cache subcollections. Rules compare each rollback chunk to its historical source as a whole document, allowing only the new revision ID and timestamp to differ. Rollback does not edit historical revisions or delete progress. The plan root, rollback revision, and chunks are activated atomically in the same batch.

## Planner Boundary

The current model creates unscheduled session placeholders and a deterministic prerequisite chain. It does not yet calculate dates, workload limits, rest days, deadline feasibility, missed-session recovery, or conflict explanations. Those behaviors belong to the constraint planner and will update stable session records rather than replace the identity model.