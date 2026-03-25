import { useMemo, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import axios from 'axios';
import '../styles/correction.css';

type CorrectionMode = 'strict' | 'lenient';

type QuestionResult = {
  questionIndex: number;
  studentAnswer: string;
  correctAnswer: string;
  score: number;
};

type CorrectionResult = {
  examNumber: string;
  studentName: string;
  cpf: string;
  questions: QuestionResult[];
  finalScore: number;
  warning?: string;
};

type SortKey = 'index' | 'studentName' | 'cpf' | 'finalScore' | `q${number}`;
type SortDirection = 'asc' | 'desc';

type MappingFields = {
  examNumber: string;
  name: string;
  cpf: string;
  questions: string;
};

type UploadFieldProps = {
  id: string;
  label: string;
  file: File | null;
  isDragging: boolean;
  onChooseFile: (file: File | null) => void;
  onDragChange: (isDragging: boolean) => void;
  onClear: () => void;
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const round1 = (value: number): number => Number(value.toFixed(1));

const escapeCsv = (value: string | number): string => {
  const raw = String(value ?? '');
  const escaped = raw.replaceAll('"', '""');
  return `"${escaped}"`;
};

const UploadField = ({
  id,
  label,
  file,
  isDragging,
  onChooseFile,
  onDragChange,
  onClear,
}: UploadFieldProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const onDropFile = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    onDragChange(false);

    const droppedFile = event.dataTransfer.files?.[0] ?? null;
    onChooseFile(droppedFile);
  };

  const onDragOver = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    onDragChange(true);
  };

  const onDragLeave = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    onDragChange(false);
  };

  const openPicker = () => {
    inputRef.current?.click();
  };

  return (
    <button
      type="button"
      className={`correction-upload-zone${isDragging ? ' drag-over' : ''}`}
      onDrop={onDropFile}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onClick={openPicker}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openPicker();
        }
      }}
      aria-label={`Selecionar arquivo para ${label}`}
    >
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept=".csv,text/csv"
        className="correction-upload-input"
        onChange={(event) => onChooseFile(event.target.files?.[0] ?? null)}
      />

      {file ? (
        <div className="correction-upload-file-meta">
          <p className="file-name">{file.name}</p>
          <p className="file-size">{formatFileSize(file.size)}</p>
          <button
            type="button"
            className="file-clear-btn"
            onClick={(event) => {
              event.stopPropagation();
              onClear();
              if (inputRef.current) {
                inputRef.current.value = '';
              }
            }}
            aria-label={`Remover arquivo de ${label}`}
          >
            ×
          </button>
        </div>
      ) : (
        <>
          <div className="correction-upload-icon" aria-hidden="true">📄</div>
          <strong>{label}</strong>
          <span>Clique ou arraste o arquivo aqui</span>
        </>
      )}
    </button>
  );
};

