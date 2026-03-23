import React, { useState, useEffect } from 'react';
import axios from 'axios';
import type { ExamData } from '../types';
import ExamForm from '../components/ExamForm';

const ExamView: React.FC<{ examId: string; onDismiss: () => void }> = ({ examId, onDismiss }) => {
  const [exam, setExam] = useState<ExamData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExamDetails = async () => {
      try {
        const res = await axios.get(`http://localhost:3001/api/exams/${examId}`);
        setExam(res.data);
      } catch (err) {
        console.error('Failed to fetch exam details', err);
      } finally {
        setLoading(false);
      }
    };
    fetchExamDetails();
  }, [examId]);

  if (loading) return <div className="exam-view-overlay"><div className="exam-view-modal" style={{padding: '40px'}}>Loading...</div></div>;
  if (!exam) return null;

  const getAltId = (index: number) => {
    if (exam.identificationMode === 'letters') {
      return String.fromCharCode(65 + index) + ')';
    }
    return Math.pow(2, index).toString();
  };

  return (
    <div className="exam-view-overlay" onClick={onDismiss}>
      <div className="exam-view-modal" onClick={e => e.stopPropagation()}>
        <div className="exam-view-content">
          <div className="exam-header-display">
            <h1>{exam.title}</h1>
            <div className="exam-meta-grid">
              <span>Subject: {exam.subject}</span>
              <span>Date: {exam.date}</span>
              <span>Professor: {exam.professor}</span>
              <span>ID Mode: {exam.identificationMode}</span>
            </div>
          </div>

          <div className="questions-display">
            {exam.questions?.map((q, qIdx) => (
              <div key={q.id} className="question-display">
                <div className="question-statement">
                  <span>{qIdx + 1}.</span>
                  <span>{q.statement}</span>
                </div>
                <div className="alternatives-display">
                  {q.alternatives.map((alt, aIdx) => (
                    <div key={alt.id} className="alt-line">
                      <span className="alt-id">{getAltId(aIdx)}</span>
                      <span>{alt.description}</span>
                    </div>
                  ))}
                </div>
                <div className="student-answer-area">
                  <p>
                    {exam.identificationMode === 'letters' 
                      ? 'Indicate selected letters:' 
                      : 'Sum of marked alternatives:'}
                  </p>
                  <div className="answer-box"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onDismiss}>Close Preview</button>
        </div>
      </div>
    </div>
  );
};

const ExamsPage: React.FC = () => {
  const [exams, setExams] = useState<ExamData[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [viewingExamId, setViewingExamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:3001/api/exams');
      setExams(res.data);
    } catch (err) {
      console.error('Failed to fetch exams', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (id: string) => {
    setEditingExamId(id);
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this exam?')) return;
    try {
      await axios.delete(`http://localhost:3001/api/exams/${id}`);
      fetchExams();
    } catch (err) {
      console.error('Failed to delete exam', err);
    }
  };

  if (isEditing) {
    return (
      <div className="container active fade-in">
        <ExamForm
          examId={editingExamId || undefined}
          onSuccess={() => {
            setIsEditing(false);
            setEditingExamId(null);
            fetchExams();
          }}
          onCancel={() => {
            setIsEditing(false);
            setEditingExamId(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="container active fade-in">
      <header className="page-header">
        <div>
          <h1 className="serif">Exams Inventory</h1>
          <p className="hint">Manage your generated exams and question sheets.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsEditing(true)}>
          New Exam
        </button>
      </header>

      {loading ? (
        <div className="loading">Loading exams...</div>
      ) : exams.length === 0 ? (
        <div className="empty-state">
          <p>No exams created yet.</p>
          <button className="btn btn-link" onClick={() => setIsEditing(true)}>
            Create your first exam
          </button>
        </div>
      ) : (
        <div className="grid">
          {exams.map((exam) => (
            <div key={exam.id} className="card item-card">
              <div className="card-header">
                <span className="badge">{exam.subject}</span>
                <span className="date">{exam.date}</span>
              </div>
              <h3 className="serif">{exam.title}</h3>
              <p className="professor">Prof: {exam.professor}</p>
              <div className="card-footer" style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button className="btn btn-link" onClick={() => setViewingExamId(exam.id!)}>View Exam</button>
                <div className="actions">
                  <button className="btn btn-icon" onClick={() => handleEdit(exam.id!)} title="Edit">
                    Edit
                  </button>
                  <button className="btn btn-icon danger" onClick={() => handleDelete(exam.id!)} title="Delete">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewingExamId && (
        <ExamView examId={viewingExamId} onDismiss={() => setViewingExamId(null)} />
      )}
    </div>
  );
};

export default ExamsPage;
