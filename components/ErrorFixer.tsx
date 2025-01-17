import React, { useState, useEffect } from 'react';
import { Wand2, Brain, AlertCircle } from 'lucide-react';
import { createErrorFixer } from '@/utils/error-fix-chain';
import { AI_PROVIDERS } from '@/config/ai-providers';
import { CodeError } from '@/types/services/error-fix';

interface ErrorFixerProps {
  error: string | null;
  model: string;
  code: string;
  onFixComplete: (fixedCode: string) => void;
}

interface ErrorFixingState {
  isFixing: boolean;
  isAnalyzing: boolean;
  progress: number;
  analysis: CodeError | null;
  fixProgress: string;
  currentAttempt: number;
}

const ErrorFixer: React.FC<ErrorFixerProps> = ({
  error,
  model,
  code,
  onFixComplete,
}) => {
  const [fixingState, setFixingState] = useState<ErrorFixingState>({
    isFixing: false,
    isAnalyzing: false,
    progress: 0,
    analysis: null,
    fixProgress: '',
    currentAttempt: 0
  });

  const [errorDetails, setErrorDetails] = useState<{
    line?: number;
    column?: number;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (error) {
      const parsedError = {
        message: error,
        ...(error.match(/line (\d+)/i) && {
          line: parseInt(error.match(/line (\d+)/i)![1])
        }),
        ...(error.match(/column (\d+)/i) && {
          column: parseInt(error.match(/column (\d+)/i)![1])
        })
      };
      setErrorDetails(parsedError);
      setFixingState(prev => ({ ...prev, analysis: null }));
    } else {
      setErrorDetails(null);
    }
  }, [error]);

  const getProviderFromModel = (modelId: string): string => {
    for (const [provider, models] of Object.entries(AI_PROVIDERS)) {
      if (models.some(m => m.id === modelId)) {
        return provider;
      }
    }
    return 'openai';
  };

  const handleAiFix = async () => {
    if (!error || !code || fixingState.isFixing) return;

    setFixingState(prev => ({
      ...prev,
      isFixing: true,
      isAnalyzing: true,
      progress: 0,
      fixProgress: ''
    }));

    try {
      const provider = getProviderFromModel(model);
      const stream = await createErrorFixer({
        provider,
        model,
        apiKey: '',
        code,
        error,
        errorDetails: errorDetails || undefined
      });

      let fixedCode = '';
      for await (const chunk of stream) {
        fixedCode += chunk;
        setFixingState(prev => ({
          ...prev,
          isAnalyzing: false,
          progress: Math.min((prev.progress || 0) + 5, 90),
          fixProgress: fixedCode
        }));
      }

      if (fixedCode.trim()) {
        onFixComplete(fixedCode.trim());
        setFixingState(prev => ({
          ...prev,
          isFixing: false,
          progress: 100,
          currentAttempt: prev.currentAttempt + 1
        }));
      } else {
        throw new Error('Generated fix was empty');
      }
    } catch (err) {
      console.error("Error fixing code:", err);
      setFixingState(prev => ({
        ...prev,
        isFixing: false,
        progress: 0
      }));
    }
  };

  if (!error) return null;

  return (
    <div className="mb-4 w-full max-w-4xl rounded-lg border border-red-500/50 bg-red-500/10 p-4">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <h3 className="text-base font-semibold text-red-500">
              Runtime Error Detected
            </h3>
          </div>
          
          <div className="mt-2 font-mono text-sm text-red-400">
            {errorDetails?.line && (
              <span>
                Line {errorDetails.line}
                {errorDetails.column && `, Column ${errorDetails.column}`}:{" "}
              </span>
            )}
            {error}
          </div>

          {fixingState.analysis && (
            <div className="mt-4 rounded border border-red-500/30 bg-red-500/5 p-3">
              <h4 className="font-medium text-red-400">Error Analysis</h4>
              <div className="mt-2 space-y-1 text-sm text-red-300">
                <p>Type: {fixingState.analysis.error_type}</p>
                <p>Confidence: {(fixingState.analysis.confidence * 100).toFixed(1)}%</p>
              </div>
            </div>
          )}

          {(fixingState.isFixing || fixingState.progress === 100) && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-1 flex-1 rounded-full bg-red-500/20">
                  <div 
                    className="h-full rounded-full bg-red-500 transition-all duration-500"
                    style={{ width: `${fixingState.progress}%` }}
                  />
                </div>
                <span className="text-xs text-red-400">
                  {fixingState.isAnalyzing ? "Analyzing..." : 
                   fixingState.isFixing ? "Fixing..." : 
                   fixingState.progress === 100 ? "Complete" : ""}
                </span>
              </div>
            </div>
          )}

          <div className="mt-4">
            <button
              onClick={handleAiFix}
              disabled={fixingState.isFixing}
              className="flex items-center gap-2 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-500/20 disabled:opacity-50"
            >
              {fixingState.isAnalyzing ? (
                <>
                  <Brain className="h-4 w-4 animate-pulse" />
                  Analyzing Error
                </>
              ) : fixingState.isFixing ? (
                <>
                  <Wand2 className="h-4 w-4 animate-spin" />
                  Fixing Code
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  AI Fix
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorFixer;