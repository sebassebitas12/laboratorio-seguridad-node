import { useId } from 'react';

export default function Field({ label, className = '', hint, ...props }) {
  const id = useId();
  return (
    <div className={`field${className ? ` ${className}` : ''}`}>
      <label htmlFor={id}>{label}</label>
      <input id={id} {...props} />
      {hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}
