import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import type { ExamData } from '../types';
import ExamForm from '../components/ExamForm';

const ExamsPage: React.FC = () => {
  const [exams, setExams] = useState<ExamData[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/exams');
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
    if (!globalThis.confirm('Are you sure you want to delete this exam?')) return;
    try {
      await axios.delete(`/api/exams/${id}`);
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

  let content: React.ReactNode;

  if (loading) {
    content = <div className="loading">Loading exams...</div>;
  } else if (exams.length === 0) {
    content = (
      <div className="empty-state">
        <p>No exams created yet.</p>
        <Link className="btn btn-link" to="/exams/new">Create your first exam</Link>
      </div>
    );
  } else {
    content = (
      <div className="grid">
        {exams.map((exam) => (
          <div key={exam.id} className="card item-card">
            <div className="card-header">
              <span className="badge">{exam.subject}</span>
              <span className="date">{exam.date}</span>
            </div>
            <h3 className="serif">
              <Link className="exam-title-link" to={`/exams/${exam.id}`}>
                {exam.title}
              </Link>
            </h3>
            <p className="professor">Prof: {exam.professor}</p>
            <div className="card-footer" style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
              <div className="actions">
                <button
                  className="btn btn-icon"
                  onClick={() => {
                    if (exam.id) {
                      handleEdit(exam.id);
                    }
                  }}
                  title="Edit"
                >
                  Edit
                </button>
                <button
                  className="btn btn-icon danger"
                  onClick={() => {
                    if (exam.id) {
                      void handleDelete(exam.id);
                    }
                  }}
                  title="Delete"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="container active fade-in">
      <header className="page-header" style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <h1 className="serif">Exams Inventory</h1>
          <p className="hint">Manage your generated exams and question sheets.</p>
        </div>
        <Link className="btn btn-primary" style={{ marginLeft: '1rem' }} to="/exams/new">
          New Exam
        </Link>
      </header>

      {content}
    </div>
  );
};

export default ExamsPage;
