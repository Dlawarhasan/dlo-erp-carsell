/**
 * لۆگۆی DLO IT — بە شێوەی SVG، پشت بە فۆنت نابەستێت
 * بۆ گۆڕینی بە لۆگۆی ڕەسمی: فایلەکە بخە ناو public/ و لێرە بەکاریبهێنە
 */

export function BrandMark({ size = 56, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-label="DLO IT">
      <defs>
        <linearGradient id="bmg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F5C86E" />
          <stop offset="1" stopColor="#E09A22" />
        </linearGradient>
      </defs>
      <rect x="1.5" y="1.5" width="61" height="61" rx="17" fill="rgb(var(--c-surface2))" stroke="url(#bmg)" strokeWidth="3" />
      {/* D */}
      <path
        d="M20 18 v28 h8 a14 14 0 0 0 0 -28 z"
        fill="none"
        stroke="url(#bmg)"
        strokeWidth="6.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* خاڵی IT */}
      <circle cx="44" cy="44" r="4" fill="url(#bmg)" />
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
