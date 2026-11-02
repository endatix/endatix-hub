# Contributing to Endatix Hub

Thank you for helping. This page says how to name a branch and a pull request. Setup and running the project are in the [README](README.md); the coding rules that people and agents follow are in [AGENTS.md](AGENTS.md).

## Start from an issue

Every pull request closes an issue in this repository. Find one, or [open one](../../issues/new/choose), before you start, so the change is agreed first. Put `Closes #<issue>` in the pull request body.

## Branch names

```text
<type>/h<issue>-<slug>
```

For example `feat/h1156-test-inspector-gate`. `<type>` is one of the title types below, and `<slug>` is a few lowercase words joined by dashes.

## Pull request titles

Pull requests are squash-merged, so the title becomes the commit on `main` and feeds the release notes. Use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) with the issue key as the scope:

```text
<type>(h<issue>): <subject>
```

- **Type:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, or `revert`.
- **Scope:** `h` and the issue number, for example `feat(h1156): replace the test badge with the Test inspector for testers` for #1156. Dependency bumps use `deps` or `deps-dev` instead, as Dependabot does: `chore(deps): bump …`.
- **Subject:** imperative, says what changes for the user, and has no trailing period.

## Pull request body

Fill in the [pull request template](.github/PULL_REQUEST_TEMPLATE.md): what changed and why, the issue it closes, and how you tested it.
