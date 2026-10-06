function escapeAttribute(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function escapeText(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

/**
 * Shared parent-page markup for code-rendered illustrations.
 *
 * `description` is the former image alt text, moved into visible page text so
 * it remains available to readers, search and print. `captionHtml` is the
 * existing figcaption content and may contain the handbook's inline emphasis.
 */
export function renderFigureMarkup(sceneId, scene, description, captionHtml, rendererSrc) {
    if (!scene || !sceneId || !description?.trim() || !captionHtml?.trim()) {
        throw new Error(`Cannot render manual figure markup for ${sceneId || "(no scene id)"}: scene, description and caption are required.`);
    }
    if (!Number.isFinite(scene.width) || !Number.isFinite(scene.height) || scene.width < 1 || scene.height < 1) {
        throw new Error(`Manual figure ${sceneId} has invalid dimensions.`);
    }
    if (!rendererSrc) throw new Error(`Manual figure ${sceneId} has no local renderer URL.`);

    const captionId = `figure-caption-${sceneId}`;
    const accessibleTitle = `Code-rendered editor illustration: ${scene.title}${scene.stillMoment ? " — still illustration" : ""}`;
    const stillNote = scene.stillMoment
        ? `\n    <span class="manual-figure__still-note">${escapeText(scene.stillNote || "Still illustration; this is a fixed view, not a live interaction.")}</span>`
        : "";
    const ratio = (scene.width / scene.height).toFixed(6);

    return `<figure id="figure-${escapeAttribute(sceneId)}" class="manual-figure" data-manual-figure data-scene-id="${escapeAttribute(sceneId)}">
  <div class="manual-figure__stage" style="--figure-width:${scene.width}px;--figure-height:${scene.height}px;--figure-ratio:${ratio}">
    <iframe
      data-manual-figure-scene="${escapeAttribute(sceneId)}"
      data-renderer-src="${escapeAttribute(rendererSrc)}?scene=${escapeAttribute(sceneId)}"
      title="${escapeAttribute(accessibleTitle)}"
      aria-describedby="${escapeAttribute(captionId)}"
      tabindex="-1"
      loading="lazy"
      sandbox=""
      referrerpolicy="no-referrer"
      width="${scene.width}"
      height="${scene.height}"
    ></iframe>
  </div>
  <p class="manual-figure__fallback" role="status" hidden>The illustration is unavailable. Its description and caption remain below.</p>
  <noscript><p class="manual-figure__noscript">The illustration needs JavaScript to display. Its description and caption remain below.</p></noscript>
  <figcaption id="${escapeAttribute(captionId)}">
    <span class="manual-figure__description">${escapeText(description.trim())}</span>
    <span class="manual-figure__caption">${captionHtml.trim()}</span>${stillNote}
  </figcaption>
</figure>`;
}
