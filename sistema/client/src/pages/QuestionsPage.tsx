import React, { useState, useEffect } from 'react';
import axios from 'axios';
import QuestionForm from '../components/QuestionForm';
import type { QuestionData } from '../types.ts';

const QuestionsPage: React.FC = () => {
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<QuestionData | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [serverError, setServerError] = useState<string | undefined>();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchQuestions = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('/api/questions');
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
      await axios.post('/api/questions', data);
      setIsCreating(false);
      setSuccessMessage('Questão salva com sucesso.');
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
      await axios.put(`/api/questions/${editingQuestion.id}`, data);
      setEditingQuestion(null);
      setSuccessMessage('Questão salva com sucesso.');
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
    if (globalThis.confirm(`Deseja excluir esta questão?\n\n"${statement}"`)) {
      try {
        await axios.delete(`/api/questions/${id}`);
        setSuccessMessage('Questão excluída com sucesso.');
        fetchQuestions();
      } catch (error) {
        console.error('Error deleting question:', error);
        alert('Failed to delete question.');
      }
    }
  };

  if (isLoading) return <div className="container">Carregando questões...</div>;

  return (
    <div className="questions-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2rem' }}>
        <h1>Banco de Questões</h1>
        {!isCreating && !editingQuestion && (
          <button className="primary-btn" onClick={() => {
            setSuccessMessage(null);
            setIsCreating(true);
          }}>
            + Nova Questão
          </button>
        )}
      </div>

      {successMessage && (
        <output className="card" aria-live="polite" style={{ marginBottom: '1rem', borderLeft: '4px solid #10b981' }}>
          {successMessage}
        </output>
      )}

      {(isCreating || editingQuestion) && (
        <div className="card" style={{ marginBottom: '3rem', borderTop: '4px solid var(--accent-color)' }}>
          <h2>{isCreating ? 'Nova Questão' : 'Editar Questão'}</h2>
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
        <h2>Questões Cadastradas</h2>
        {questions.length === 0 ? (
          <p style={{ opacity: 0.6 }}>Nenhuma questão cadastrada.</p>
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
                <button onClick={() => {
                  setSuccessMessage(null);
                  setEditingQuestion(q);
                }}>
                  Editar
                </button>
                <button 
                  onClick={() => {
                    if (q.id) {
                      void handleDelete(q.id, q.statement);
                    }
                  }} 
                  style={{ color: 'var(--error-color)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                >
                  Excluir
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
