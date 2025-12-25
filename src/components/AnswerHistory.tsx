import { ExternalLink, CheckCircle2, XCircle } from 'lucide-react';
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
        Answer History
      </h2>
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="divide-y divide-gray-200">
          {history.map((entry, index) => (
            <div
              key={entry.timestamp}
              className={`p-4 transition-colors ${
                entry.isCorrect ? 'bg-green-50' : 'bg-red-50'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  {entry.isCorrect ? (
                    <CheckCircle2 size={24} className="text-green-600" />
                  ) : (
                    <XCircle size={24} className="text-red-600" />
                  )}
                </div>

                <div className="flex-grow min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-grow">
                      <p className="text-sm text-gray-600 mb-1">
                        Your answer:
                      </p>
                      <p className={`font-medium italic ${
                        entry.isCorrect ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {entry.userAnswer}
                      </p>
                    </div>
                  </div>

                  {!entry.isCorrect && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-600 mb-1">
                        Correct answer:
                      </p>
                      <p className="font-medium italic text-green-800">
                        {entry.correctAnswer}
                      </p>
                    </div>
                  )}

                  <a
                    href={`https://www.inaturalist.org/observations/${entry.observationId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-3 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    View on iNaturalist
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
