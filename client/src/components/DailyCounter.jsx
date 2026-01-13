import { useState, useEffect } from 'react';
import API_URL from '../config';

function DailyCounter() {
  const [count, setCount] = useState(0);
  const [limit] = useState(20);

  useEffect(() => {
    fetchDailyCount();
    // Poll every 30 seconds to keep count updated
    const interval = setInterval(fetchDailyCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDailyCount = async () => {
    try {
      const response = await fetch(`${API_URL}/daily-count`);
      const data = await response.json();
      setCount(data.count);
    } catch (error) {
      console.error('Error fetching daily count:', error);
    }
  };

  const getColorClass = () => {
    const percentage = (count / limit) * 100;
    if (percentage >= 90) return 'bg-red-100 text-red-800 border-red-300';
    if (percentage >= 75) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-green-100 text-green-800 border-green-300';
  };

  const getMessage = () => {
    const percentage = (count / limit) * 100;
    if (percentage >= 90) return 'Approaching Instagram limit! Be careful.';
    if (percentage >= 75) return 'Getting close to daily limit.';
    return 'You\'re within safe limits.';
  };

  return (
    <div className={`inline-flex items-center px-4 py-2 rounded-lg border-2 ${getColorClass()}`}>
      <div className="flex items-center gap-3">
        <div>
          <span className="text-sm font-semibold">
            Messages Sent Today: {count}/{limit}
          </span>
          <p className="text-xs mt-1">{getMessage()}</p>
        </div>
        {count >= limit * 0.75 && (
          <svg
            className="w-5 h-5"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>
    </div>
  );
}

export default DailyCounter;
