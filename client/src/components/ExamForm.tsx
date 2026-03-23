import React, { useState, useEffect } from 'react';
import axios from 'axios';
import type { ExamData, QuestionData } from '../types';

interface ExamFormProps {
  examId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const ExamForm: React.FC<ExamFormProps> = ({ examId, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState<ExamData>({
    title: '',
    subject: '',
    professor: '',
    date: new Date().toISOString().split('T')[0],
    identificationMode: 'letters',
    questionIds: []
  });

  const [allQuestions, setAllQuestions] = useState<QuestionData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchQuestions();
    if (examId) {
      fetchExam();
    }
  }, [examId]);

  const fetchQuestions = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/questions');
      setAllQuestions(res.data);
    } catch (err) {
      console.error('Failed to fetch questions', err);
    }
  };

  const fetchExam = async () => {
    try {
      const res = await axios.get(`http://localhost:3000/api/exams/${examId}`);
      const exam = res.data;
      setFormData({
        title: exam.title,
        subject: exam.subject,
        professor: exam.professor,
        date: exam.date,
        identificationMode: exam.identificationMode,
        questionIds: exam.questions.map((q: any) => q.id)
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load exam');
    }
  };

  const handleToggleQuestion = (id: string) => {
    setFormData(prev => {
      const current = prev.questionIds || [];
      const updated = current.includes(id)
        ? current.filter(qid => qid !== id)
        : [...current, id];
      return { ...prev, questionIds: updated };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (examId) {
        await axios.put(`http://localhost:3000/api/exams/${examId}`, formData);
      } else {
        await axios.post('http://localhost:3000/api/exams', formData);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-card">
      <h2 className="serif">{examId ? 'Edit Exam' : 'New Exam'}</h2>

      <div className="form-group">
        <label>Exam Title</label>
        <input
          type="text"
          value={formData.title}
          onChange={e => setFormData({ ...formData, title: e.target.value })}
          placeholder="e.g. Physics Midterm 2024"
          required
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Subject</label>
          <input
            type="text"
            value={formData.subject}
            onChange={e => setFormData({ ...formData, subject: e.target.value })}
            placeholder="e.g. Physics"
            required
          />
        </div>
        <div className="form-group">
          <label>Professor</label>
          <input
            type="text"
            value={formData.professor}
            onChange={e => setFormData({ ...formData, professor: e.target.value })}
            placeholder="e.g. Dr. Feynman"
            required
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Date</label>
          <input
            type="date"
            value={formData.date}
            onChange={e => setFormData({ ...formData, date: e.target.value })}
            required
          />
        </div>
        <div className="form-group">
          <label>ID Mode</label>
          <select
            value={formData.identificationMode}
            onChange={e => setFormData({ ...formData, identificationMode: e.target.value as any })}
          >
            <option value="letters">Letters (A, B, C...)</option>
            <option value="powers-of-2">Powers of 2 (1, 2, 4, 8...)</option>
          </select>
        </div>
      </div>

      <div className="form-group">
        <label>Select Questions ({formData.questionIds?.length || 0} selected)</label>
        <div className="question-selector">
          {allQuestions.map(q => (
            <div 
              key={q.id!} 
              className={`question-item ${formData.questionIds?.includes(q.id!) ? 'selected' : ''}`}
              onClick={() => handleToggleQuestion(q.id!)}
            >
              <span className="checkbox"></span>
              <span className="statement">{q.statement}</span>
            </div>
          ))}
          {allQuestions.length === 0 && <p className="hint">No questions available. Create some first.</p>}
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Saving...' : (examId ? 'Update Exam' : 'Create Exam')}
        </button>
      </div>
    </form>
  );
};

export default ExamForm;
