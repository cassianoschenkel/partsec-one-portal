# Automatic descriptions for Claude-authored PRs

The standalone workflow `.github/workflows/pr-description.yml` updates an empty/template-only PR body when the repository owner opens a PR against `main` from the exact branch pattern `claude/issue-N-YYYYMMDD-HHMM`.

It does **not** run Claude itself: Claude prepares the Markdown in its final comment on Issue #N between `<!-- PARTSEC_PR_BODY_START -->` and `<!-- PARTSEC_PR_BODY_END -->` (see `CLAUDE.md`). On the PR `opened` event, the workflow fetches that Issue and accepts only comments authored by `claude[bot]` which mention the PR branch. If missing, it leaves the PR unchanged for manual editing.

## Safety boundaries

- The original Claude workflow is unchanged and remains read-only for PRs.
- The new workflow uses `pull_request_target`, **without checking out the PR branch**, and runs trusted JavaScript embedded in the workflow from the base branch. Never add checkout/exec of PR code to it.
- Only the repo owner may trigger it; source Issue must also belong to the owner; no forks; target must be `main`; branch must match exact naming format.
- It has only `issues: read` and `pull-requests: write` permissions. It cannot merge PRs, apply migrations, deploy or change source code.
- It does not overwrite a substantive description, and it only accepts a complete body with all eight sections from the existing template.
- It runs **only when a PR is opened**. Subsequent edits are manual; a PR opened before this workflow is merged will not be retroactively changed.
- `Closes #N` is appended if absent. CI and human review remain mandatory; the handoff's test claims are not re-verified by this workflow.
- If the action or markers fail, manually fill the body from the Issue comment instead of relaxing these guards.

## Manual verification after merge of this workflow

1. Have Claude complete a new Issue and inspect its bot comment for the two exact markers and full Markdown, including the feature branch.
2. Open the linked PR **without filling the GitHub default PR template manually**; confirm the workflow updates the description.
3. Test a PR with an already-written description and confirm it is not overwritten; test a PR from a non-Claude branch and confirm that the job is skipped.
4. Review CI separately and merge only by explicit human action.

This is documentation automation, **not** approval/merge automation.
