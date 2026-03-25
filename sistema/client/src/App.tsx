import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css'
import './Exams.css'
import QuestionsPage from './pages/QuestionsPage';
import ExamsPage from './pages/ExamsPage';
import ExamDetailPage from './pages/ExamDetailPage';
import ExamEditPage from './pages/ExamEditPage';
import ExamNewPage from './pages/ExamNewPage';
import CorrectionPage from './pages/CorrectionPage';
import { ThemeProvider } from './components/ThemeProvider';
import AppShell from './components/AppShell';

const AppContent = () => {
  return (
    <Router>
      <AppShell>
        <div className="container">
          <Routes>
            <Route path="/" element={<Navigate to="/questions" replace />} />
            <Route path="/questions" element={<QuestionsPage />} />
            <Route path="/exams" element={<ExamsPage />} />
            <Route path="/exams/new" element={<ExamNewPage />} />
            <Route path="/exams/:id" element={<ExamDetailPage />} />
            <Route path="/exams/:id/edit" element={<ExamEditPage />} />
            <Route path="/correction" element={<CorrectionPage />} />
          </Routes>
        </div>
      </AppShell>
    </Router>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  )
}

export default App

