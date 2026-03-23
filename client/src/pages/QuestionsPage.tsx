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

  if (isLoading) return <div>Loading questions...</div>;

  return (
    <div className="questions-page" style={{ padding: '20px' }}>
      <h1>Questions Management</h1>
      
      {!isCreating && !editingQuestion && (
        <button onClick={() => setIsCreating(true)} style={{ marginBottom: '20px' }}>
          Add New Question
        </button>
      )}

      {(isCreating || editingQuestion) && (
        <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px', marginBottom: '20px' }}>
          <h2>{isCreating ? 'Create New Question' : 'Edit Question'}</h2>
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
        <h2>All Questions</h2>
        {questions.length === 0 ? (
          <p>No questions found. Add one above.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f4f4f4' }}>
                <th style={{ textAlign: 'left', padding: '10px', borderBottom: '1px solid #ddd' }}>Statement</th>
                <th style={{ textAlign: 'center', padding: '10px', borderBottom: '1px solid #ddd', width: '150px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((q) => (
                <tr key={q.id}>
                  <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>{q.statement}</td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #ddd', textAlign: 'center' }}>
                    <button onClick={() => setEditingQuestion(q)} style={{ marginRight: '5px' }}>Edit</button>
                    <button onClick={() => handleDelete(q.id!, q.statement)} style={{ color: 'red' }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default QuestionsPage;
