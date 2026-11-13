import type { ReactNode } from "react";
import {
  CATEGORY_COLORS,
  CATEGORY_CREAM,
  CATEGORY_INK,
  type CategoryColorKey,
  type CategoryDecoration,
} from "@/lib/object-categories";

/*
 * Onglet de catégorie du catalogue. Un seul composant pour la page publique ET pour
 * l'aperçu de l'admin : ce que l'équipe voit dans la fenêtre est exactement le bouton du site.
 * Les petits dessins sont en SVG (aplats + trait encre), jamais en emoji : le rendu est
 * identique sur iPhone, Android et ordinateur.
 */

const INK = CATEGORY_INK;
const CREAM = CATEGORY_CREAM;
const STROKE = 1.7;

type Spot = {
  left?: string;
  right?: string;
  top?: string;
  bottom?: string;
  size: number;
  rotate?: number;
};

function Svg({
  children,
  size,
  rotate = 0,
}: {
  children: ReactNode;
  size: number;
  rotate?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      style={{ transform: `rotate(${rotate}deg)`, display: "block", overflow: "visible" }}
    >
      {children}
    </svg>
  );
}

/* ---------- Dessins ---------- */

const Sapin = () => (
  <>
    <path
      d="M12 3.2 17.4 10.2H14.6L18.8 15.6H15.4L19.8 20.4H4.2L8.6 15.6H5.2L9.4 10.2H6.6Z"
      fill="#5f9e68"
      stroke={INK}
      strokeWidth={STROKE}
      strokeLinejoin="round"
    />
    <rect
      x="10.4"
      y="20.4"
      width="3.2"
      height="2.6"
      rx="0.6"
      fill="#98566b"
      stroke={INK}
      strokeWidth={1.3}
    />
    <circle cx="12" cy="3" r="2" fill="#f2d35b" stroke={INK} strokeWidth={1.3} />
    <circle cx="10.2" cy="13.3" r="1" fill={CREAM} />
    <circle cx="14.2" cy="17.6" r="1" fill="#ffc1b6" />
  </>
);

const Flocon = ({ color }: { color: string }) => (
  <g stroke={color} strokeWidth={2.4} strokeLinecap="round" fill="none">
    <path d="M12 2.5v19M3.8 7.2l16.4 9.6M3.8 16.8l16.4-9.6" />
    <path d="M9.4 4.4 12 6.6l2.6-2.2M9.4 19.6 12 17.4l2.6 2.2" strokeWidth={2} />
  </g>
);

const Citrouille = ({ fill = "#d9572b" }: { fill?: string }) => (
  <>
    <path
      d="M12.2 6.6c.2-1.8.9-3 2.4-3.6"
      stroke="#4f7d4f"
      strokeWidth={2.2}
      strokeLinecap="round"
      fill="none"
    />
    <path
      d="M12 7.2c-2.3-1.3-6-.9-7.7 1.7-1.8 2.7-1.4 7.6 1.3 9.7 1.8 1.4 4 1.5 6.4.5 2.4 1 4.6.9 6.4-.5 2.7-2.1 3.1-7 1.3-9.7-1.7-2.6-5.4-3-7.7-1.7Z"
      fill={fill}
      stroke={INK}
      strokeWidth={STROKE}
      strokeLinejoin="round"
    />
    <path
      d="M12 7.6v11.6M8.2 8.2c-1.6 3-1.6 7.2.2 10.2M15.8 8.2c1.6 3 1.6 7.2-.2 10.2"
      stroke={INK}
      strokeWidth={1.2}
      fill="none"
      strokeLinecap="round"
    />
  </>
);

const Masque = () => (
  <>
    <path
      d="M2.5 9.5c3-1.6 6.2-1.2 9.5.6 3.3-1.8 6.5-2.2 9.5-.6-.2 4.6-2.6 7.6-5.6 7.6-1.7 0-2.9-.9-3.9-2.2-1 1.3-2.2 2.2-3.9 2.2-3 0-5.4-3-5.6-7.6Z"
      fill="#f2d35b"
      stroke={INK}
      strokeWidth={STROKE}
      strokeLinejoin="round"
    />
    <ellipse cx="7.6" cy="12.2" rx="2" ry="1.3" fill={INK} />
    <ellipse cx="16.4" cy="12.2" rx="2" ry="1.3" fill={INK} />
    <path
      d="M18.8 8.6c.6-2.8 2.2-4.6 4-5.2-.2 2.4-1.2 4.4-3 5.8"
      fill="#ffc1b6"
      stroke={INK}
      strokeWidth={1.3}
      strokeLinejoin="round"
    />
  </>
);

