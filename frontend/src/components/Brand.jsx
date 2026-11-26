export default function Brand({ light = false, compact = false }) {
  return (
    <div className={`brand-lockup${light ? ' brand-lockup-light' : ''}${compact ? ' brand-lockup-compact' : ''}`}>
      <svg className="brand-mark" viewBox="0 0 44 44" fill="none" aria-hidden="true">
        <path d="M10 5.5h22.5L38 11v27.5H10z" stroke="currentColor" strokeWidth="1.6" />
        <path d="M31.5 5.5V12H38M17 17h13M17 22h13M17 27h8" stroke="currentColor" strokeWidth="1.6" />
        <path d="M10 33.5h6" stroke="var(--brand-mark-accent)" strokeWidth="2.4" />
      </svg>
      <span>Resguardo</span>
    </div>
  );
}
