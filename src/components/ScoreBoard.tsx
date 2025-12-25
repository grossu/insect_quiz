import { Trophy, Target } from 'lucide-react';

interface ScoreBoardProps {
  score: number;
  attempts: number;
}

export function ScoreBoard({ score, attempts }: ScoreBoardProps) {
  const percentage = attempts > 0 ? Math.round((score / attempts) * 100) : 0;

  return (
    <div className="w-full max-w-2xl mx-auto mb-8">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-around">
          <div className="flex items-center gap-3">
            <Trophy className="text-yellow-500" size={32} />
            <div>
              <p className="text-sm text-gray-600">Score</p>
              <p className="text-2xl font-bold text-gray-800">{score}</p>
            </div>
          </div>

          <div className="h-12 w-px bg-gray-300"></div>

          <div className="flex items-center gap-3">
            <Target className="text-blue-500" size={32} />
            <div>
              <p className="text-sm text-gray-600">Attempts</p>
              <p className="text-2xl font-bold text-gray-800">{attempts}</p>
            </div>
          </div>

          <div className="h-12 w-px bg-gray-300"></div>

          <div>
            <p className="text-sm text-gray-600">Accuracy</p>
            <p className="text-2xl font-bold text-gray-800">{percentage}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
