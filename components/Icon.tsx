// One small set of line icons (24px grid, 1.7 stroke) used everywhere instead of emoji.

const PATHS = {
  today: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  journal: <><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></>,
  insights: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  you: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>,
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>,
  stop: <rect x="7" y="7" width="10" height="10" rx="1.5" />,
  keyboard: <><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" /></>,
  volume: <><path d="M11 5 6 9H3v6h3l5 4V5Z" /><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /></>,
  volumeOff: <><path d="M11 5 6 9H3v6h3l5 4V5Z" /><path d="m22 9-6 6M16 9l6 6" /></>,
  mood: <><circle cx="12" cy="12" r="9" /><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0M9 9.5h.01M15 9.5h.01" /></>,
  productive: <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />,
  focus: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
  sleep: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />,
  morning: <><path d="M12 3v3M4.2 7.2l2 2M19.8 7.2l-2 2M2 17h20M6 17a6 6 0 0 1 12 0" /></>,
  did: <><path d="M12 21s7-5.6 7-11.5A7 7 0 0 0 5 9.5C5 15.4 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></>,
  food: <><path d="M5 3v8a2 2 0 0 0 2 2v8M9 3v8a2 2 0 0 1-2 2M7 3v6" /><path d="M17 21V3c-2 0-4 2-4 6v5h4" /></>,
  workout: <path d="M6 7v10M3 9.5v5M18 7v10M21 9.5v5M6 12h12" />,
  drinks: <><path d="M6 4h10v15a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4Z" /><path d="M16 8h2a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2M6 9h10" /></>,
  weed: <path d="M12 21v-7M12 14C7 14 4 10 4 5c5 0 8 4 8 9ZM12 14c5 0 8-4 8-9-5 0-8 4-8 9Z" />,
  work: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 12h18" /></>,
  people: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c1-3.5 3.5-5 6.5-5s5.5 1.5 6.5 5M16 4.6a3.5 3.5 0 0 1 0 6.8M18 15.3c2 .7 3.2 2.3 3.6 4.7" /></>,
  fun: <path d="M12 3l2.2 5.4L20 9l-4.4 3.8L17 18.5 12 15.4 7 18.5l1.4-5.7L4 9l5.8-.6L12 3Z" />,
  happy: <><circle cx="12" cy="12" r="9" /><path d="M8.5 14a4.5 4.5 0 0 0 7 0M9 9.5h.01M15 9.5h.01" /></>,
  annoyed: <><circle cx="12" cy="12" r="9" /><path d="M8.5 16a4.5 4.5 0 0 1 7 0M8 9l2 1M16 9l-2 1" /></>,
  standout: <path d="M12 3l2.2 5.4L20 9l-4.4 3.8L17 18.5 12 15.4 7 18.5l1.4-5.7L4 9l5.8-.6L12 3Z" />,
  tag: <><path d="M3 12V4h8l10 10-8 8L3 12Z" /><circle cx="7.5" cy="7.5" r="1.3" /></>,
  flame: <path d="M12 22a7 7 0 0 0 7-7c0-4-3-6-4-10-2 2-3 4-3 6-1-1-2-2-2-4-2 2-5 5-5 8a7 7 0 0 0 7 7Z" />,
  bulb: <><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.9V16h5v-.2c0-.8.4-1.5 1-1.9A6 6 0 0 0 12 3Z" /></>,
  bell: <><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8" /><path d="M10 20a2 2 0 0 0 4 0" /></>,
  plug: <><path d="M9 2v5M15 2v5M6 7h12v4a6 6 0 0 1-12 0V7ZM12 17v5" /></>,
  pause: <path d="M9 5v14M15 5v14" />,
  share: <><path d="M12 15V3M8 7l4-4 4 4" /><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" /></>,
  edit: <path d="M4 20h4L19 9l-4-4L4 16v4ZM14 6l4 4" />,
  refresh: <><path d="M20 11a8 8 0 0 0-14.6-4.5L4 8M4 4v4h4" /><path d="M4 13a8 8 0 0 0 14.6 4.5L20 16M20 20v-4h-4" /></>,
  chat: <path d="M21 12a8 8 0 0 1-11.7 7.1L4 20l1-4.5A8 8 0 1 1 21 12Z" />,
  download: <path d="M12 3v12M7 10l5 5 5-5M4 21h16" />,
  trash: <><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></>,
  sprout: <path d="M12 21V11M12 11c0-4-3-7-8-7 0 5 3 7 8 7ZM12 14c0-3 2.5-5.5 7-5.5 0 4-2.5 5.5-7 5.5Z" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
} as const

export type IconName = keyof typeof PATHS

export function Icon({ name, size = 18, className = '', strokeWidth = 1.7 }: { name: IconName; size?: number; className?: string; strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`inline-block shrink-0 ${className}`}
    >
      {PATHS[name]}
    </svg>
  )
}
