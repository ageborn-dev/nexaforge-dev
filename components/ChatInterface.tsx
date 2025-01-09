import React, { useState, useCallback, useRef, useEffect } from "react";
import { Send, Loader2, MessageSquare, Bot, User } from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  error?: boolean;
  thinking?: boolean;
}

interface TokenAnalytics {
  modelName: string;
  provider: string;
  promptTokens: number;
  responseTokens: number;
  totalTokens: number;
  maxTokens: number;
  utilizationPercentage: string;
}

interface ChatInterfaceProps {
  visible: boolean;
  loading: boolean;
  currentCode: string;
  model: string;
  settings: any;
  prompt: string;
  generatedAppId: string | null;
  onUpdateCode: (newCode: string) => void;
  onAnalyticsUpdate?: (analytics: TokenAnalytics) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  visible,
  loading,
  currentCode,
  model,
  settings,
  prompt,
  generatedAppId,
  onUpdateCode,
  onAnalyticsUpdate,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "initial-message",
      role: "assistant",
      content: "Hi! I can help you refine the code or fix any issues. What would you like me to do?",
      timestamp: Date.now(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isExpanded, setIsExpanded] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isThinking, setIsThinking] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const updateAnalytics = async (generatedCode: string) => {
    if (!generatedAppId) {
      console.error('Missing generatedAppId');
      return;
    }
  
    try {
      const analyticsData = {
        model,
        generatedCode,
        prompt,
        generatedAppId,
      };
  
      console.log('Sending analytics data:', {
        ...analyticsData,
        generatedCode: `${analyticsData.generatedCode.slice(0, 50)}...`
      });
  
      const response = await fetch("/api/tokenAnalytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(analyticsData),
      });
  
      if (!response.ok) {
        throw new Error(`Analytics error: ${response.status}`);
      }
  
      const analytics = await response.json();
      if (onAnalyticsUpdate) {
        onAnalyticsUpdate(analytics);
      }
    } catch (error) {
      console.error("Failed to update analytics:", error);
    }
  };

  const validateCode = useCallback(
    (code: string): { isValid: boolean; error?: string } => {
      try {
        if (!code.trim()) {
          return { isValid: false, error: "Empty code response" };
        }

        if (!code.match(/(\bfunction\b|\bconst\b)\s+\w+/)) {
          return { isValid: false, error: "Invalid component structure" };
        }

        if (!code.includes("export default")) {
          return { isValid: false, error: "Missing export default statement" };
        }

        const brackets = code.match(/[(){}\[\]]/g) || [];
        const stack: string[] = [];
        const bracketPairs: Record<string, string> = {
          "(": ")",
          "{": "}",
          "[": "]",
        };

        for (const char of brackets) {
          if ("({[".includes(char)) {
            stack.push(char);
          } else {
            const last = stack.pop();
            if (!last || bracketPairs[last] !== char) {
              return {
                isValid: false,
                error: "Mismatched brackets or parentheses",
              };
            }
          }
        }

        if (stack.length > 0) {
          return { isValid: false, error: "Unclosed brackets or parentheses" };
        }

        return { isValid: true };
      } catch (error) {
        return { isValid: false, error: "Code validation failed" };
      }
    },
    []
  );

  const generateMessageId = () => {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const createContextualPrompt = useCallback(
    (userRequest: string, code: string, originalPrompt: string, lastError: string | null): string => {
      // Parse complex error messages into structured format
      const parseError = (error: string) => {
        const syntaxErrorMatch = error.match(/SyntaxError:(.*?)\n/s);
        const lineColMatch = error.match(/\((\d+):(\d+)\)/);
        const codeSnippetMatch = error.match(/(?:\n\s*\d+ \|.*){2,4}/);
        
        return {
          message: syntaxErrorMatch ? syntaxErrorMatch[1].trim() : error,
          line: lineColMatch ? parseInt(lineColMatch[1]) : null,
          column: lineColMatch ? parseInt(lineColMatch[2]) : null,
          snippet: codeSnippetMatch ? codeSnippetMatch[0].trim() : '',
          fullError: error
        };
      };
  
      // Generate targeted fix instructions based on error type
      const getErrorSpecificInstructions = (error: string) => {
        const parsedError = parseError(error);
        const instructions = [];
  
        if (error.includes('SyntaxError')) {
          instructions.push(
            "- Fix the syntax error in the component",
            "- Ensure proper JSX formatting and tag closure",
            "- Validate attribute syntax and values",
            `- Pay special attention to line ${parsedError.line || 'with error'}`
          );
        } else if (error.includes('TypeError')) {
          instructions.push(
            "- Fix type-related issues in the component",
            "- Ensure proper prop types and interfaces",
            "- Validate null/undefined handling",
            "- Check object property access"
          );
        } else if (error.includes('ReferenceError')) {
          instructions.push(
            "- Fix undefined variable references",
            "- Verify all required imports are present",
            "- Check variable scope and declarations",
            "- Validate hook usage rules"
          );
        } else {
          instructions.push(
            "- Review and fix the component structure",
            "- Ensure proper React patterns are followed",
            "- Validate component logic and data flow",
            "- Check for potential runtime issues"
          );
        }
  
        return instructions.join('\n');
      };
  
      let errorContext = '';
      if (lastError) {
        const parsedError = parseError(lastError);
        errorContext = `
  Current Error Details:
  ${parsedError.message}
  ${parsedError.line ? `At Line: ${parsedError.line}${parsedError.column ? `, Column: ${parsedError.column}` : ''}` : ''}
  ${parsedError.snippet ? `\nProblematic Code Section:\n${parsedError.snippet}` : ''}
  
  Required Fixes:
  ${getErrorSpecificInstructions(lastError)}
  
  Special Instructions:
  1. Maintain existing imports and component structure
  2. Preserve all working functionality
  3. Focus on fixing the identified error
  4. Ensure proper TypeScript types
  5. Follow React best practices
  `;
      }
  
      const basePrompt = `As a React and TypeScript expert, please help improve this code:
  
  ${errorContext}
  
  Original Requirements:
  ${originalPrompt}
  
  Current Complete Code:
  ${code}
  
  User Request:
  ${userRequest}
  
  Technical Requirements:
  1. Return a complete, working React TypeScript component
  2. Include ALL necessary imports at the top
  3. Maintain proper component structure and exports
  4. Use appropriate TypeScript types and interfaces
  5. Follow React hooks rules and best practices
  6. Implement proper error handling and null checks
  7. Use consistent code formatting
  8. Ensure all JSX is properly formatted and closed
  9. Maintain existing functionality while fixing issues
  10. Include proper prop types and interfaces
  
  Format Requirements:
  - Start the response with imports
  - Include the complete component code
  - Use proper TypeScript syntax
  - Do not include any explanations or markdown
  - Provide only the working code
  - Ensure the code can be used as-is
  
  Additional Context:
  - Framework: React 18+ with TypeScript
  - Style: Tailwind CSS
  - Package Manager: npm/yarn
  - Environment: Next.js application
  `;
  
      return basePrompt.trim();
    },
    []
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || loading) return;

    const newUserMessage: ChatMessage = {
      id: generateMessageId(),
      role: "user",
      content: inputMessage,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setInputMessage("");
    setIsThinking(true);

    const thinkingMessage: ChatMessage = {
      id: generateMessageId(),
      role: "assistant",
      content: "",
      timestamp: Date.now(),
      thinking: true,
    };
    setMessages((prev) => [...prev, thinkingMessage]);

    try {
      const contextMessage = createContextualPrompt(
        inputMessage,
        currentCode,
        prompt,
        lastError,
      );

      const response = await fetch("/api/generateCode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "user",
              content: contextMessage,
            },
          ],
          settings: {
            ...settings,
            temperature: Math.max(0.1, 0.7 - retryCount * 0.1),
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";

      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            fullResponse += chunk;
          }

          setMessages((prev) => prev.filter((msg) => !msg.thinking));
          setIsThinking(false);

          const cleanCode = fullResponse
            .replace(/```[\w]*\n?/g, "")
            .replace(/^import{/gm, "import {")
            .replace(/(\s)\s+/g, "$1")
            .trim();

          const finalCode = cleanCode.includes("import React") || !cleanCode.includes("React")
            ? cleanCode
            : `import React from 'react';\n${cleanCode}`;

          const validation = validateCode(finalCode);

          if (validation.isValid) {
            onUpdateCode(finalCode);
            setLastError(null);
            setRetryCount(0);

            await updateAnalytics(finalCode);

            setMessages((prev) => [
              ...prev.filter((msg) => !msg.thinking),
              {
                id: generateMessageId(),
                role: "assistant",
                content: "I've updated the code successfully. Let me know if you need any other changes!",
                timestamp: Date.now(),
              },
            ]);
          } else {
            if (retryCount < 2) {
              setRetryCount((prev) => prev + 1);
              setLastError(validation.error || "Code validation failed");

              setMessages((prev) => [
                ...prev,
                {
                  id: generateMessageId(),
                  role: "assistant",
                  content: `I'm refining the code to fix: ${validation.error}. One moment please...`,
                  timestamp: Date.now(),
                },
              ]);

              setTimeout(() => {
                const retryMessage: ChatMessage = {
                  id: generateMessageId(),
                  role: "user",
                  content: `Please fix the following issue: ${validation.error}. Ensure the code is complete and properly formatted.`,
                  timestamp: Date.now(),
                };
                setMessages((prev) => [...prev, retryMessage]);
                handleSubmit({} as React.FormEvent);
              }, 1000);
            } else {
              setRetryCount(0);
              setLastError(null);
              setMessages((prev) => [
                ...prev,
                {
                  id: generateMessageId(),
                  role: "assistant",
                  content: `I'm having trouble generating valid code. Could you please try:
1. Describing the specific changes needed
2. Breaking down the request into smaller steps
3. Providing any error messages you're seeing`,
                  timestamp: Date.now(),
                  error: true,
                },
              ]);
            }
          }
        } finally {
          reader.releaseLock();
        }
      }
    } catch (error) {
      console.error("Chat Error:", error);
      setMessages((prev) => [
        ...prev.filter((msg) => !msg.thinking),
        {
          id: generateMessageId(),
          role: "assistant",
          content: "I encountered an error. Please try rephrasing your request or provide more specific details about what needs to be changed.",
          timestamp: Date.now(),
          error: true,
        },
      ]);
      setIsThinking(false);
      setRetryCount(0);
      setLastError(null);
    }
  };

  const ThinkingIndicator = () => (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        <div className="h-2 w-2 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.3s]"></div>
        <div className="h-2 w-2 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.15s]"></div>
        <div className="h-2 w-2 animate-bounce rounded-full bg-blue-500"></div>
      </div>
    </div>
  );

  if (!visible) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 flex w-96 flex-col rounded-lg border border-white/20 bg-white/10 backdrop-blur-lg transition-all duration-300 ${
        isExpanded ? "h-[600px]" : "h-12"
      }`}
    >
      <div
        className="flex cursor-pointer items-center justify-between rounded-t-lg border-b border-white/20 p-3"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-blue-500" />
          <h3 className="text-sm font-medium text-white">Refinement Chat</h3>
        </div>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="h-4 w-4 animate-spin text-white" />}
          <button className="rounded-full p-1 hover:bg-white/10">
            <svg
              className={`h-4 w-4 transform text-white transition-transform ${
                isExpanded ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex items-start gap-2 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10">
                      <Bot className="h-5 w-5 text-blue-500" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      message.role === "user"
                        ? "bg-blue-500 text-white"
                        : message.error
                          ? "bg-red-500/10 text-white"
                          : "bg-white/10 text-white"
                    }`}
                  >
                    {message.thinking ? (
                      <ThinkingIndicator />
                    ) : (
                      <>
                        <p className="text-sm">{message.content}</p>
                        <span className="mt-1 text-xs opacity-70">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </span>
                      </>
                    )}
                  </div>
                  {message.role === "user" && (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500">
                      <User className="h-5 w-5 text-white" />
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 rounded-b-lg border-t border-white/20 p-3"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Describe the changes you need..."
              className="flex-1 rounded-lg bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/20"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !inputMessage.trim()}
              className="rounded-lg bg-blue-500 p-2 text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </>
      )}
    </div>
  );
};

export default ChatInterface;