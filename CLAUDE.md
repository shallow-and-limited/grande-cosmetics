# Grande Cosmetics — Shopify themes

`storefront/` is the US theme (grandecosmetics.com). `storefront-uk/` is the UK theme.

## Never run `shopify theme check` on these themes

Do not run `shopify theme check` against `storefront/` or `storefront-uk/` — not with
`--path`, not from inside the directory, not bundled into a "just verify it quickly" step,
and not as a background task. A deny rule in `.claude/settings.json` blocks the common
invocations; this rule covers the forms a permission pattern can't catch.

Why: it is slow (it has hung with no output past a 5-minute timeout), and when it does
finish, the output is dominated by hundreds of pre-existing `MatchingTranslations` offences
across `locales/*.json` that have nothing to do with whatever change is being made. It
produces no usable signal on these themes.

### Validate theme edits this way instead

- **Inline JavaScript** — extract the `<script>` body and run `node --check` on it. Where a
  snippet's JS is wrapped in Liquid conditionals, check each render variant (all flags on,
  all flags off) separately.
- **Liquid structure** — count matching tag pairs: `{% if %}`/`{% endif %}`,
  `{% comment %}`/`{% endcomment %}`. Avoid nesting other tags inside a `{% comment %}`
  block; a comment block swallows them, so they read as noise at best.
- **Line endings** — the working tree is CRLF, the index is LF (`core.autocrlf=true`, no
  `.gitattributes`). MSYS `sed`/`awk`/`grep`/`cat -A` translate line endings inconsistently
  here and will mislead you. `git ls-files --eol <path>` is the only reliable check (and is
  read-only); it should report `i/lf w/crlf`. The fix after splicing a file — `git add`,
  then `rm` + `git checkout --` to re-apply the smudge filter — stages the file, so say so
  when you use it.
- **Real behavior** — preview on a theme preview URL, never the theme editor. Osano (the
  CMP) is guarded behind `request.design_mode == false`, so inside the customizer there is
  no consent signal at all and every consent-gated marketing tag correctly loads nothing.
  That is expected, not a bug.

## Git is handled by the repo owner — don't manage it

Make edits in the working tree and report what changed. Assume the owner is handling all
version control themselves. Unless they explicitly ask in that message, do not:

- create, switch, rename, or delete branches (including "branch first before editing on
  `main`" — editing directly on `main` is fine here)
- commit, amend, stash, push, pull, merge, rebase, cherry-pick, or reset
- open, update, or comment on pull requests

Read-only git is fine and often useful — `git status`, `git log`, `git diff`,
`git ls-files --eol`, `git show` — as is reading history to answer a question.

Two consequences worth internalizing:

- **Don't narrate branch state.** No "I've put this on a branch", no "this is unpushed", no
  speculating about what should be committed. If asked where something stands, run
  `git status` and report what it says.
- **The tree may move under you.** Theme pulls, commits, merges and branch switches happen
  outside the session, so files can change between turns. After any gap, re-check the files
  you care about rather than trusting what you remember writing — a `shopify theme pull`
  overwrites theme files from the live store and can silently revert local work.
