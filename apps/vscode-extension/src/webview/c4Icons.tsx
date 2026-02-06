/**
 * C4 Architecture Visualizer — SVG Icon System
 *
 * Inline SVG components — CSP-safe, no external resources.
 * All icons accept size and color props.
 */
import React from 'react';

interface IconProps {
  size?: number;
  color?: string;
}

// ── C4 Type Icons (24x24 default) ──

export const PersonIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="6" r="4" fill={color} />
    <path d="M4 22c0-4.418 3.582-8 8-8s8 3.582 8 8" fill={color} opacity={0.85} />
  </svg>
);

export const LandscapeIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="2" y="10" width="6" height="12" rx="1" fill={color} opacity={0.7} />
    <rect x="9" y="4" width="6" height="18" rx="1" fill={color} opacity={0.85} />
    <rect x="16" y="8" width="6" height="14" rx="1" fill={color} opacity={0.7} />
    <rect x="2" y="20" width="20" height="2" rx="1" fill={color} />
  </svg>
);

export const SoftwareSystemIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="3" y="3" width="18" height="18" rx="3" fill={color} opacity={0.2} stroke={color} strokeWidth="1.5" />
    <rect x="6" y="7" width="12" height="3" rx="1" fill={color} opacity={0.6} />
    <rect x="6" y="12" width="12" height="3" rx="1" fill={color} opacity={0.4} />
    <rect x="6" y="17" width="8" height="2" rx="1" fill={color} opacity={0.3} />
  </svg>
);

export const ContainerIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="3" y="3" width="18" height="18" rx="2" fill={color} opacity={0.15} stroke={color} strokeWidth="1.5" />
    <line x1="3" y1="9" x2="21" y2="9" stroke={color} strokeWidth="1" opacity={0.4} />
    <circle cx="7" cy="6" r="1.5" fill={color} opacity={0.5} />
    <rect x="6" y="12" width="12" height="2" rx="1" fill={color} opacity={0.4} />
    <rect x="6" y="16" width="8" height="2" rx="1" fill={color} opacity={0.3} />
  </svg>
);

export const DataStoreIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <ellipse cx="12" cy="6" rx="8" ry="3" fill={color} opacity={0.3} stroke={color} strokeWidth="1.5" />
    <path d="M4 6v12c0 1.657 3.582 3 8 3s8-1.343 8-3V6" stroke={color} strokeWidth="1.5" fill={color} opacity={0.15} />
    <ellipse cx="12" cy="18" rx="8" ry="3" fill="none" stroke={color} strokeWidth="1.5" opacity={0.4} />
  </svg>
);

export const ComponentIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="5" y="5" width="14" height="14" rx="2" fill={color} opacity={0.15} stroke={color} strokeWidth="1.5" />
    <rect x="1" y="8" width="6" height="3" rx="1" fill={color} opacity={0.5} />
    <rect x="1" y="13" width="6" height="3" rx="1" fill={color} opacity={0.5} />
    <rect x="17" y="10" width="6" height="4" rx="1" fill={color} opacity={0.4} />
  </svg>
);

export const CodeUnitIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M8 18l-5-6 5-6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M16 6l5 6-5 6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M14 4l-4 16" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity={0.5} />
  </svg>
);

export const ExternalSystemIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M6 19a4 4 0 01-.87-7.9A5.5 5.5 0 0116 6.5a4.5 4.5 0 013.09 7.74A3 3 0 0118 20H6z"
      fill={color} opacity={0.2} stroke={color} strokeWidth="1.5" />
    <path d="M12 14v4m0 0l-2-2m2 2l2-2" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const DrillDownIcon: React.FC<IconProps> = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <circle cx="7" cy="7" r="4.5" stroke={color} strokeWidth="1.5" opacity={0.7} />
    <path d="M10.5 10.5L14 14" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity={0.7} />
    <path d="M5 7h4M7 5v4" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

export const BackArrowIcon: React.FC<IconProps> = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M10 3L5 8l5 5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ChevronIcon: React.FC<IconProps> = ({ size = 12, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
    <path d="M4 2l4 4-4 4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ── Technology Badge Icons (16x16) ──

export const TypeScriptBadge: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect width="16" height="16" rx="2" fill="#3178C6" />
    <text x="3" y="12" fill="white" fontSize="9" fontWeight="bold" fontFamily="monospace">TS</text>
  </svg>
);

export const PythonBadge: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect width="16" height="16" rx="2" fill="#3776AB" />
    <text x="3" y="12" fill="#FFD43B" fontSize="9" fontWeight="bold" fontFamily="monospace">Py</text>
  </svg>
);

export const PostgreSQLBadge: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect width="16" height="16" rx="2" fill="#336791" />
    <text x="2" y="12" fill="white" fontSize="8" fontWeight="bold" fontFamily="monospace">PG</text>
  </svg>
);

