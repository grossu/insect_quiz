import { useState, useEffect } from 'react';
import { InsectQuiz } from './components/InsectQuiz';
import { RegionalChecklist } from './components/RegionalChecklist';

type Tab = 'quiz' | 'checklist';

function getTabFromHash(): Tab {
  return window.location.hash.slice(1) === 'quiz' ? 'quiz' : 'checklist';
}

function App() {
  const [activeTab, setActiveTab] = useState<Tab>(getTabFromHash);

  useEffect(() => {
    const onPopState = () => setActiveTab(getTabFromHash());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const switchTab = (tab: Tab) => {
    setActiveTab(tab);
    window.location.hash = tab;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="sticky top-0 z-40 bg-white shadow-sm">
        <div className="max-w-4xl mx-auto flex">
          {(['checklist', 'quiz'] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => switchTab(tab)}
              className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${
                activeTab === tab
                  ? 'border-green-600 text-green-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'quiz' ? 'Квиз' : 'Чеклист'}
            </button>
          ))}
        </div>
      </div>
      {activeTab === 'quiz' ? <InsectQuiz /> : <RegionalChecklist />}
    </div>
  );
}

export default App;
