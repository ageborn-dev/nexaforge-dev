import React, { useState, useEffect } from 'react';
import { Wand2 } from 'lucide-react';

const funnyMessages = [
  "🚀 Building something amazing...",
  "✨ Sprinkling some React magic...",
  "🎨 Making it beautiful...",
  "⚡ Optimizing performance...",
  "🧪 Testing edge cases...",
  "🎯 Aligning pixels perfectly...",
  "🔮 Predicting user needs...",
  "🎪 Setting up the components...",
  "🎭 Adding interactive elements...",
  "🎪 Organizing the code circus..."
];

const SpinnerLoader = () => {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % funnyMessages.length);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-6 rounded-xl bg-gradient-to-b from-white/5 to-white/10 p-8 backdrop-blur-sm">
      <div className="relative">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-white/20">
          <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" style={{ animationDirection: 'reverse' }} />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Wand2 className="h-6 w-6 animate-pulse text-blue-400" />
        </div>
      </div>
      
      <div className="flex flex-col items-center gap-2">
        <h3 className="text-xl font-bold text-white">Building your app</h3>
        <p className="min-h-6 text-sm text-blue-300/80 transition-all duration-300">
          {funnyMessages[messageIndex]}
        </p>
      </div>
    </div>
  );
};

export default SpinnerLoader;