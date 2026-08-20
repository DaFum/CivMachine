@AGENTS.md

## Claude-specific

`AGENTS.md` is the source of truth at every level. The `CLAUDE.md` beside each nested `AGENTS.md` is
a symlink to it, because Claude Code discovers nested `CLAUDE.md` while other agents read
`AGENTS.md` — edit the `AGENTS.md`, never the link, so the two can't diverge.

Nested rules load when you touch files in that directory, so read them there rather than restating
them here.