export const RedisBadge: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect width="16" height="16" rx="2" fill="#DC382D" />
    <path d="M4 8l4-3 4 3-4 3z" fill="white" opacity={0.9} />
  </svg>
);

export const KafkaBadge: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect width="16" height="16" rx="2" fill="#231F20" />
    <text x="3" y="11" fill="white" fontSize="7" fontWeight="bold" fontFamily="monospace">KF</text>
  </svg>
);

export const ExpressBadge: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect width="16" height="16" rx="2" fill="#333333" />
    <text x="4" y="12" fill="white" fontSize="10" fontWeight="bold" fontFamily="monospace">E</text>
  </svg>
);

export const ReactBadge: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect width="16" height="16" rx="2" fill="#20232A" />
    <circle cx="8" cy="8" r="2" fill="#61DAFB" />
    <ellipse cx="8" cy="8" rx="6" ry="2.5" stroke="#61DAFB" strokeWidth="0.8" fill="none" />
    <ellipse cx="8" cy="8" rx="6" ry="2.5" stroke="#61DAFB" strokeWidth="0.8" fill="none"
      transform="rotate(60 8 8)" />
    <ellipse cx="8" cy="8" rx="6" ry="2.5" stroke="#61DAFB" strokeWidth="0.8" fill="none"
      transform="rotate(120 8 8)" />
  </svg>
);

export const DockerBadge: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect width="16" height="16" rx="2" fill="#2496ED" />
    <rect x="3" y="7" width="3" height="2.5" rx="0.5" fill="white" opacity={0.9} />
    <rect x="6.5" y="7" width="3" height="2.5" rx="0.5" fill="white" opacity={0.9} />
    <rect x="6.5" y="4" width="3" height="2.5" rx="0.5" fill="white" opacity={0.9} />
    <rect x="10" y="7" width="3" height="2.5" rx="0.5" fill="white" opacity={0.9} />
    <path d="M2 10.5c2 3 10 3 13 0" stroke="white" strokeWidth="0.8" opacity={0.6} />
  </svg>
);

export const AWSBadge: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect width="16" height="16" rx="2" fill="#232F3E" />
    <text x="1" y="11" fill="#FF9900" fontSize="7" fontWeight="bold" fontFamily="monospace">AWS</text>
  </svg>
);

export const GoBadge: React.FC<IconProps> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect width="16" height="16" rx="2" fill="#00ADD8" />
    <text x="3" y="12" fill="white" fontSize="9" fontWeight="bold" fontFamily="monospace">Go</text>
  </svg>
);

export const DefaultTechBadge: React.FC<IconProps & { label: string }> = ({ size = 16, label }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect width="16" height="16" rx="2" fill="#555" />
    <text x="3" y="11" fill="white" fontSize="7" fontWeight="bold" fontFamily="monospace">
      {label.substring(0, 2).toUpperCase()}
    </text>
  </svg>
);

// ── Helper: Get type icon by DadNodeType ──

export function getC4TypeIcon(c4Type: string, size?: number, color?: string): React.ReactElement {
  switch (c4Type) {
    case 'landscape':      return <LandscapeIcon size={size} color={color} />;
    case 'softwareSystem': return <SoftwareSystemIcon size={size} color={color} />;
    case 'person':         return <PersonIcon size={size} color={color} />;
    case 'externalSystem': return <ExternalSystemIcon size={size} color={color} />;
    case 'container':      return <ContainerIcon size={size} color={color} />;
    case 'dataStore':      return <DataStoreIcon size={size} color={color} />;
    case 'component':      return <ComponentIcon size={size} color={color} />;
    case 'codeUnit':       return <CodeUnitIcon size={size} color={color} />;
    default:               return <ContainerIcon size={size} color={color} />;
  }
}

// ── Helper: Get tech badge from technology string ──

const TECH_BADGE_MAP: Record<string, React.FC<IconProps>> = {
  typescript: TypeScriptBadge,
  ts:         TypeScriptBadge,
  python:     PythonBadge,
  py:         PythonBadge,
  postgresql: PostgreSQLBadge,
  postgres:   PostgreSQLBadge,
  pg:         PostgreSQLBadge,
  redis:      RedisBadge,
  kafka:      KafkaBadge,
  express:    ExpressBadge,
  react:      ReactBadge,
  docker:     DockerBadge,
  aws:        AWSBadge,
  go:         GoBadge,
  golang:     GoBadge,
};

export function getTechBadgeIcon(technology?: string, size?: number): React.ReactElement | null {
  if (!technology) return null;
  const parts = technology.toLowerCase().replace(/[\/\-_]/g, ' ').split(/\s+/);
  for (const part of parts) {
    const Badge = TECH_BADGE_MAP[part];
    if (Badge) return <Badge size={size} />;
  }
  return null;
}
