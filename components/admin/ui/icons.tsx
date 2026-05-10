import type { SVGProps } from "react";

const baseProps: SVGProps<SVGSVGElement> = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

function Wrap({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseProps} {...props}>
      {children}
    </svg>
  );
}

export const Icon = {
  Dashboard: (props: SVGProps<SVGSVGElement>) => (
    <Wrap {...props}>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </Wrap>
  ),
  Bag: (props: SVGProps<SVGSVGElement>) => (
    <Wrap {...props}>
      <path d="M5 7h14l-1.2 12.2A2 2 0 0 1 15.8 21H8.2a2 2 0 0 1-2-1.8L5 7Z" />
      <path d="M9 7V5a3 3 0 0 1 6 0v2" />
    </Wrap>
  ),
  Box: (props: SVGProps<SVGSVGElement>) => (
    <Wrap {...props}>
      <path d="M3 7l9-4 9 4-9 4-9-4Z" />
      <path d="M3 7v10l9 4 9-4V7" />
      <path d="M12 11v10" />
    </Wrap>
  ),
  Tag: (props: SVGProps<SVGSVGElement>) => (
    <Wrap {...props}>
      <path d="M3 12 12 3h8v8L11 20l-8-8Z" />
      <circle cx="16" cy="8" r="1" />
    </Wrap>
  ),
  Users: (props: SVGProps<SVGSVGElement>) => (
    <Wrap {...props}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20c0-3 2.7-5 6-5s6 2 6 5" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M15 20c0-2.5 2-4 4-4s2 0 2 0" />
    </Wrap>
  ),
  Discount: (props: SVGProps<SVGSVGElement>) => (
    <Wrap {...props}>
      <path d="M9 19 19 9" />
      <circle cx="9" cy="9" r="2" />
      <circle cx="19" cy="19" r="2" />
      <path d="M3 8a5 5 0 0 1 5-5h11v11a5 5 0 0 1-5 5H3V8Z" />
    </Wrap>
  ),
  Frame: (props: SVGProps<SVGSVGElement>) => (
    <Wrap {...props}>
      <rect x="3" y="3" width="18" height="18" rx="1" />
      <rect x="7" y="7" width="10" height="10" rx="0.5" />
    </Wrap>
  ),
  Layers: (props: SVGProps<SVGSVGElement>) => (
    <Wrap {...props}>
      <path d="M12 3 3 8l9 5 9-5-9-5Z" />
      <path d="M3 13l9 5 9-5" />
      <path d="M3 18l9 5 9-5" />
    </Wrap>
  ),
  Doc: (props: SVGProps<SVGSVGElement>) => (
    <Wrap {...props}>
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z" />
      <path d="M14 3v6h6" />
    </Wrap>
  ),
  Mail: (props: SVGProps<SVGSVGElement>) => (
    <Wrap {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </Wrap>
  ),
  Megaphone: (props: SVGProps<SVGSVGElement>) => (
    <Wrap {...props}>
      <path d="M3 11v2a2 2 0 0 0 2 2h2v-6H5a2 2 0 0 0-2 2Z" />
      <path d="M7 9 21 4v16L7 15V9Z" />
      <path d="M9 15v4a2 2 0 0 0 4 0" />
    </Wrap>
  ),
  Chart: (props: SVGProps<SVGSVGElement>) => (
    <Wrap {...props}>
      <path d="M3 3v18h18" />
      <path d="M7 16l4-4 3 3 5-7" />
    </Wrap>
  ),
  Settings: (props: SVGProps<SVGSVGElement>) => (
    <Wrap {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.6.9 1 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </Wrap>
  ),
  Brush: (props: SVGProps<SVGSVGElement>) => (
    <Wrap {...props}>
      <path d="M9 11 4 16a3 3 0 0 0 4 4l5-5" />
      <path d="m13 15 6.5-6.5a2.1 2.1 0 0 0-3-3L10 12" />
    </Wrap>
  ),
  Plus: (props: SVGProps<SVGSVGElement>) => (
    <Wrap {...props}>
      <path d="M12 5v14M5 12h14" />
    </Wrap>
  ),
  Search: (props: SVGProps<SVGSVGElement>) => (
    <Wrap {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </Wrap>
  ),
  Bell: (props: SVGProps<SVGSVGElement>) => (
    <Wrap {...props}>
      <path d="M6 8a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9Z" />
      <path d="M10 21a2 2 0 0 0 4 0" />
    </Wrap>
  ),
  Menu: (props: SVGProps<SVGSVGElement>) => (
    <Wrap {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Wrap>
  ),
  Close: (props: SVGProps<SVGSVGElement>) => (
    <Wrap {...props}>
      <path d="m6 6 12 12M6 18 18 6" />
    </Wrap>
  ),
  ChevronDown: (props: SVGProps<SVGSVGElement>) => (
    <Wrap {...props}>
      <path d="m6 9 6 6 6-6" />
    </Wrap>
  ),
  ChevronRight: (props: SVGProps<SVGSVGElement>) => (
    <Wrap {...props}>
      <path d="m9 6 6 6-6 6" />
    </Wrap>
  ),
  Logout: (props: SVGProps<SVGSVGElement>) => (
    <Wrap {...props}>
      <path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H10" />
    </Wrap>
  ),
  Image: (props: SVGProps<SVGSVGElement>) => (
    <Wrap {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5-9 9" />
    </Wrap>
  ),
  Upload: (props: SVGProps<SVGSVGElement>) => (
    <Wrap {...props}>
      <path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
      <path d="m17 8-5-5-5 5" />
      <path d="M12 3v13" />
    </Wrap>
  ),
  Download: (props: SVGProps<SVGSVGElement>) => (
    <Wrap {...props}>
      <path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
      <path d="m7 11 5 5 5-5" />
      <path d="M12 3v13" />
    </Wrap>
  ),
  MoreVertical: (props: SVGProps<SVGSVGElement>) => (
    <Wrap {...props}>
      <circle cx="12" cy="5" r="1.4" fill="currentColor" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" />
      <circle cx="12" cy="19" r="1.4" fill="currentColor" />
    </Wrap>
  ),
  Check: (props: SVGProps<SVGSVGElement>) => (
    <Wrap {...props}>
      <path d="m5 12 5 5L20 7" />
    </Wrap>
  ),
  Eye: (props: SVGProps<SVGSVGElement>) => (
    <Wrap {...props}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </Wrap>
  ),
  EyeOff: (props: SVGProps<SVGSVGElement>) => (
    <Wrap {...props}>
      <path d="m3 3 18 18" />
      <path d="M10.6 6.2A10.5 10.5 0 0 1 12 6c6.5 0 10 6 10 6a17.6 17.6 0 0 1-3.2 4" />
      <path d="M6.7 6.7C3.6 8.6 2 12 2 12s3.5 6 10 6c1.7 0 3.2-.4 4.6-1" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </Wrap>
  ),
  Archive: (props: SVGProps<SVGSVGElement>) => (
    <Wrap {...props}>
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <path d="M5 8v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8" />
      <path d="M10 13h4" />
    </Wrap>
  ),
};
