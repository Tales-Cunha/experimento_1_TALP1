import React, { useState, useEffect } from 'react';
import axios from 'axios';
import QuestionForm from '../components/QuestionForm';
import type { QuestionData } from '../types.ts';

const QuestionsPage: React.FC = () => {
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<QuestionData | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [serverError, setServerError] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  const fetchQuestions = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('http://localhost:3001/api/questions');
      setQuestions(response.data);
    } catch (error: any) {
      console.error('Error fetching questions:', error);
      alert('Failed to load questions. Is the server running?');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const handleCreate = async (data: QuestionData) => {
    try {
      setServerError(undefined);
      await axios.post('http://localhost:3001/api/questions', data);
      setIsCreating(false);
      fetchQuestions();
    } catch (error: any) {
      if (error.response?.status === 422) {
        setServerError(error.response.data.error);
      } else {
        alert('An unexpected error occurred during creation.');
      }
    }
  };

  const handleUpdate = async (data: QuestionData) => {
    if (!editingQuestion?.id) return;
    try {
      setServerError(undefined);
      await axios.put(`http://localhost:3001/api/questions/${editingQuestion.id}`, data);
      setEditingQuestion(null);
      fetchQuestions();
    } catch (error: any) {
      if (error.response?.status === 422) {
        setServerError(error.response.data.error);
      } else {
        alert('An unexpected error occurred during update.');
      }
    }
  };

  const handleDelete = async (id: string, statement: string) => {
    if (window.confirm(`Are you sure you want to delete this question?\n\n"${statement}"`)) {
      try {
        await axios.delete(`http://localhost:3001/api/questions/${id}`);
        fetchQuestions();
      } catch (error) {
        console.error('Error deleting question:', error);
        alert('Failed to delete question.');
      }
    }
  };

  if (isLoading) return <div className="container">Loading questions...</div>;

  return (
    <div className="questions-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2rem' }}>
        <h1>Questions Repository</h1>
        {!isCreating && !editingQuestion && (
          <button className="primary-btn" onClick={() => setIsCreating(true)}>
            + Add New Question
          </button>
        )}
      </div>

      {(isCreating || editingQuestion) && (
        <div className="card" style={{ marginBottom: '3rem', borderTop: '4px solid var(--accent-color)' }}>
          <h2>{isCreating ? 'Draft New Question' : 'Refine Question'}</h2>
          <QuestionForm
            initialData={editingQuestion || undefined}
            onSubmit={isCreating ? handleCreate : handleUpdate}
            onCancel={() => {
              setIsCreating(false);
              setEditingQuestion(null);
              setServerError(undefined);
            }}
            serverError={serverError}
          />
        </div>
      )}

      <div className="questions-list">
        <h2>Active Inventory</h2>
        {questions.length === 0 ? (
          <p style={{ opacity: 0.6 }}>No questions found. Add one above to get started.</p>
        ) : (
          questions.map((q) => (
            <div key={q.id} className="card question-item">
              <div className="question-content">
                <p style={{ fontSize: '1.1rem', fontWeight: 500 }}>{q.statement}</p>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px', opacity: 0.6, fontSize: '0.85rem' }}>
                  <span>{q.alternatives.length} alternatives</span>
                  <span>•</span>
                  <span>{q.alternatives.filter(a => a.isCorrect).length} correct</span>
                </div>
              </div>
              <div className="question-actions">
                <button onClick={() => setEditingQuestion(q)}>Edit</button>
                <button 
                  onClick={() => handleDelete(q.id!, q.statement)} 
                  style={{ color: 'var(--error-color)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default QuestionsPage;
