export default function LogoMark({ size = 36, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Left pillar */}
      <rect x="4" y="4" width="10" height="36" rx="2" fill="#CBA135" />
      {/* Right pillar */}
      <rect x="30" y="4" width="10" height="36" rx="2" fill="#CBA135" />
      {/* Crossbar */}
      <rect x="4" y="19" width="36" height="6" fill="#CBA135" />
      {/* Diamond window — the marketplace meeting point */}
      <path d="M22 16.5L26.5 22L22 27.5L17.5 22Z" fill="#0B1220" />
      {/* Centre accent dot */}
      <circle cx="22" cy="22" r="1.5" fill="#CBA135" />
    </svg>
  )
}
