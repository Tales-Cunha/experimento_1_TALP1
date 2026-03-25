import { useNavigate } from 'react-router-dom';
import ExamForm from '../components/ExamForm';

const ExamNewPage = () => {
  const navigate = useNavigate();

  return (
    <div className="container active fade-in">
      <ExamForm
        onSuccess={() => navigate('/exams')}
        onCancel={() => navigate('/exams')}
      />
    </div>
  );
};

export default ExamNewPage;
