import React, { useState, useEffect } from 'react';
import type { AlternativeData, QuestionData } from '../types.ts';

interface QuestionFormProps {
  initialData?: QuestionData;
  onSubmit: (data: QuestionData) => Promise<void>;
  onCancel: () => void;
  serverError?: string;
}

const QuestionForm: React.FC<QuestionFormProps> = ({ initialData, onSubmit, onCancel, serverError }) => {
  const [statement, setStatement] = useState(initialData?.statement || '');
  const [alternatives, setAlternatives] = useState<AlternativeData[]>(
    initialData?.alternatives || [
      { description: '', isCorrect: false },
      { description: '', isCorrect: false },
    ]
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (serverError) {
      setValidationError(serverError);
    }
  }, [serverError]);

  const handleAddAlternative = () => {
    setAlternatives([...alternatives, { description: '', isCorrect: false }]);
  };

  const handleRemoveAlternative = (index: number) => {
    setAlternatives(alternatives.filter((_, i) => i !== index));
  };

  const handleAlternativeChange = (index: number, field: keyof AlternativeData, value: string | boolean) => {
    const newAlternatives = [...alternatives];
    newAlternatives[index] = { ...newAlternatives[index], [field]: value };
    setAlternatives(newAlternatives);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Basic client-side validation
    if (!statement.trim()) {
      setValidationError('Statement is required.');
      return;
    }
    if (alternatives.length < 2) {
      setValidationError('At least two alternatives are required.');
      return;
    }
    if (!alternatives.some(alt => alt.isCorrect)) {
      setValidationError('At least one alternative must be marked as correct.');
    }

    try {
      await onSubmit({ statement, alternatives });
    } catch (err: any) {
      // Errors are handled by the parent through serverError prop or re-thrown
    }
  };

  return (
    <form onSubmit={handleSubmit} className="question-form">
      {validationError && (
        <div className="error-banner">
          {validationError}
        </div>
      )}
      
      <div style={{ marginBottom: '1.5rem' }}>
        <label htmlFor="statement" style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>
          Statement
        </label>
        <textarea
          id="statement"
          placeholder="Enter the question statement here..."
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
          required
          rows={4}
        />
      </div>

      <div className="alternatives-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>Alternatives</h3>
          <button type="button" onClick={handleAddAlternative} className="primary-btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}>
            + Add Option
          </button>
        </div>
        
        {alternatives.map((alt, index) => (
          <div key={index} className="alternative-item" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <input
                type="text"
                placeholder={`Option ${index + 1}`}
                value={alt.description}
                onChange={(e) => handleAlternativeChange(index, 'description', e.target.value)}
                required
              />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <input
                type="checkbox"
                checked={alt.isCorrect}
                onChange={(e) => handleAlternativeChange(index, 'isCorrect', e.target.checked)}
                style={{ width: 'auto', margin: 0 }}
              />
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Correct</span>
            </label>
            {alternatives.length > 2 && (
              <button 
                type="button" 
                onClick={() => handleRemoveAlternative(index)}
                style={{ color: 'var(--error-color)', padding: '0.4rem', border: 'none', background: 'transparent' }}
                title="Remove"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="form-actions" style={{ marginTop: '2.5rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
        <button type="button" onClick={onCancel}>discard changes</button>
        <button type="submit" className="primary-btn">publish question</button>
      </div>
    </form>
  );
};

export default QuestionForm;
