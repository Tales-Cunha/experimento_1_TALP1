import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import './App.css'
import './Exams.css'
import QuestionsPage from './pages/QuestionsPage';
import ExamsPage from './pages/ExamsPage';
import ExamDetailPage from './pages/ExamDetailPage';
import ExamEditPage from './pages/ExamEditPage';
import { ThemeProvider, useTheme } from './components/ThemeProvider';

const Navigation = () => {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <nav>
      <div className="nav-links">
        <NavLink to="/questions" className={({ isActive }) => isActive ? 'active' : ''}>
          Questions
        </NavLink>
        <NavLink to="/exams" className={({ isActive }) => isActive ? 'active' : ''}>
          Exams
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
            <Route path="/exams" element={<ExamsPage />} />
            <Route path="/exams/:id" element={<ExamDetailPage />} />
            <Route path="/exams/:id/edit" element={<ExamEditPage />} />
          </Routes>
        </main>
      </Router>
    </ThemeProvider>
  )
}

export default App

