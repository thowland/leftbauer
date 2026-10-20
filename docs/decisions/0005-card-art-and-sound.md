# ADR-0005: Card art and sound sources

**Status:** Accepted
**Date:** 2026-10-20
**Sprint:** 6

## Context

VP-2 and SA-2 call for open-licensed card art and sound effects, compatible with GPL-3.0 and recorded in the About screen and `CREDITS.md`. Implementation Plan §3 left both choices open until Sprint 6.

## Decisions

1. **Card art is drawn in code.** The SVG faces from Sprint 1 are kept and refined (pip layouts, court-card emblems) rather than replaced by an open-licensed deck. There is nothing to license, the faces stay crisp at any size, and the four-color deck (VP-3) remains a palette change in the manifest. (Decided by the product owner, 2026-10-20.)
2. **Sound effects come from Kenney's CC0 packs**: *Casino Audio* for the shuffle, deal, card and sweep sounds, and *Music Jingles* for the trump call, the euchre sting and the loner or march flourish. CC0 needs no attribution, but both packs are credited anyway. (Decided by the product owner, 2026-10-20.)
3. **Sounds ship as small mono MP3s** in `public/sounds/`, trimmed and loudness-normalized with ffmpeg (about 76 KB in all). MP3 decodes everywhere `decodeAudioData` runs, including iOS Safari, which does not reliably decode the packs' original Ogg Vorbis.
4. **Components never name sound files.** `assets/manifest.ts` maps each `SoundId` to its file, gain and credit, so the sounds can be replaced without touching `audio/` or the UI.

## Consequences

- `CREDITS.md` lists both packs and their license; the About screen (Sprint 8) reads the same `CREDITS` data from the manifest.
- The illustrated Bauer deck planned for later replaces `Card.tsx`'s face drawing behind the same `Card` component.
