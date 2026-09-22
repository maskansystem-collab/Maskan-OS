/**
 * The Maskan logo.
 *
 * Redrawn from the supplied artwork as SVG rather than used as a PNG. The
 * logo sits on white in the sidebar and on ink in the admin header, the
 * portal chrome and the landing hero, so it has to take its colour from
 * context; currentColor does that. It also has to stay legible at 24px and
 * at 200px, which a raster cannot.
 *
 * The outline is deliberately open on the right: the roof stops short of
 * meeting the base, which is what gives the original its lightness.
 * Closing it would read as a solid box.
 */

const HOUSE = "M99 50.7 L48.6 0 L0 49.6 L0 133 L100 133";

/** The house alone, for tight spaces and the favicon. */
export function MaskanMark({ className }: { className?: string }) {
  return (
    <svg viewBox="-3 -3 106 140" fill="none" className={className} aria-hidden="true">
      <path d={HOUSE} stroke="currentColor" strokeWidth="6" strokeLinecap="square" />
    </svg>
  );
}

/**
 * The full lockup. The wordmark overhangs the house on the right, exactly
 * as in the original, so the viewBox is wider than the house itself.
 */
export function MaskanLogo({ className, title = "Maskan" }: { className?: string; title?: string }) {
  return (
    <svg viewBox="-2 -2 176 140" fill="none" className={className} role="img" aria-label={title}>
      <path d={HOUSE} stroke="currentColor" strokeWidth="3.2" strokeLinecap="square" />
      <text
        x="20" y="104" fill="currentColor"
        style={{
          // Archivo's width axis takes it condensed, which is what the
          // original wordmark is set in, and keeps the logo inside the
          // type system rather than importing a second display face.
          fontFamily: "var(--font-archivo), ui-sans-serif, system-ui, sans-serif",
          fontSize: "54px",
          fontWeight: 700,
          fontStretch: "78%",
          letterSpacing: "0.01em",
        }}
      >
        MASKAN
      </text>
    </svg>
  );
}
