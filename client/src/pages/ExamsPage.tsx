import React, { useState, useEffect } from 'react';
import axios from 'axios';
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
      const res = await axios.get('http://localhost:3000/api/exams');
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
      await axios.delete(`http://localhost:3000/api/exams/${id}`);
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
              <div className="card-footer">
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
    </div>
  );
};

export default ExamsPage;
