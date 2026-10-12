/**
 * Shown while a live preview loads its graphics runtime: the three circles of
 * the logo, outline to solid, rising one after another. A fixed small size,
 * centred wherever it is placed.
 */
export function PreviewLoader() {
  return (
    <div className="preview-loading" role="status" aria-label="Loading preview">
      <span />
      <span />
      <span />
    </div>
  );
}