const Confetti = ({ color }: { color: string }) => (
  <path
    d="M5 15c2.5-5 5-5 7 0s4.5 5 7 0"
    stroke={color}
    strokeWidth={3.2}
    strokeLinecap="round"
    fill="none"
  />
);

const Pastille = ({ color }: { color: string }) => <circle cx="12" cy="12" r="6.5" fill={color} />;

const Coeur = ({ fill = "#ffc1b6", outline = true }: { fill?: string; outline?: boolean }) => (
  <path
    d="M12 20.5C6.8 17 3.2 13.6 3.2 9.4 3.2 6.6 5.3 4.6 7.8 4.6c1.8 0 3.2 1 4.2 2.6 1-1.6 2.4-2.6 4.2-2.6 2.5 0 4.6 2 4.6 4.8 0 4.2-3.6 7.6-8.8 11.1Z"
    fill={fill}
    stroke={outline ? INK : "none"}
    strokeWidth={STROKE}
    strokeLinejoin="round"
  />
);

const Oeuf = ({ fill = "#fef3b0", stripe = "#e8846f" }: { fill?: string; stripe?: string }) => (
  <>
    <path
      d="M12 2.8c3.9 0 7 6 7 10.7 0 4.3-3.1 7.7-7 7.7s-7-3.4-7-7.7C5 8.8 8.1 2.8 12 2.8Z"
      fill={fill}
      stroke={INK}
      strokeWidth={STROKE}
    />
    <path
      d="M5.4 12.2l2.2 1.8 2.2-1.8 2.2 1.8 2.2-1.8 2.2 1.8 2.2-1.8"
      stroke={stripe}
      strokeWidth={1.8}
      fill="none"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  </>
);

const Fleur = ({ petal = "#ffc1b6", heart = "#f2d35b" }: { petal?: string; heart?: string }) => (
  <>
    {[0, 72, 144, 216, 288].map((angle) => (
      <ellipse
        key={angle}
        cx="12"
        cy="6.6"
        rx="3.4"
        ry="4.4"
        fill={petal}
        stroke={INK}
        strokeWidth={1.4}
        transform={`rotate(${angle} 12 12)`}
      />
    ))}
    <circle cx="12" cy="12" r="3" fill={heart} stroke={INK} strokeWidth={1.4} />
  </>
);

/* ---------- Décorations ---------- */

type DecorationArt = {
  icon: ReactNode;
  /**
   * Petits dessins posés à droite du nom. `soft` donne la couleur des dessins clairs sans
   * contour : la teinte prévue sur un fond foncé, l'encre sur un fond clair pour rester visibles.
   */
  decor: (soft: (color: string) => string) => { el: ReactNode; spot: Spot }[];
};

