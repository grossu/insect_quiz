import { FormEvent } from 'react';
import { Send, SkipForward } from 'lucide-react';
import { AnswerOption } from '../types/insect';

interface AnswerFormProps {
  options: AnswerOption[];
  selectedAnswerId: number | null;
  onAnswerSelect: (id: number) => void;
  onSubmit: (e: FormEvent) => void;
  onSkip: () => void;
  disabled: boolean;
  correctAnswerId?: number;
  showResult: boolean;
}

export function AnswerForm({
  options,
  selectedAnswerId,
  onAnswerSelect,
  onSubmit,
  onSkip,
  disabled,
  correctAnswerId,
  showResult
}: AnswerFormProps) {
  const getOptionClass = (optionId: number) => {
    const baseClass = "w-full text-left px-6 py-4 rounded-lg border-2 transition-all duration-200";

    if (!showResult) {
      if (selectedAnswerId === optionId) {
        return `${baseClass} border-green-500 bg-green-50`;
      }
      return `${baseClass} border-gray-300 hover:border-green-400 hover:bg-green-50`;
    }

    if (optionId === correctAnswerId) {
      return `${baseClass} border-green-500 bg-green-100`;
    }

    if (selectedAnswerId === optionId && optionId !== correctAnswerId) {
      return `${baseClass} border-red-500 bg-red-100`;
    }

    return `${baseClass} border-gray-300 bg-gray-50`;
  };

  return (
    <form onSubmit={onSubmit} className="w-full max-w-2xl mx-auto mt-8">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Определите вид:
        </h2>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {options.map((option, index) => (
            <button
              key={option.id}
              type="button"
              onClick={() => !disabled && onAnswerSelect(option.id)}
              disabled={disabled}
              className={getOptionClass(option.id)}
            >
              <div className="flex flex-col items-center text-center p-2">
                <span className="font-bold text-gray-700 text-sm mb-2">
                  {String.fromCharCode(65 + index)}.
                </span>
                <div className="font-bold text-gray-900 italic text-base mb-1">
                  {option.name}
                </div>
                {(option.russianName || option.commonName) && (
                  <div className="text-sm text-gray-600">
                    {option.russianName || option.commonName}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={disabled || selectedAnswerId === null}
            className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 font-medium"
          >
            <Send size={20} />
            Проверить ответ
          </button>
          <button
            type="button"
            onClick={onSkip}
            disabled={disabled}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <SkipForward size={20} />
            Пропустить
          </button>
        </div>
      </div>
    </form>
  );
}
