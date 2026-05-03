export function MiniSparkline({ muted = false }: { muted?: boolean }) {
  return (
    <svg className="h-10 w-24 shrink-0" viewBox="0 0 96 36" aria-hidden="true">
      <path
        d="M2 25 L10 22 L18 24 L26 16 L34 19 L42 11 L50 13 L58 8 L66 17 L74 12 L82 7 L94 9"
        fill="none"
        stroke={muted ? "rgba(255,255,255,.62)" : "rgba(255,255,255,.88)"}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}
