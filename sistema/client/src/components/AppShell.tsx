import { NavLink } from 'react-router-dom';
import type { PropsWithChildren } from 'react';
import { useTheme } from './ThemeProvider';

const AppShell = ({ children }: PropsWithChildren) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div>
          <h1 className="app-brand">Exam Tool</h1>
          <p className="app-brand-subtitle">Gerenciamento e correção</p>
        </div>

        <nav className="app-nav" aria-label="Navegação principal">
          <NavLink to="/questions" className={({ isActive }) => `app-nav-link${isActive ? ' active' : ''}`}>
            Perguntas
          </NavLink>
          <NavLink to="/exams" className={({ isActive }) => `app-nav-link${isActive ? ' active' : ''}`}>
            Provas
          </NavLink>
          <NavLink to="/correction" className={({ isActive }) => `app-nav-link${isActive ? ' active' : ''}`}>
            Correção
          </NavLink>
        </nav>

        <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle Theme">
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </aside>

      <main className="app-shell-main">{children}</main>
    </div>
  );
};

export default AppShell;
