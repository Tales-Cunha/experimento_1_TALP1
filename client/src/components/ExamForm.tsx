import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import type { ExamData, QuestionData, IdentificationMode } from '../types';

interface ExamFormProps {
  examId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

interface ValidationErrors {
  title?: string;
  subject?: string;
  professor?: string;
  date?: string;
  questionIds?: string;
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
  const [search, setSearch] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchQuestions();
    if (examId) {
      fetchExam();
    }
  }, [examId]);

  const fetchQuestions = async () => {
    try {
      const res = await axios.get('http://localhost:3001/api/questions');
      setAllQuestions(res.data);
    } catch (err) {
      console.error('Failed to fetch questions', err);
    }
  };

  const fetchExam = async () => {
    try {
      const res = await axios.get(`http://localhost:3001/api/exams/${examId}`);
      const exam = res.data;
      setFormData({
        title: exam.title,
        subject: exam.subject,
        professor: exam.professor,
        date: exam.date,
        identificationMode: exam.identificationMode as IdentificationMode,
        questionIds: exam.questions.map((q: any) => q.id)
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load exam');
    }
  };

  const filteredQuestions = useMemo(() => {
    return allQuestions.filter(q => 
      q.statement.toLowerCase().includes(search.toLowerCase())
    );
  }, [allQuestions, search]);

  const validate = (): ValidationErrors => {
    const errors: ValidationErrors = {};
    if (!formData.title.trim()) errors.title = 'Title is required';
    if (!formData.subject.trim()) errors.subject = 'Subject is required';
    if (!formData.professor.trim()) errors.professor = 'Professor name is required';
    if (!formData.date) errors.date = 'Date is required';
    if (!formData.questionIds || formData.questionIds.length === 0) {
      errors.questionIds = 'Select at least one question';
    }
    return errors;
  };

  const errors = validate();

  const handleToggleQuestion = (id: string) => {
    setFormData(prev => {
      const current = prev.questionIds || [];
      const updated = current.includes(id)
        ? current.filter(qid => qid !== id)
        : [...current, id];
      return { ...prev, questionIds: updated };
    });
    setTouched(prev => ({ ...prev, questionIds: true }));
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({
      title: true,
      subject: true,
      professor: true,
      date: true,
      questionIds: true
    });

    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    setError(null);

    try {
      if (examId) {
        await axios.put(`http://localhost:3001/api/exams/${examId}`, formData);
      } else {
        await axios.post('http://localhost:3001/api/exams', formData);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-card" noValidate>
      <h2 className="serif">{examId ? 'Refine Exam' : 'Draft New Exam'}</h2>

      <div className={`form-group ${touched.title && errors.title ? 'invalid' : ''}`}>
        <label>Exam Title</label>
        <input
          type="text"
          value={formData.title}
          onChange={e => setFormData({ ...formData, title: e.target.value })}
          onBlur={() => handleBlur('title')}
          placeholder="e.g. Physics Midterm 2024"
        />
        <span className="invalid-feedback">{touched.title && errors.title}</span>
      </div>

      <div className="form-row">
        <div className={`form-group ${touched.subject && errors.subject ? 'invalid' : ''}`}>
          <label>Subject</label>
          <input
            type="text"
            value={formData.subject}
            onChange={e => setFormData({ ...formData, subject: e.target.value })}
            onBlur={() => handleBlur('subject')}
            placeholder="e.g. Physics"
          />
          <span className="invalid-feedback">{touched.subject && errors.subject}</span>
        </div>
        <div className={`form-group ${touched.professor && errors.professor ? 'invalid' : ''}`}>
          <label>Professor</label>
          <input
            type="text"
            value={formData.professor}
            onChange={e => setFormData({ ...formData, professor: e.target.value })}
            onBlur={() => handleBlur('professor')}
            placeholder="e.g. Dr. Feynman"
          />
          <span className="invalid-feedback">{touched.professor && errors.professor}</span>
        </div>
      </div>

      <div className="form-row">
        <div className={`form-group ${touched.date && errors.date ? 'invalid' : ''}`}>
          <label>Date</label>
          <input
            type="date"
            value={formData.date}
            onChange={e => setFormData({ ...formData, date: e.target.value })}
            onBlur={() => handleBlur('date')}
          />
          <span className="invalid-feedback">{touched.date && errors.date}</span>
        </div>
        <div className="form-group">
          <label>Identification Mode</label>
          <div className="radio-group">
            <label className="radio-option">
              <input
                type="radio"
                name="identificationMode"
                checked={formData.identificationMode === 'letters'}
                onChange={() => setFormData({ ...formData, identificationMode: 'letters' })}
              />
              Letters (A-Z)
            </label>
            <label className="radio-option">
              <input
                type="radio"
                name="identificationMode"
                checked={formData.identificationMode === 'powers-of-2'}
                onChange={() => setFormData({ ...formData, identificationMode: 'powers-of-2' })}
              />
              Powers (2^n)
            </label>
          </div>
        </div>
      </div>

      <div className={`form-group ${touched.questionIds && errors.questionIds ? 'invalid' : ''}`}>
        <label>Select Questions ({formData.questionIds?.length || 0} selected)</label>
        <div className="question-selector">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search statements..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {filteredQuestions.map(q => (
            <div 
              key={q.id!} 
              className={`question-item ${formData.questionIds?.includes(q.id!) ? 'selected' : ''}`}
              onClick={() => handleToggleQuestion(q.id!)}
            >
              <span className="checkbox"></span>
              <span className="statement">{q.statement}</span>
            </div>
          ))}
          {filteredQuestions.length === 0 && <p className="hint" style={{ padding: '16px' }}>No matching questions found.</p>}
        </div>
        <span className="invalid-feedback">{touched.questionIds && errors.questionIds}</span>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Discard</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Processing...' : (examId ? 'Apply Changes' : 'Confirm Exam')}
        </button>
      </div>
    </form>
  );
};

export default ExamForm;
