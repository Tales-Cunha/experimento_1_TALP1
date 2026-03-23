import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import './App.css'
import QuestionsPage from './pages/QuestionsPage';
import { ThemeProvider, useTheme } from './components/ThemeProvider';

const Navigation = () => {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <nav>
      <div className="nav-links">
        <NavLink to="/questions" className={({ isActive }) => isActive ? 'active' : ''}>
          Questions
        </NavLink>
      </div>
      <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle Theme">
        {theme === 'light' ? '🌙' : '☀️'}
      </button>
    </nav>
  );
};

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Navigation />
        <main className="container">
          <Routes>
            <Route path="/" element={<Navigate to="/questions" replace />} />
            <Route path="/questions" element={<QuestionsPage />} />
          </Routes>
        </main>
      </Router>
    </ThemeProvider>
  )
}

export default App
