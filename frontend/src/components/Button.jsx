import Icon from './Icon.jsx';

export default function Button({ children, variant = 'primary', icon, className = '', ...props }) {
  return (
    <button className={`button button-${variant}${className ? ` ${className}` : ''}`} {...props}>
      {icon && <Icon name={icon} size={18} />}
      <span>{children}</span>
    </button>
  );
}
