import { CheckCircle, XCircle, ArrowRight, ExternalLink } from 'lucide-react';
import { InsectObservation } from '../types/insect';

interface ResultModalProps {
  isCorrect: boolean;
  correctAnswer: string;
  commonName?: string;
  observationId: number;
  onNext: () => void;
}

export function ResultModal({ isCorrect, correctAnswer, commonName, observationId, onNext }: ResultModalProps) {
  const observationUrl = `https://www.inaturalist.org/observations/${observationId}`;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full animate-scale-in">
        <div className="text-center">
          {isCorrect ? (
            <>
              <CheckCircle size={64} className="mx-auto text-green-500 mb-4" />
              <h2 className="text-3xl font-bold text-green-600 mb-2">Верно!</h2>
              <p className="text-gray-600 mb-4">
                Вы правильно определили насекомое!
              </p>
            </>
          ) : (
            <>
              <XCircle size={64} className="mx-auto text-red-500 mb-4" />
              <h2 className="text-3xl font-bold text-red-600 mb-2">Не угадали!</h2>
              <p className="text-gray-600 mb-4">
                Правильный ответ:
              </p>
            </>
          )}

          <div className="bg-gray-50 rounded-lg p-4 mb-2">
            <p className="text-xl font-semibold text-gray-800 italic">
              {correctAnswer}
            </p>
            {commonName && (
              <p className="text-sm text-gray-600 mt-1">
                ({commonName})
              </p>
            )}
          </div>

          <a
            href={observationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium transition-colors mb-4"
          >
            <ExternalLink size={16} />
            Посмотреть наблюдение на iNaturalist
          </a>

          <button
            onClick={onNext}
            className="mt-2 w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-lg font-medium"
          >
            Следующее насекомое
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
