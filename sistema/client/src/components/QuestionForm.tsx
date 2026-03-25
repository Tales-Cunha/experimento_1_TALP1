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
      { description: '', isCorrect: true },
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
      return;
    }

    await onSubmit({ statement, alternatives });
  };

  return (
    <form onSubmit={handleSubmit} className="question-form">
      {validationError && (
        <div className="error-banner" role="alert">
          {validationError}
        </div>
      )}
      
      <div style={{ marginBottom: '1.5rem' }}>
        <label htmlFor="statement" style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>
          Enunciado
        </label>
        <textarea
          id="statement"
          placeholder="Digite o enunciado da questão..."
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
          required
          rows={4}
        />
      </div>

      <div className="alternatives-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>Alternativas</h3>
          <button type="button" onClick={handleAddAlternative} className="primary-btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}>
            + Adicionar Alternativa
          </button>
        </div>
        
        {alternatives.map((alt, index) => (
          <div
            key={`${alt.id ?? 'new'}-${alt.description}-${alt.isCorrect ? '1' : '0'}`}
            className="alternative-item"
            style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}
          >
            <div style={{ flex: 1 }}>
              <input
                type="text"
                placeholder={`Alternativa ${index + 1}`}
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
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Correta</span>
            </label>
            {alternatives.length > 1 && (
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
        <button type="button" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="primary-btn">Salvar Questão</button>
      </div>
    </form>
  );
};

export default QuestionForm;
