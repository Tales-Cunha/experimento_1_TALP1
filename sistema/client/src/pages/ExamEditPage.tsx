import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ExamForm from '../components/ExamForm';

const ExamEditPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) {
      navigate('/exams', { replace: true });
    }
  }, [id, navigate]);

  if (!id) {
    return null;
  }

  return (
    <div className="container active fade-in">
      <ExamForm
        examId={id}
        onSuccess={() => navigate(`/exams/${id}`)}
        onCancel={() => navigate(`/exams/${id}`)}
      />
    </div>
  );
};

export default ExamEditPage;