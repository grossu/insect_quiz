import { ExternalLink, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { AnswerHistoryEntry } from '../types/insect';

interface AnswerHistoryProps {
  history: AnswerHistoryEntry[];
}

export function AnswerHistory({ history }: AnswerHistoryProps) {
  if (history.length === 0) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto mt-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">
        История ответов
      </h2>
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="divide-y divide-gray-200">
          {history.map((entry) => (
            <div
              key={entry.timestamp}
              className={`px-4 py-3 transition-colors ${
                entry.isCorrect ? 'bg-green-50' : 'bg-red-50'
              }`}
            >
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex-shrink-0">
                  {entry.isCorrect ? (
                    <CheckCircle2 size={20} className="text-green-600" />
                  ) : (
                    <XCircle size={20} className="text-red-600" />
                  )}
                </div>

                <div className="flex items-center gap-2 flex-grow min-w-0">
                  <span className={`font-medium italic truncate ${
                    entry.isCorrect ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {entry.userAnswer}
                  </span>

                  {!entry.isCorrect && (
                    <>
                      <ArrowRight size={16} className="text-gray-400 flex-shrink-0" />
                      <span className="font-medium italic text-green-800 truncate">
                        {entry.correctAnswer}
                      </span>
                    </>
                  )}
                </div>

                <a
                  href={`https://www.inaturalist.org/observations/${entry.observationId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 transition-colors flex-shrink-0"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
