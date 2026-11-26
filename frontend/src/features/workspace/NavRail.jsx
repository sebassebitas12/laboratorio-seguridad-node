import Brand from '../../components/Brand.jsx';
import Icon from '../../components/Icon.jsx';

const navigation = [
  { id: 'notes', label: 'Mis notas', icon: 'notes' },
  { id: 'profile', label: 'Mi perfil', icon: 'profile' },
  { id: 'admin', label: 'Administración', icon: 'admin', adminOnly: true },
];

export default function NavRail({ user, activeView, onNavigate, onLogout }) {
  return (
    <aside className="nav-rail">
      <Brand light compact />
      <nav className="rail-navigation" aria-label="Navegación principal">
        {navigation.filter((item) => !item.adminOnly || user.role === 'admin').map((item) => (
          <button
            key={item.id}
            type="button"
            className={`rail-link${activeView === item.id ? ' rail-link-active' : ''}`}
            aria-current={activeView === item.id ? 'page' : undefined}
            aria-label={item.label}
            title={item.label}
            onClick={() => onNavigate(item.id)}
          >
            <Icon name={item.icon} size={21} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="rail-account">
        <div className="account-monogram" aria-hidden="true">{user.name.trim().slice(0, 1).toUpperCase()}</div>
        <div className="rail-account-copy"><strong>{user.name}</strong><span>Sesión iniciada</span></div>
        <button className="rail-logout" type="button" onClick={onLogout} aria-label="Cerrar sesión" title="Cerrar sesión">
          <Icon name="exit" size={19} />
        </button>
      </div>
    </aside>
  );
}
