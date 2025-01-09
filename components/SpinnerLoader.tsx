import React, { useState, useEffect } from 'react';
import { Wand2, Sparkles, Code2, Palette, Zap, TestTube2, Target, CircuitBoard, MousePointerClick, Box } from 'lucide-react';

const loadingStates = [
  { icon: Sparkles, message: "🚀 Building something amazing...", color: "text-purple-400" },
  { icon: Code2, message: "✨ Sprinkling some React magic...", color: "text-blue-400" },
  { icon: Palette, message: "🎨 Making it beautiful...", color: "text-pink-400" },
  { icon: Zap, message: "⚡ Optimizing performance...", color: "text-yellow-400" },
  { icon: TestTube2, message: "🧪 Testing edge cases...", color: "text-green-400" },
  { icon: Target, message: "🎯 Aligning pixels perfectly...", color: "text-red-400" },
  { icon: Wand2, message: "🔮 Predicting user needs...", color: "text-indigo-400" },
  { icon: CircuitBoard, message: "🎪 Setting up the components...", color: "text-cyan-400" },
  { icon: MousePointerClick, message: "🎭 Adding interactive elements...", color: "text-orange-400" },
  { icon: Box, message: "🎪 Organizing the code circus...", color: "text-teal-400" }
];

const SpinnerLoader = () => {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % loadingStates.length);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const CurrentIcon = loadingStates[messageIndex].icon;

  return (
    <div className="flex flex-col items-center justify-center gap-8 rounded-2xl bg-gradient-to-br from-gray-900/90 via-gray-800/90 to-gray-900/90 p-12 shadow-2xl backdrop-blur-lg border border-white/10">
      <div className="relative">
        {/* Outer glow effect */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 opacity-20 blur-xl animate-pulse" />
        
        {/* Main spinner container */}
        <div className="relative h-24 w-24">
          {/* Spinning rings */}
          <div className="absolute inset-0 rounded-full border-4 border-white/10 animate-spin" style={{ animationDuration: '3s' }} />
          <div className="absolute inset-0 rounded-full border-4 border-white/10 animate-spin" style={{ animationDuration: '4s', animationDirection: 'reverse' }} />
          <div className="absolute inset-0 rounded-full border-4 border-t-transparent border-r-transparent animate-spin" 
               style={{ 
                 animationDuration: '2s',
                 borderImage: 'linear-gradient(to right, #60A5FA, #A78BFA) 1'
               }} />
          
          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <CurrentIcon className={`h-10 w-10 transition-all duration-500 ${loadingStates[messageIndex].color}`} />
          </div>
        </div>
      </div>
      
      <div className="flex flex-col items-center gap-3 text-center">
        <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          Building your app
        </h3>
        <p className="min-h-6 text-base text-white/80 transition-all duration-500 w-64">
          {loadingStates[messageIndex].message}
        </p>
      </div>
    </div>
  );
};

export default SpinnerLoader;