const DECORATION_ART: Record<Exclude<CategoryDecoration, "none">, DecorationArt> = {
  noel: {
    icon: <Sapin />,
    decor: (soft) => [
      {
        el: <Flocon color={soft(CREAM)} />,
        spot: { right: "5px", top: "3px", size: 12, rotate: 10 },
      },
      {
        el: <Flocon color={soft(CREAM)} />,
        spot: { right: "21px", bottom: "3px", size: 8, rotate: 25 },
      },
      { el: <Flocon color={soft(CREAM)} />, spot: { right: "4px", bottom: "2px", size: 7 } },
    ],
  },
  carnaval: {
    icon: <Masque />,
    decor: (soft) => [
      {
        el: <Confetti color={soft("#fef3b0")} />,
        spot: { right: "5px", top: "3px", size: 13, rotate: -20 },
      },
      { el: <Pastille color={soft("#d0f0ed")} />, spot: { right: "21px", bottom: "4px", size: 8 } },
      { el: <Pastille color={soft("#ffc1b6")} />, spot: { right: "6px", bottom: "4px", size: 7 } },
    ],
  },
  "saint-valentin": {
    icon: <Coeur />,
    decor: (soft) => [
      {
        el: <Coeur fill={soft(CREAM)} outline={false} />,
        spot: { right: "5px", top: "4px", size: 11, rotate: 12 },
      },
      {
        el: <Coeur fill={soft("#ffc1b6")} outline={false} />,
        spot: { right: "20px", bottom: "3px", size: 8, rotate: -15 },
      },
    ],
  },
  paques: {
    icon: <Oeuf />,
    decor: () => [
      {
        el: <Oeuf fill="#e6d6f7" stripe="#7d4fc9" />,
        spot: { right: "5px", top: "3px", size: 13, rotate: 15 },
      },
      {
        el: <Oeuf fill="#ffc1b6" stripe="#5f9e68" />,
        spot: { right: "21px", bottom: "2px", size: 10, rotate: -12 },
      },
    ],
  },
  "fete-des-meres": {
    icon: <Fleur />,
    decor: () => [
      {
        el: <Fleur petal={CREAM} heart="#f2d35b" />,
        spot: { right: "5px", top: "3px", size: 13 },
      },
      {
        el: <Coeur fill="#d6506f" outline={false} />,
        spot: { right: "21px", bottom: "3px", size: 8, rotate: -12 },
      },
    ],
  },
  halloween: {
    icon: <Citrouille />,
    decor: () => [
      {
        el: <Citrouille fill="#c94a24" />,
        spot: { right: "5px", top: "3px", size: 13, rotate: 10 },
      },
      {
        el: <Citrouille fill="#ffb35c" />,
        spot: { right: "21px", bottom: "2px", size: 10, rotate: -10 },
      },
    ],
  },
};

const BASE_CLASS =
  "kafe-category-chip shrink-0 whitespace-nowrap rounded-lg border-2 border-ink py-1.5 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

export function CategoryChip({
  label,
  color = "creme",
  decoration = "none",
  active = false,
  onClick,
  preview = false,
  className = "",
}: {
  label: string;
  color?: CategoryColorKey;
  decoration?: CategoryDecoration;
  active?: boolean;
  onClick?: () => void;
  /** Aperçu non cliquable (admin) : même rendu, sans rôle de bouton. */
  preview?: boolean;
  className?: string;
}) {
  const palette = CATEGORY_COLORS[color] ?? CATEGORY_COLORS.creme;
  const art = decoration === "none" ? null : DECORATION_ART[decoration];
  const cream = color === "creme" || !CATEGORY_COLORS[color];
  // L'onglet crème garde le style historique : fond prune une fois sélectionné.
  const background = palette.bg;
  const text = cream && active ? CREAM : palette.text;
  const onDark = text === CREAM;
  const soft = (tone: string) => (onDark ? tone : INK);
  // Les onglets colorés gardent leur couleur : la sélection se lit à l'effet enfoncé + nom souligné.
  const pressed = active && !cream;

  const classes = [
    BASE_CLASS,
    art ? "relative overflow-hidden pl-2.5 pr-10" : "px-4",
    pressed
      ? "translate-x-[2px] translate-y-[2px] shadow-[1px_1px_0_#2f1620]"
      : "shadow-[3px_3px_0_#2f1620]",
    cream
      ? active
        ? "bg-[#a85f73]"
        : preview
          ? "bg-[#fffaf0]"
          : "bg-[#fffaf0] hover:bg-secondary"
      : "",
    preview ? "inline-block cursor-default select-none" : "transition-transform",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      {art?.decor(soft).map((item, index) => (
        <span
          key={index}
          className="pointer-events-none absolute"
          style={{
            left: item.spot.left,
            right: item.spot.right,
            top: item.spot.top,
            bottom: item.spot.bottom,
          }}
        >
          <Svg size={item.spot.size} rotate={item.spot.rotate}>
            {item.el}
          </Svg>
        </span>
      ))}
      {art ? (
        <span className="relative flex items-center gap-1.5">
          <Svg size={18}>{art.icon}</Svg>
          <span className={pressed ? "underline decoration-2 underline-offset-4" : undefined}>
            {label}
          </span>
        </span>
      ) : (
        <span className={pressed ? "underline decoration-2 underline-offset-4" : undefined}>
          {label}
        </span>
      )}
    </>
  );

  // Crème : le fond passe par des classes pour garder le survol historique.
  const style = cream ? { color: text } : { backgroundColor: background, color: text };

  if (preview) {
    return (
      <span className={classes} style={style}>
        {content}
      </span>
    );
  }

  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={classes} style={style}>
      {content}
    </button>
  );
}
