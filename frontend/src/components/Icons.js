/**
 * Icon set — 20px line-art SVG icons (1.5px stroke).
 * Minimal, consistent, accessible (no emoji-as-icons).
 */

import { useId } from "react";

const base = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

export const LogoMark = ({ size = 28 }) => {
  // Unique gradient id per instance: a shared id resolves to the first DOM
  // match, which may sit inside a display:none container (e.g. the hidden
  // mobile header) and silently break the fill.
  const id = useId();
  const gradId = `brand-grad-${id.replace(/[^a-zA-Z0-9-]/g, "")}`;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="24" y2="24">
          <stop offset="0%" stopColor="#30d2bd" />
          <stop offset="100%" stopColor="#0f8d7c" />
        </linearGradient>
      </defs>
      {/* rounded-square tile with an open ring — search/focus motif */}
      <rect x="1.5" y="1.5" width="21" height="21" rx="6" fill={`url(#${gradId})`} />
      <path
        d="M16.5 12a4.5 4.5 0 1 1-4.5-4.5"
        stroke="#07221e"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="16.5" cy="7.5" r="1.4" fill="#07221e" />
    </svg>
  );
};

export const SearchIcon = (props) => (
  <svg {...base} {...props}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

export const ArrowUpIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M12 19V5" />
    <path d="m5 12 7-7 7 7" />
  </svg>
);

export const ArrowRightIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

export const PlusIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </svg>
);

export const ClockIcon = (props) => (
  <svg {...base} {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

export const GlobeIcon = (props) => (
  <svg {...base} {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3a13.5 13.5 0 0 1 0 18 13.5 13.5 0 0 1 0-18Z" />
  </svg>
);

export const BookIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4a2 2 0 0 0-2-2H6.5A2.5 2.5 0 0 0 4 4.5Z" />
    <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" />
  </svg>
);

export const PenIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    <path d="m15 5 4 4" />
  </svg>
);

export const SparklesIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9Z" />
    <path d="M19 17l.7 1.8L21.5 19.5l-1.8.7L19 22l-.7-1.8-1.8-.7 1.8-.7Z" />
  </svg>
);

export const CheckCircleIcon = (props) => (
  <svg {...base} {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.5 12 2.5 2.5 4.5-5" />
  </svg>
);

export const AlertIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
  </svg>
);

export const SunIcon = (props) => (
  <svg {...base} {...props}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

export const MoonIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" />
  </svg>
);

export const MenuIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

export const CloseIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export const LogoutIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
);

export const TrendingIcon = (props) => (
  <svg {...base} {...props}>
    <path d="m22 7-8.5 8.5-5-5L2 17" />
    <path d="M16 7h6v6" />
  </svg>
);

export const AtomIcon = (props) => (
  <svg {...base} {...props}>
    <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    <ellipse cx="12" cy="12" rx="10" ry="4.5" />
    <ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(60 12 12)" />
    <ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(120 12 12)" />
  </svg>
);

export const DnaIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M7 3c0 6 10 6 10 12s-10 6-10 6" />
    <path d="M17 3c0 6-10 6-10 12s10 6 10 6" />
    <path d="M8 7h8M8 17h8" />
  </svg>
);

export const CodeIcon = (props) => (
  <svg {...base} {...props}>
    <path d="m8 8-5 4 5 4" />
    <path d="m16 8 5 4-5 4" />
    <path d="m13 4-2 16" />
  </svg>
);

export const PanelLeftIcon = (props) => (
  <svg {...base} {...props}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M9 4v16" />
  </svg>
);
