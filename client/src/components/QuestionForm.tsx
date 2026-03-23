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
      {validationError && <div className="error-message" style={{ color: 'red', marginBottom: '10px' }}>{validationError}</div>}
      
      <div className="form-group">
        <label htmlFor="statement">Statement:</label>
        <textarea
          id="statement"
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
          required
          style={{ width: '100%', minHeight: '100px' }}
        />
      </div>

      <div className="alternatives-section">
        <h3>Alternatives</h3>
        {alternatives.map((alt, index) => (
          <div key={index} className="alternative-item" style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
            <input
              type="text"
              placeholder={`Alternative ${index + 1}`}
              value={alt.description}
              onChange={(e) => handleAlternativeChange(index, 'description', e.target.value)}
              required
              style={{ flex: 1 }}
            />
            <label>
              <input
                type="checkbox"
                checked={alt.isCorrect}
                onChange={(e) => handleAlternativeChange(index, 'isCorrect', e.target.checked)}
              />
              Correct
            </label>
            {alternatives.length > 2 && (
              <button type="button" onClick={() => handleRemoveAlternative(index)}>Remove</button>
            )}
          </div>
        ))}
        <button type="button" onClick={handleAddAlternative}>Add Alternative</button>
      </div>

      <div className="form-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
        <button type="submit">Save Question</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
};

export default QuestionForm;
