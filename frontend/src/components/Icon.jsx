const paths = {
  notes: <><path d="M6 3.75h8.5L19 8.2v12.05H6z" /><path d="M14 3.75V9h5M9 13h7M9 16.5h7" /></>,
  profile: <><circle cx="12" cy="7.5" r="3.5" /><path d="M4.5 20.5v-1.25a7.5 7.5 0 0 1 15 0v1.25z" /></>,
  admin: <><path d="M12 3.5 19 6v5.25c0 4.4-2.7 7.7-7 9.25-4.3-1.55-7-4.85-7-9.25V6z" /><path d="m9 11.5 2 2 4-4" /></>,
  search: <><circle cx="10.8" cy="10.8" r="6.5" /><path d="m15.7 15.7 4.1 4.1" /></>,
  add: <><path d="M12 5v14M5 12h14" /></>,
  back: <><path d="M19 12H5M11 18l-6-6 6-6" /></>,
  exit: <><path d="M10 5H5v14h5M14 8l4 4-4 4M8 12h10" /></>,
  close: <><path d="m6 6 12 12M18 6 6 18" /></>,
  check: <path d="m5 12.5 4.3 4.3L19 7" />,
  page: <><path d="M7 3.5h7.5L19 8v12.5H7z" /><path d="M14 3.5V9h5M10 13h6M10 16.5h6" /></>,
};

export default function Icon({ name, size = 20, className = '' }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}