const CorrectionPage = () => {
  const sectionOneRef = useRef<HTMLDivElement | null>(null);

  const [answerKeyFile, setAnswerKeyFile] = useState<File | null>(null);
  const [studentFile, setStudentFile] = useState<File | null>(null);
  const [draggingAnswerKey, setDraggingAnswerKey] = useState(false);
  const [draggingStudent, setDraggingStudent] = useState(false);
  const [mode, setMode] = useState<CorrectionMode>('strict');
  const [mappingExpanded, setMappingExpanded] = useState(false);
  const [mapping, setMapping] = useState<MappingFields>({
    examNumber: '',
    name: '',
    cpf: '',
    questions: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState<CorrectionResult[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('finalScore');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const hasResults = results.length > 0;

  const warnings = useMemo(
    () => results.filter((entry) => entry.warning && entry.warning.trim() !== ''),
    [results],
  );

  const questionCount = useMemo(() => {
    if (!hasResults) {
      return 0;
    }

    return results[0]?.questions?.length ?? 0;
  }, [hasResults, results]);

  const averageScore = useMemo(() => {
    if (!hasResults) {
      return 0;
    }

    const total = results.reduce((acc, item) => acc + item.finalScore, 0);
    return round1(total / results.length);
  }, [hasResults, results]);

  const approvedCount = useMemo(() => {
    if (!hasResults) {
      return 0;
    }

    return results.filter((item) => item.finalScore >= 6).length;
  }, [hasResults, results]);

  const approvedPercentage = useMemo(() => {
    if (!hasResults) {
      return 0;
    }

    return round1((approvedCount / results.length) * 100);
  }, [approvedCount, hasResults, results.length]);

  const sortedResults = useMemo(() => {
    const withIndex = results.map((item, index) => ({ item, index }));

    const direction = sortDirection === 'asc' ? 1 : -1;

    withIndex.sort((left, right) => {
      if (sortKey === 'index') {
        return (left.index - right.index) * direction;
      }

      if (sortKey === 'studentName') {
        return left.item.studentName.localeCompare(right.item.studentName, 'pt-BR') * direction;
      }

      if (sortKey === 'cpf') {
        return left.item.cpf.localeCompare(right.item.cpf, 'pt-BR') * direction;
      }

      if (sortKey === 'finalScore') {
        return (left.item.finalScore - right.item.finalScore) * direction;
      }

      const questionIndex = Number.parseInt(sortKey.slice(1), 10) - 1;
      const leftScore = left.item.questions[questionIndex]?.score ?? 0;
      const rightScore = right.item.questions[questionIndex]?.score ?? 0;

      if (leftScore !== rightScore) {
        return (leftScore - rightScore) * direction;
      }

      const leftAnswer = left.item.questions[questionIndex]?.studentAnswer ?? '';
      const rightAnswer = right.item.questions[questionIndex]?.studentAnswer ?? '';
      return leftAnswer.localeCompare(rightAnswer, 'pt-BR') * direction;
    });

    return withIndex.map((entry) => entry.item);
  }, [results, sortDirection, sortKey]);

  const sortArrow = (key: SortKey): string => {
    if (sortKey !== key) {
      return '↕';
    }

    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const setSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(key);
    setSortDirection('asc');
  };

  const hasMapping = useMemo(() => {
    return Object.values(mapping).some((value) => value.trim() !== '');
  }, [mapping]);

  const buildColumnMap = (): string | null => {
    if (!hasMapping) {
      return null;
    }

    const questions = mapping.questions
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value !== '');

    const columnMap = {
      ...(mapping.examNumber.trim() && { examNumber: mapping.examNumber.trim() }),
      ...(mapping.name.trim() && { name: mapping.name.trim() }),
      ...(mapping.cpf.trim() && { cpf: mapping.cpf.trim() }),
      ...(questions.length > 0 && { questions }),
    };

    return JSON.stringify(columnMap);
  };

  const runCorrection = async () => {
    if (!answerKeyFile || !studentFile) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('answerKeyCsv', answerKeyFile);
      formData.append('studentResponsesCsv', studentFile);
      formData.append('mode', mode);

      const maybeColumnMap = buildColumnMap();
      if (maybeColumnMap) {
        formData.append('columnMap', maybeColumnMap);
      }

      const response = await axios.post<CorrectionResult[]>('/api/correct', formData);
      setResults(response.data);
      setSortKey('finalScore');
      setSortDirection('desc');
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        setErrorMessage((error.response?.data?.error as string | undefined) ?? 'Falha ao corrigir provas.');
      } else {
        setErrorMessage('Falha ao corrigir provas.');
      }
      setResults([]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const exportCsv = () => {
    if (!hasResults) {
      return;
    }

    const headers = ['student_name', 'cpf'];
    for (let i = 0; i < questionCount; i += 1) {
      headers.push(`q${i + 1}`);
    }
    headers.push('final_score');

    const lines = [headers.join(',')];

    sortedResults.forEach((item) => {
      const row: Array<string | number> = [item.studentName, item.cpf];
      item.questions.forEach((question) => {
        row.push(question.studentAnswer);
      });
      row.push(item.finalScore.toFixed(2));
      lines.push(row.map((entry) => escapeCsv(entry)).join(','));
    });

    const blob = new Blob([`${lines.join('\n')}\n`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'relatorio-correcao.csv';
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const resetCorrection = () => {
    setAnswerKeyFile(null);
    setStudentFile(null);
    setResults([]);
    setErrorMessage(null);
    setMapping({ examNumber: '', name: '', cpf: '', questions: '' });
    setMappingExpanded(false);

    sectionOneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scoreClass = (score: number): string => {
    if (score >= 7) {
      return 'good';
    }

    if (score >= 5) {
      return 'medium';
    }

    return 'bad';
  };

  return (
    <div className="correction-page">
      <section className="correction-section-one" ref={sectionOneRef}>
        <div className="correction-card">
          <h1>Correção de Provas</h1>
          <p className="subtitle">
            Importe o gabarito e as respostas dos alunos para corrigir automaticamente.
          </p>

          <div className="correction-upload-grid">
            <UploadField
              id="answer-key-csv"
              label="Gabarito (CSV)"
              file={answerKeyFile}
              isDragging={draggingAnswerKey}
              onChooseFile={setAnswerKeyFile}
              onDragChange={setDraggingAnswerKey}
              onClear={() => setAnswerKeyFile(null)}
            />
            <UploadField
              id="students-csv"
              label="Respostas dos Alunos (CSV)"
              file={studentFile}
              isDragging={draggingStudent}
              onChooseFile={setStudentFile}
              onDragChange={setDraggingStudent}
              onClear={() => setStudentFile(null)}
            />
          </div>

          <div className="correction-mode-selector" role="radiogroup" aria-label="Modo de correção">
            <button
              type="button"
              className={`mode-card${mode === 'strict' ? ' selected' : ''}`}
              onClick={() => setMode('strict')}
              aria-pressed={mode === 'strict'}
            >
              <strong>Rigorosa</strong>
              <span>Qualquer alternativa errada zera a questão.</span>
            </button>
            <button
              type="button"
              className={`mode-card${mode === 'lenient' ? ' selected' : ''}`}
              onClick={() => setMode('lenient')}
              aria-pressed={mode === 'lenient'}
            >
              <strong>Flexível</strong>
              <span>Nota proporcional ao percentual de acertos.</span>
            </button>
          </div>

          <button
            type="button"
            className="mapping-toggle"
            onClick={() => setMappingExpanded((prev) => !prev)}
          >
            ⚙ Configurar colunas do Google Forms {mappingExpanded ? '▴' : '▾'}
          </button>

          {mappingExpanded && (
            <div className="mapping-panel">
              <h3>Mapeamento de colunas</h3>
              <p>
                Preencha apenas se as respostas vieram de um Google Forms. Use os nomes das colunas exatamente
                como aparecem na planilha exportada.
              </p>

              <div className="mapping-grid">
                <label>
                  <span>Coluna: número da prova</span>
                  <input
                    type="text"
                    placeholder="exam_number"
                    value={mapping.examNumber}
                    onChange={(event) => setMapping((prev) => ({ ...prev, examNumber: event.target.value }))}
                  />
                </label>

                <label>
                  <span>Coluna: nome do aluno</span>
                  <input
                    type="text"
                    placeholder="student_name"
                    value={mapping.name}
                    onChange={(event) => setMapping((prev) => ({ ...prev, name: event.target.value }))}
                  />
                </label>

                <label>
                  <span>Coluna: CPF</span>
                  <input
                    type="text"
                    placeholder="cpf"
                    value={mapping.cpf}
                    onChange={(event) => setMapping((prev) => ({ ...prev, cpf: event.target.value }))}
                  />
                </label>

                <label className="full-width">
                  <span>Colunas das questões (separadas por vírgula)</span>
                  <input
                    type="text"
                    placeholder="q1, q2, q3"
                    value={mapping.questions}
                    onChange={(event) => setMapping((prev) => ({ ...prev, questions: event.target.value }))}
                  />
                  <small>Ex: Resposta Q1, Resposta Q2, Resposta Q3</small>
                </label>
              </div>

              <a
                href="https://support.google.com/docs/answer/49114"
                target="_blank"
                rel="noreferrer"
              >
                Como exportar do Google Forms
              </a>
            </div>
          )}

          {errorMessage && <div className="error-banner">{errorMessage}</div>}

          <button
            type="button"
            className="btn btn-primary correction-submit-btn"
            disabled={!answerKeyFile || !studentFile || isSubmitting}
            onClick={runCorrection}
          >
            {isSubmitting && <span className="spinner" aria-hidden="true" />}
            {isSubmitting ? 'Corrigindo…' : 'Corrigir Provas'}
          </button>
        </div>
      </section>

      {warnings.length > 0 && (
        <section className="correction-warning-section">
          <div className="warning-list-banner" role="alert">
            <h3>Atenção para linhas com inconsistência</h3>
            <ul>
              {warnings.map((entry, index) => (
                <li key={`${entry.cpf}-${index}`}>
                  <strong>{entry.studentName || 'Aluno sem nome'}</strong>: {entry.warning}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <div className="correction-divider" />

      {hasResults && (
        <section className="correction-results-section fade-in-up">
          <div className="correction-summary-grid">
            <article className="summary-card">
              <p>Total de alunos</p>
              <strong>{results.length}</strong>
            </article>
            <article className="summary-card">
              <p>Média da turma</p>
              <strong className="highlight-mono">{averageScore.toFixed(1)}</strong>
            </article>
            <article className="summary-card">
              <p>Aprovados (≥6)</p>
              <strong>{approvedCount}</strong>
              <small>{approvedPercentage.toFixed(1)}%</small>
            </article>
          </div>

          <div className="table-actions">
            <button type="button" className="btn btn-secondary" onClick={exportCsv}>
              Exportar Relatório CSV
            </button>
          </div>

          <div className="results-table-wrapper">
            <table className="results-table">
              <thead>
                <tr>
                  <th>
                    <button type="button" className="sort-btn" onClick={() => setSort('index')}>
                      # <span>{sortArrow('index')}</span>
                    </button>
                  </th>
                  <th>
                    <button type="button" className="sort-btn" onClick={() => setSort('studentName')}>
                      Nome <span>{sortArrow('studentName')}</span>
                    </button>
                  </th>
                  <th>
                    <button type="button" className="sort-btn" onClick={() => setSort('cpf')}>
                      CPF <span>{sortArrow('cpf')}</span>
                    </button>
                  </th>
                  {Array.from({ length: questionCount }).map((_, index) => {
                    const key = `q${index + 1}` as SortKey;
                    return (
                      <th key={key}>
                        <button type="button" className="sort-btn" onClick={() => setSort(key)}>
                          Q{index + 1} <span>{sortArrow(key)}</span>
                        </button>
                      </th>
                    );
                  })}
                  <th>
                    <button type="button" className="sort-btn" onClick={() => setSort('finalScore')}>
                      Nota Final <span>{sortArrow('finalScore')}</span>
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedResults.map((item, rowIndex) => (
                  <tr key={`${item.cpf}-${rowIndex}`}>
                    <td>{rowIndex + 1}</td>
                    <td>{item.studentName}</td>
                    <td className="mono">{item.cpf}</td>
                    {item.questions.map((question) => {
                      const isCorrect = question.score >= 1;
                      return (
                        <td
                          key={`${item.cpf}-${question.questionIndex}`}
                          className="question-cell"
                          data-expected={`Esperado: ${question.correctAnswer || '—'}`}
                        >
                          <span className="mono">{question.studentAnswer || '—'}</span>
                          <span className={`status-icon ${isCorrect ? 'ok' : 'error'}`}>
                            {isCorrect ? '✓' : '✗'}
                          </span>
                        </td>
                      );
                    })}
                    <td className={`final-score mono ${scoreClass(item.finalScore)}`}>
                      {item.finalScore.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="new-correction-wrap">
            <button type="button" className="btn btn-secondary link-like-btn" onClick={resetCorrection}>
              Nova Correção
            </button>
          </div>
        </section>
      )}
    </div>
  );
};

export default CorrectionPage;
