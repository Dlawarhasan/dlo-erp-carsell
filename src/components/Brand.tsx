/**
 * لۆگۆی DLO IT — بە شێوەی SVG، پشت بە فۆنت نابەستێت
 * بۆ گۆڕینی بە لۆگۆی ڕەسمی: فایلەکە بخە ناو public/ و لێرە بەکاریبهێنە
 */

export function BrandMark({ size = 56, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" className={className} aria-label="DLO IT">
      <defs>
        <linearGradient id="bmBg" x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor="#1B2432" />
          <stop offset="0.55" stopColor="#0E141C" />
          <stop offset="1" stopColor="#070B10" />
        </linearGradient>
        <linearGradient id="bmGold" x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor="#FBDA92" />
          <stop offset="0.45" stopColor="#F0B44E" />
          <stop offset="1" stopColor="#D68B18" />
        </linearGradient>
        <radialGradient id="bmGlow" cx="0.28" cy="0.18" r="0.8">
          <stop offset="0" stopColor="#F0B44E" stopOpacity="0.2" />
          <stop offset="1" stopColor="#F0B44E" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="512" height="512" rx="114" fill="url(#bmBg)" />
      <rect width="512" height="512" rx="114" fill="url(#bmGlow)" />
      <rect x="3" y="3" width="506" height="506" rx="112" fill="none" stroke="#F0B44E" strokeOpacity="0.2" strokeWidth="6" />
      <path
        d="M144 112 h104 a144 144 0 0 1 0 288 h-104 z
           M198 166 h50 a90 90 0 0 1 0 180 h-50 z"
        fill="url(#bmGold)"
        fillRule="evenodd"
      />
      <g transform="translate(208 227)" fill="url(#bmGold)">
        <path d="M4 40 v-10 c0-4 3-8 7-9 l15-4 13-15 c2-2 5-4 8-4 h28 c3 0 6 2 8 4 l13 15 15 4 c4 1 7 5 7 9 v10 c0 3-2 6-6 6 h-5 a13 13 0 0 0-26 0 h-40 a13 13 0 0 0-26 0 h-5 c-4 0-6-3-6-6 z" />
        <path d="M35 6 h42 l11 13 h-64 z" fill="#0E141C" opacity="0.6" />
        <circle cx="27" cy="46" r="9.5" />
        <circle cx="93" cy="46" r="9.5" />
      </g>
    </svg>
  )
}

export function BrandWord({ height = 40, className = '' }: { height?: number; className?: string }) {
  return (
    <svg height={height} viewBox="0 0 196 48" className={className} fill="none" aria-label="DLO IT">
      <defs>
        <linearGradient id="bwg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F5C86E" />
          <stop offset="1" stopColor="#E09A22" />
        </linearGradient>
      </defs>
      <g stroke="url(#bwg)" strokeWidth="7.5" strokeLinecap="round" strokeLinejoin="round">
        {/* D */}
        <path d="M8 8 v32 h10 a16 16 0 0 0 0 -32 z" />
        {/* L */}
        <path d="M54 8 v32 h22" />
        {/* O */}
        <circle cx="108" cy="24" r="16" />
      </g>
      {/* IT */}
      <g stroke="rgb(var(--c-muted))" strokeWidth="6" strokeLinecap="round">
        <path d="M152 14 v20" />
        <path d="M166 14 h22" />
        <path d="M177 14 v20" />
      </g>
    </svg>
  )
}

/** نیشانەی بچووک بۆ سەردێڕەکان — لۆگۆی پێشانگا ئەگەر هەیە، ئەگەرنا DLO IT */
export function ShowroomMark({ logo, size = 40, className = '' }: { logo?: string; size?: number; className?: string }) {
  if (logo) return <img src={logo} alt="" style={{ width: size, height: size }} className={`rounded-xl object-cover border border-line ${className}`} />
  return <BrandMark size={size} className={className} />
}
