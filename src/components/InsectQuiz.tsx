import { useState, useEffect, FormEvent } from 'react';
import { Bug, RefreshCw } from 'lucide-react';
import { QuizState, AnswerHistoryEntry } from '../types/insect';
import { fetchQuizQuestion } from '../services/inaturalist';
import { InsectImage } from './InsectImage';
import { AnswerForm } from './AnswerForm';
import { ResultModal } from './ResultModal';
import { ScoreBoard } from './ScoreBoard';
import { CountrySelector } from './CountrySelector';
import { TaxonFilter } from './TaxonFilter';
import { AnswerHistory } from './AnswerHistory';

export function InsectQuiz() {
  const [selectedCountryId, setSelectedCountryId] = useState(7161);
  const [selectedTaxons, setSelectedTaxons] = useState<string[]>(['630955']);
  const [state, setState] = useState<QuizState>({
    currentQuestion: null,
    selectedAnswerId: null,
    showResult: false,
    isCorrect: false,
    score: 0,
    attempts: 0,
    isLoading: true,
  });

  const [error, setError] = useState<string | null>(null);
  const [answerHistory, setAnswerHistory] = useState<AnswerHistoryEntry[]>([]);

  const loadNewQuestion = async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    setError(null);

    try {
      const question = await fetchQuizQuestion(selectedCountryId, selectedTaxons);
      setState(prev => ({
        ...prev,
        currentQuestion: question,
        selectedAnswerId: null,
        showResult: false,
        isCorrect: false,
        isLoading: false,
      }));
    } catch (err) {
      setError('Failed to load question. Please try again.');
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleCountryChange = (countryId: number) => {
    setSelectedCountryId(countryId);
  };

  useEffect(() => {
    loadNewQuestion();
  }, [selectedCountryId, selectedTaxons]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!state.currentQuestion || state.selectedAnswerId === null) return;

    const isCorrect = state.selectedAnswerId === state.currentQuestion.correctAnswerId;

    const userAnswerOption = state.currentQuestion.options.find(
      opt => opt.id === state.selectedAnswerId
    );

    const correctAnswerOption = state.currentQuestion.options.find(
      opt => opt.id === state.currentQuestion.correctAnswerId
    );

    if (userAnswerOption && correctAnswerOption) {
      const newEntry: AnswerHistoryEntry = {
        userAnswer: userAnswerOption.name,
        correctAnswer: correctAnswerOption.name,
        isCorrect,
        observationId: state.currentQuestion.insect.id,
        timestamp: Date.now(),
      };

      setAnswerHistory(prev => [newEntry, ...prev].slice(0, 10));
    }

    setState(prev => ({
      ...prev,
      showResult: true,
      isCorrect,
      score: isCorrect ? prev.score + 1 : prev.score,
      attempts: prev.attempts + 1,
    }));
  };

  const handleNext = () => {
    loadNewQuestion();
  };

  const handleReset = () => {
    setState(prev => ({
      ...prev,
      score: 0,
      attempts: 0,
    }));
    setAnswerHistory([]);
    loadNewQuestion();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Bug size={48} className="text-green-600" />
            <h1 className="text-4xl font-bold text-gray-800">Hymenoptera Quiz</h1>
          </div>
          <p className="text-gray-600 text-lg">
            Identify ants, bees, and wasps by their scientific name
          </p>
        </header>

        <CountrySelector
          selectedCountryId={selectedCountryId}
          onCountryChange={handleCountryChange}
        />

        <TaxonFilter
          selectedTaxons={selectedTaxons}
          onTaxonsChange={setSelectedTaxons}
        />

        <ScoreBoard score={state.score} attempts={state.attempts} />

        {error && (
          <div className="max-w-2xl mx-auto mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error}</p>
            <button
              onClick={loadNewQuestion}
              className="mt-2 text-red-600 hover:text-red-800 font-medium flex items-center gap-2"
            >
              <RefreshCw size={16} />
              Try again
            </button>
          </div>
        )}

        {state.isLoading ? (
          <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-12">
            <div className="flex flex-col items-center justify-center">
              <RefreshCw size={48} className="text-green-600 animate-spin mb-4" />
              <p className="text-gray-600 text-lg">Loading question...</p>
            </div>
          </div>
        ) : state.currentQuestion ? (
          <>
            <InsectImage insect={state.currentQuestion.insect} />
            <AnswerForm
              options={state.currentQuestion.options}
              selectedAnswerId={state.selectedAnswerId}
              onAnswerSelect={(id) => setState(prev => ({ ...prev, selectedAnswerId: id }))}
              onSubmit={handleSubmit}
              onSkip={loadNewQuestion}
              disabled={state.showResult}
              correctAnswerId={state.currentQuestion.correctAnswerId}
              showResult={state.showResult}
            />
          </>
        ) : null}

        <AnswerHistory history={answerHistory} />

        {state.attempts > 0 && (
          <div className="text-center mt-8">
            <button
              onClick={handleReset}
              className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
            >
              Reset score
            </button>
          </div>
        )}

        {state.showResult && state.currentQuestion && (
          <ResultModal
            isCorrect={state.isCorrect}
            correctAnswer={state.currentQuestion.insect.taxon.name}
            commonName={state.currentQuestion.insect.taxon.preferred_common_name}
            observationId={state.currentQuestion.insect.id}
            onNext={handleNext}
          />
        )}
      </div>
    </div>
  );
}
