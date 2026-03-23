import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import './App.css'
import QuestionsPage from './pages/QuestionsPage';

function App() {
  return (
    <Router>
      <nav style={{ padding: '10px', background: '#eee', marginBottom: '20px' }}>
        <Link to="/questions" style={{ marginRight: '10px' }}>Questions</Link>
      </nav>

      <Routes>
        <Route path="/" element={<Navigate to="/questions" replace />} />
        <Route path="/questions" element={<QuestionsPage />} />
      </Routes>
    </Router>
  )
}

export default App
