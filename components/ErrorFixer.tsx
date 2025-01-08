import React, { useState, useEffect } from 'react';
import { Wand2 } from 'lucide-react';

interface ErrorFixerProps {
  error: string | null;
  model: string;
  code: string;
  onFixComplete: (fixedCode: string) => void;
}

const ErrorFixer: React.FC<ErrorFixerProps> = ({
  error,
  model,
  code,
  onFixComplete,
}) => {
  const [isFixing, setIsFixing] = useState(false);
  const [errorDetails, setErrorDetails] = useState<{
    message: string;
    line?: number;
    column?: number;
  } | null>(null);

  useEffect(() => {
    if (error) {

      const lineMatch = error.match(/line (\d+)/i);
      const columnMatch = error.match(/column (\d+)/i);
      
      setErrorDetails({
        message: error,
        line: lineMatch ? parseInt(lineMatch[1]) : undefined,
        column: columnMatch ? parseInt(columnMatch[1]) : undefined,
      });
    } else {
      setErrorDetails(null);
    }
  }, [error]);

  const handleAiFix = async () => {
    if (!error || !code) return;
    
    setIsFixing(true);
    try {
      const response = await fetch("/api/fixCode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          code,
          error,
          errorDetails: {
            line: errorDetails?.line,
            column: errorDetails?.column,
          },
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fixedCode = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        fixedCode += chunk;
      }

      fixedCode = fixedCode.replace(/```[\w]*\n?/g, '').trim();
      onFixComplete(fixedCode);
    } catch (err) {
      console.error("Error fixing code:", err);
    } finally {
      setIsFixing(false);
    }
  };

  if (!error) return null;

  return (
    <div className="mb-4 w-full max-w-4xl rounded-lg border border-red-500/50 bg-red-500/10 p-4">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h3 className="text-base font-semibold text-red-500">
            Runtime Error Detected
          </h3>
          <div className="mt-2 text-sm text-red-400">
            {errorDetails?.line && (
              <span className="font-mono">
                Line {errorDetails.line}
                {errorDetails.column && `, Column ${errorDetails.column}`}:{" "}
              </span>
            )}
            {error}
          </div>
          <div className="mt-4">
            <button
              onClick={handleAiFix}
              disabled={isFixing}
              className="flex items-center gap-2 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-500/20 disabled:opacity-50"
            >
              <Wand2 className="h-4 w-4" />
              {isFixing ? "AI Fixing..." : "AI Fix"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorFixer;