export type CeramicKind = "mug" | "plate" | "vase" | "bowl" | "tile" | "pitcher";

export function CeramicPiece({
  kind,
  className = "",
  label,
}: {
  kind: CeramicKind;
  className?: string;
  label?: string;
}) {
  const common = {
    className: `h-full w-full ${className}`,
    viewBox: "0 0 160 160",
    fill: "none",
    role: label ? "img" : undefined,
    "aria-label": label,
    "aria-hidden": label ? undefined : true,
  } as const;

  if (kind === "plate") {
    return (
      <svg {...common}>
        <circle cx="80" cy="80" r="61" fill="var(--color-cream)" stroke="var(--color-ink)" strokeWidth="5" />
        <circle cx="80" cy="80" r="38" fill="var(--color-rose)" opacity="0.42" stroke="var(--color-ink)" strokeWidth="3" />
        <path d="M51 63c17 5 32 3 51-7" stroke="var(--color-sage)" strokeWidth="8" strokeLinecap="round" />
        <path d="M56 102c12-9 33-10 49-4" stroke="var(--color-brick)" strokeWidth="7" strokeLinecap="round" />
        <circle cx="111" cy="82" r="7" fill="var(--color-mustard)" />
        <circle cx="54" cy="83" r="5" fill="var(--color-lavender)" />
      </svg>
    );
  }

  if (kind === "vase") {
    return (
      <svg {...common}>
        <path
          d="M63 19h34c-5 20-3 31 15 48 16 15 21 38 11 56-9 17-27 24-43 24s-34-7-43-24c-10-18-5-41 11-56 18-17 20-28 15-48Z"
          fill="var(--color-cream)"
          stroke="var(--color-ink)"
          strokeWidth="5"
          strokeLinejoin="round"
        />
        <path d="M55 83c20 12 40 12 60 0" stroke="var(--color-sage)" strokeWidth="9" strokeLinecap="round" />
        <path d="M48 111c18-8 46-8 64 1" stroke="var(--color-rose)" strokeWidth="8" strokeLinecap="round" />
        <path d="M65 42h30" stroke="var(--color-brick)" strokeWidth="6" strokeLinecap="round" />
        <circle cx="70" cy="65" r="5" fill="var(--color-mustard)" />
        <circle cx="95" cy="65" r="5" fill="var(--color-lavender)" />
      </svg>
    );
  }

  if (kind === "bowl") {
    return (
      <svg {...common}>
        <path
          d="M24 64h112c-4 44-28 70-56 70S28 108 24 64Z"
          fill="var(--color-cream)"
          stroke="var(--color-ink)"
          strokeWidth="5"
          strokeLinejoin="round"
        />
        <ellipse cx="80" cy="64" rx="56" ry="17" fill="var(--color-rose)" opacity="0.52" stroke="var(--color-ink)" strokeWidth="5" />
        <path d="M44 91c18 7 44 7 72-1" stroke="var(--color-sage)" strokeWidth="8" strokeLinecap="round" />
        <path d="M59 112c13 4 28 4 43-1" stroke="var(--color-mustard)" strokeWidth="7" strokeLinecap="round" />
      </svg>
    );
  }

  if (kind === "tile") {
    return (
      <svg {...common}>
        <rect x="30" y="28" width="100" height="104" rx="18" fill="var(--color-cream)" stroke="var(--color-ink)" strokeWidth="5" />
        <path d="M48 52c21 14 42 14 64 0" stroke="var(--color-sage)" strokeWidth="8" strokeLinecap="round" />
        <path d="M53 82h54" stroke="var(--color-rose)" strokeWidth="8" strokeLinecap="round" />
        <path d="M58 108c12-8 30-8 44 0" stroke="var(--color-brick)" strokeWidth="8" strokeLinecap="round" />
        <circle cx="52" cy="116" r="5" fill="var(--color-lavender)" />
        <circle cx="111" cy="43" r="6" fill="var(--color-mustard)" />
      </svg>
    );
  }

  if (kind === "pitcher") {
    return (
      <svg {...common}>
        <path
          d="M51 36h48c-3 20 4 28 15 37 15 12 19 31 10 49-8 16-25 24-49 24s-41-8-49-24c-9-18-5-37 10-49 11-9 18-17 15-37Z"
          fill="var(--color-cream)"
          stroke="var(--color-ink)"
          strokeWidth="5"
          strokeLinejoin="round"
        />
        <path d="M99 72c24 0 33 15 22 35-5 8-13 12-23 11" stroke="var(--color-ink)" strokeWidth="5" strokeLinecap="round" />
        <path d="M45 78c18 10 43 12 66 2" stroke="var(--color-sage)" strokeWidth="8" strokeLinecap="round" />
        <path d="M47 108c16-5 38-5 58 0" stroke="var(--color-rose)" strokeWidth="8" strokeLinecap="round" />
        <path d="M58 36h34" stroke="var(--color-brick)" strokeWidth="6" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path
        d="M39 48h67v55c0 25-14 38-34 38S39 128 39 103V48Z"
        fill="var(--color-cream)"
        stroke="var(--color-ink)"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <path d="M106 65h10c14 0 21 9 21 21s-8 21-22 21h-9" stroke="var(--color-ink)" strokeWidth="5" strokeLinecap="round" />
      <path d="M51 75c14 7 32 7 45 0" stroke="var(--color-sage)" strokeWidth="8" strokeLinecap="round" />
      <path d="M51 99c13-6 30-5 45 1" stroke="var(--color-rose)" strokeWidth="8" strokeLinecap="round" />
      <circle cx="57" cy="121" r="5" fill="var(--color-mustard)" />
      <circle cx="91" cy="121" r="5" fill="var(--color-lavender)" />
    </svg>
  );
}
