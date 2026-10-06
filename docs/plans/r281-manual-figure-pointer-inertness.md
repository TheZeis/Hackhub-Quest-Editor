# r281 — Keep fixed manual illustrations inert to pointer input

**Status: implemented on 2026-10-07.** Zeis found that clicking an inline
illustration with a pictured dialog (for example, the export report) could
activate the dialog's embedded Close control and change the scene.

All inline scene iframes and larger-view iframes now use
`pointer-events: none`. The diagrams remain visible and their parent-page
captions/descriptions remain available. On the 11 eligible wide scenes, the
separate overlay and **View larger** button still receive the input and open the
gallery; on other scenes, a click no longer interacts with the pictured editor.

The offline renderer smoke checks that both iframe CSS rules remain inert and
continues to exercise the gallery in HTTP and `file://` contexts. Verification:

- `npm run gen:manual`: passed; all 88 scenes rendered, all 88 references across
  51 pages remain intact, and 0 pages needed regeneration.
- G8: 30 tests passed; 88 rendered figures and 0 missing raster captures.
- `npm run typecheck`: passed.
- `npm run build`: passed; Vite emitted its existing large-chunk warning.
- `npm audit`: 0 vulnerabilities.

The full 1,848-test suite was not rerun for this static CSS/smoke-test follow-up;
it remains green from r279. No editor build stamp changed; `EDITOR_BUILD` remains
`2026-10-03.r267`.
