/**
 * The Maskan logo.
 *
 * Redrawn from the supplied artwork as SVG rather than used as a PNG. The
 * logo sits on white in the sidebar and on ink in the admin console, so it
 * takes its colour from context via currentColor, and it has to stay sharp
 * from 22px to full size, which a raster cannot.
 *
 * The outline is deliberately open on the right: the roof stops short of
 * meeting the base, which is what gives the original its lightness.
 *
 * The wordmark uses textLength with lengthAdjust="spacingAndGlyphs". That
 * pins it to an exact width whatever font actually loads. Relying on
 * font-stretch alone meant the tail of MASKAN overflowed the viewBox and
 * was clipped whenever Archivo's width axis had not applied.
 */

const HOUSE = "M99 50.7 L48.6 0 L0 49.6 L0 133 L100 133";

/** Where the wordmark sits, and how wide it is forced to be. */
const TEXT_X = 20;
const TEXT_W = 146;

/** The house alone, for tight spaces and the favicon. */
export function MaskanMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="-4 -4 108 142"
      fill="none"
      className={className}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <path d={HOUSE} stroke="currentColor" strokeWidth="6" strokeLinecap="square" />
    </svg>
  );
}

/**
 * The full lockup: the house outline with the wordmark inside it,
 * overhanging to the right exactly as in the original.
 */
export function MaskanLogo({ className, title = "Maskan" }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="-4 -4 174 143"
      fill="none"
      className={className}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={title}
    >
      <path d={HOUSE} stroke="currentColor" strokeWidth="3.2" strokeLinecap="square" />
      <text
        x={TEXT_X}
        y={104}
        textLength={TEXT_W}
        lengthAdjust="spacingAndGlyphs"
        fill="currentColor"
        style={{
          fontFamily: "var(--font-archivo), ui-sans-serif, system-ui, sans-serif",
          fontSize: "52px",
          fontWeight: 700,
        }}
      >
        MASKAN
      </text>
    </svg>
  );
}
