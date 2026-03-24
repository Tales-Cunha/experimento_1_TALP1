import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { ExamData } from '../types';

interface GenerateResponse {
  zipBase64: string;
  csv: string;
}

interface GeneratedFiles {
  zipBlob: Blob;
  csvBlob: Blob;
  zipName: string;
  csvName: string;
}

const MIN_COPIES = 1;
const MAX_COPIES = 200;

const slugify = (value: string): string => {
  const lower = value.toLowerCase();
  let result = '';
  let prevDash = false;

  for (const char of lower) {
    const isAlphaNum = (char >= 'a' && char <= 'z') || (char >= '0' && char <= '9');
    if (isAlphaNum) {
      result += char;
      prevDash = false;
      continue;
    }

    if (!prevDash && result.length > 0) {
      result += '-';
      prevDash = true;
    }
  }

  if (result.endsWith('-')) {
    result = result.slice(0, -1);
  }

  return result.length > 0 ? result : 'prova';
};

const base64ToBlob = (base64: string, type: string): Blob => {
  const binary = atob(base64);
  const length = binary.length;
  const bytes = new Uint8Array(length);

  for (let i = 0; i < length; i += 1) {
    bytes[i] = binary.codePointAt(i) ?? 0;
  }

  return new Blob([bytes], { type });
};

const downloadBlob = (blob: Blob, fileName: string): void => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

const formatDate = (value: string): string => {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString('pt-BR');
};

const ExamDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [exam, setExam] = useState<ExamData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [copies, setCopies] = useState<number>(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFiles | null>(null);

  useEffect(() => {
    const fetchExam = async () => {
      if (!id) {
        setLoadError('Prova não encontrada.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setLoadError(null);

      try {
        const response = await axios.get<ExamData>(`/api/exams/${id}`);
        setExam(response.data);
      } catch (error: unknown) {
        const message = axios.isAxiosError(error)
          ? (error.response?.data?.error as string | undefined) ?? 'Falha ao carregar prova.'
          : 'Falha ao carregar prova.';
        setLoadError(message);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchExam();
  }, [id]);

  const questionCount = exam?.questions?.length ?? 0;
  const modeLabel = exam?.identificationMode === 'powers-of-2' ? 'Potências de 2' : 'Letras';

  const breadcrumbTitle = useMemo(() => {
    if (isLoading) {
      return 'Carregando…';
    }
    return exam?.title ?? 'Detalhe da prova';
  }, [exam?.title, isLoading]);

  const toggleQuestion = (index: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const setCopiesClamped = (value: number) => {
    const normalized = Number.isNaN(value) ? MIN_COPIES : Math.min(MAX_COPIES, Math.max(MIN_COPIES, value));
    setCopies(normalized);
  };

  const handleGenerate = async () => {
    if (!id || !exam) {
      return;
    }

    setIsGenerating(true);
    setGenerateError(null);
    setGeneratedFiles(null);

    try {
      const response = await axios.post<GenerateResponse>(`/api/exams/${id}/generate`, {
        count: copies,
      });

      const safeTitle = slugify(exam.title);
      const zipBlob = base64ToBlob(response.data.zipBase64, 'application/zip');
      const csvBlob = new Blob([response.data.csv], { type: 'text/csv;charset=utf-8' });

      setGeneratedFiles({
        zipBlob,
        csvBlob,
        zipName: `provas-${safeTitle}.zip`,
        csvName: `gabarito-${safeTitle}.csv`,
      });
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.error as string | undefined) ?? 'Não foi possível gerar as provas.'
        : 'Não foi possível gerar as provas.';
      setGenerateError(message);
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return <div className="exam-detail-page">Carregando prova…</div>;
  }

  if (loadError || !exam) {
    return (
      <div className="exam-detail-page">
        <div className="exam-detail-error-banner" role="alert">
          {loadError ?? 'Prova não encontrada.'}
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => navigate('/exams')}>
          Voltar para Provas
        </button>
      </div>
    );
  }

  return (
    <div className="exam-detail-page">
      <header className="exam-detail-topbar">
        <p className="exam-detail-breadcrumb">
          <Link to="/exams">Provas</Link>
          <span>&nbsp;&gt;&nbsp;</span>
          <strong>{breadcrumbTitle}</strong>
        </p>
        <button
          type="button"
          className="btn btn-secondary exam-detail-edit-btn"
          onClick={() => navigate(`/exams/${exam.id}/edit`)}
        >
          Editar
        </button>
      </header>

      <section className="exam-summary-card">
        <h1>{exam.title}</h1>
        <div className="exam-summary-grid">
          <div>
            <span className="exam-meta-label">Disciplina</span>
            <span className="exam-meta-value">{exam.subject}</span>
          </div>
          <div>
            <span className="exam-meta-label">Professor</span>
            <span className="exam-meta-value">{exam.professor}</span>
          </div>
          <div>
            <span className="exam-meta-label">Data</span>
            <span className="exam-meta-value">{formatDate(exam.date)}</span>
          </div>
          <div>
            <span className="exam-meta-label">Modo de identificação</span>
            <span className="exam-meta-value">{modeLabel}</span>
          </div>
        </div>
        <p className="exam-summary-subtitle">Composta por {questionCount} questões</p>
      </section>

      <section className="exam-questions-panel">
        <h2 className="exam-section-title">Prévia das questões</h2>

        <div className="exam-accordion">
          {(exam.questions ?? []).map((question, index) => {
            const isExpanded = expanded.has(index);
            return (
              <article key={question.id ?? `${question.statement}-${index}`} className="exam-accordion-item">
                <button
                  type="button"
                  className="exam-accordion-trigger"
                  onClick={() => toggleQuestion(index)}
                  aria-expanded={isExpanded}
                >
                  <span className="question-number-badge">{index + 1}</span>
                  <span className={`question-statement-preview${isExpanded ? ' expanded' : ''}`}>
                    {question.statement}
                  </span>
                  <span className={`accordion-arrow${isExpanded ? ' open' : ''}`} aria-hidden="true">
                    ▾
                  </span>
                </button>

                {isExpanded && (
                  <div className="exam-accordion-content">
                    <p className="full-statement">{question.statement}</p>
                    <ul>
                      {question.alternatives.map((alternative, altIndex) => {
                        const prefix = exam.identificationMode === 'letters'
                          ? `${String.fromCodePoint(65 + altIndex)})`
                          : `${2 ** altIndex}`;

                        return (
                          <li key={alternative.id ?? `${alternative.description}-${altIndex}`}>
                            <span className="alt-prefix">{prefix}</span>
                            <span className="alt-text">{alternative.description}</span>
                            <span className={`alt-correctness ${alternative.isCorrect ? 'correct' : 'wrong'}`}>
                              {alternative.isCorrect ? '✓' : '✗'}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section className="generate-panel">
        <h2 className="exam-section-title">Gerar Provas Individuais</h2>
        <p className="generate-description">
          Cada prova terá as questões e alternativas embaralhadas em ordem diferente.
        </p>

        <div className="copies-control">
          <label htmlFor="copies-input">Número de cópias</label>
          <div className="copies-stepper">
            <button
              type="button"
              className="stepper-btn"
              onClick={() => setCopiesClamped(copies - 1)}
              disabled={isGenerating}
              aria-label="Diminuir cópias"
            >
              −
            </button>
            <span id="copies-input" className="copies-display">
              {copies}
            </span>
            <button
              type="button"
              className="stepper-btn"
              onClick={() => setCopiesClamped(copies + 1)}
              disabled={isGenerating}
              aria-label="Aumentar cópias"
            >
              +
            </button>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-primary generate-btn"
          onClick={handleGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? 'Gerando provas… (pode demorar alguns segundos)' : 'Gerar e Baixar'}
        </button>

        {generateError && (
          <div className="generate-error-banner" role="alert">
            <span>{generateError}</span>
            <button type="button" className="retry-link" onClick={handleGenerate}>
              Tentar novamente
            </button>
          </div>
        )}

        {generatedFiles && (
          <div className="download-chips">
            <button
              type="button"
              className="file-chip"
              onClick={() => downloadBlob(generatedFiles.zipBlob, generatedFiles.zipName)}
            >
              <span className="file-icon" aria-hidden="true">📄</span>
              <span className="file-name">{generatedFiles.zipName}</span>
              <span className="file-action">Baixar</span>
            </button>
            <button
              type="button"
              className="file-chip"
              onClick={() => downloadBlob(generatedFiles.csvBlob, generatedFiles.csvName)}
            >
              <span className="file-icon" aria-hidden="true">📊</span>
              <span className="file-name">{generatedFiles.csvName}</span>
              <span className="file-action">Baixar</span>
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

export default ExamDetailPage;