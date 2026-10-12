/**
 * The Kinetik mark: three overlapping circles read left to right like frames
 * of a moving ball, outline to solid. Colours follow the surrounding text, so
 * it works on either theme. Small sizes keep the strokes at a fixed pixel
 * width so the outlines never get thinner than a hairline.
 */
export function LogoMark({ width = 40, className }: { width?: number; className?: string }) {
  const small = width < 120;
  const thin = small ? 1.25 : 3;
  const bold = small ? 1.75 : 5;
  const scaling = small ? 'non-scaling-stroke' : undefined;
  return (
    <svg
      viewBox="0 0 200 100"
      width={width}
      height={width / 2}
      className={className}
      aria-hidden
      focusable="false"
    >
      <circle
        cx="52"
        cy="50"
        r="42"
        fill="var(--k-background)"
        stroke="currentColor"
        strokeWidth={thin}
        vectorEffect={scaling}
      />
      <circle
        cx="100"
        cy="50"
        r="42"
        fill="var(--k-background)"
        stroke="currentColor"
        strokeWidth={bold}
        vectorEffect={scaling}
      />
      <circle
        cx="148"
        cy="50"
        r="42"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth={bold}
        vectorEffect={scaling}
      />
    </svg>
  );
}
