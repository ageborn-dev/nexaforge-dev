import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  Send,
  Loader2,
  MessageSquare,
  Bot,
  User,
  Wand2,
  Brain,
} from "lucide-react";
import { createErrorFixer } from "@/utils/error-fix-chain";
import {
  formatErrorContext,
  parseErrorDetails,
} from "@/utils/error-fix-schema";
import { AI_PROVIDERS, ENABLED_PROVIDERS } from "@/config/ai-providers";
import { ChatMessage, TokenAnalytics, AISettings, AIModel } from "@/types";

interface ChatInterfaceProps {
  visible: boolean;
  loading: boolean;
  currentCode: string;
  model: string;
  settings: AISettings;
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
      content:
        "Hi! I can help you refine the code or fix any issues. What would you like me to do?",
      timestamp: Date.now(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isExpanded, setIsExpanded] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [isErrorFixing, setIsErrorFixing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isThinking, setIsThinking] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getFirstEnabledProvider = useCallback((): {
    provider: string;
    modelId: string;
  } | null => {
    for (const [provider, enabled] of Object.entries(ENABLED_PROVIDERS)) {
      if (enabled && AI_PROVIDERS[provider]?.length > 0) {
        return {
          provider,
          modelId: AI_PROVIDERS[provider][0].id,
        };
      }
    }
    return null;
  }, []);

  const getProviderFromModel = useCallback(
    (modelId: string): string | null => {
      for (const [provider, models] of Object.entries(AI_PROVIDERS)) {
        if (models.some((m) => m.id === modelId)) {
          if (ENABLED_PROVIDERS[provider as keyof typeof ENABLED_PROVIDERS]) {
            return provider;
          }
        }
      }
      const fallback = getFirstEnabledProvider();
      return fallback?.provider || null;
    },
    [getFirstEnabledProvider],
  );

  const updateAnalytics = async (generatedCode: string) => {
    if (!generatedAppId) {
      console.error("Missing generatedAppId");
      return;
    }

    try {
      const analyticsData = {
        model,
        generatedCode,
        prompt,
        generatedAppId,
      };

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
    [],
  );

  const generateMessageId = () => {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleErrorFix = async (error: string) => {
    setIsErrorFixing(true);
    setIsThinking(true);

    const thinkingMessage: ChatMessage = {
      id: generateMessageId(),
      role: "assistant",
      content: "Analyzing error...",
      timestamp: Date.now(),
      thinking: true,
      isErrorFix: true,
    };
    setMessages((prev) => [...prev, thinkingMessage]);

    try {
      const provider = getProviderFromModel(model);
      if (!provider) {
        throw new Error("No enabled AI provider available");
      }

      const errorDetails = parseErrorDetails(error);
      const fixStream = await createErrorFixer({
        provider,
        model,
        apiKey: "",
        code: currentCode,
        error,
        errorDetails,
      });

      let fixedCode = "";
      for await (const chunk of fixStream) {
        fixedCode += chunk;
      }

      if (fixedCode.trim()) {
        const validation = validateCode(fixedCode);
        if (validation.isValid) {
          onUpdateCode(fixedCode);
          setLastError(null);
          setMessages((prev) => [
            ...prev.filter((msg) => !msg.thinking),
            {
              id: generateMessageId(),
              role: "assistant",
              content:
                "I've fixed the error. The code should now work correctly. Let me know if you need any other changes!",
              timestamp: Date.now(),
              isErrorFix: true,
            },
          ]);
          await updateAnalytics(fixedCode);
        }
      }
    } catch (error) {
      console.error("Error fixing code:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      setMessages((prev) => [
        ...prev.filter((msg) => !msg.thinking),
        {
          id: generateMessageId(),
          role: "assistant",
          content:
            errorMessage === "No enabled AI provider available"
              ? "No AI provider is currently available. Please check the configuration and try again."
              : "I encountered an error while trying to fix the code. Please try describing the specific changes needed.",
          timestamp: Date.now(),
          error: true,
          isErrorFix: true,
        },
      ]);
    } finally {
      setIsErrorFixing(false);
      setIsThinking(false);
    }
  };

  const createContextualPrompt = useCallback(
    (
      userRequest: string,
      code: string,
      originalPrompt: string,
      lastError: string | null,
    ): string => {
      // Extract UI-specific keywords from request
      const uiTerms = {
        colors: /colou?r/i.test(userRequest),
        sizes: /size|width|height/i.test(userRequest),
        layout: /layout|position|align|margin|padding/i.test(userRequest),
        components: /button|input|div|container|header/i.test(userRequest),
      };

      // Determine the type of change requested
      const changeType = {
        isVisual: uiTerms.colors || uiTerms.sizes || uiTerms.layout,
        isComponent: uiTerms.components,
        isLogic: /function|state|effect|handle|click|event/i.test(userRequest),
        isData: /data|props|interface|type/i.test(userRequest),
      };

      // Create targeted context based on change type
      let targetedContext = "";
      if (changeType.isVisual) {
        targetedContext = `
Focus on UI Modification:
- Preserve all existing functionality and component structure
- Only modify the specified visual attributes
- Maintain Tailwind class consistency
- Ensure changes only affect the requested elements
- Keep all existing event handlers and props
- Preserve any dynamic class bindings`;
      } else if (changeType.isLogic) {
        targetedContext = `
Focus on Logic Modification:
- Preserve the component's visual appearance
- Maintain TypeScript type safety
- Keep existing state management patterns
- Ensure proper error handling
- Preserve existing event propagation
- Handle edge cases appropriately`;
      }

      let errorContext = "";
      if (lastError) {
        const parsedError = parseErrorDetails(lastError);
        const context = formatErrorContext(code, lastError, parsedError);
        errorContext = `\nError Context:\n${context}`;
      }

      return `As a React and TypeScript expert, please help improve this code with precise, targeted changes.
  
${errorContext}
  
Original Requirements:
${originalPrompt}

Current Request:
${userRequest}

${targetedContext}

Current Complete Code:
${code}

Change Requirements:
1. Make only the specific changes requested
2. Preserve all other functionality and appearance
3. Maintain proper TypeScript types and interfaces
4. Keep existing imports and dependencies
5. Preserve component structure and naming
6. Ensure changes are scoped to affected areas only
7. Follow React best practices and hooks rules
8. Use consistent code formatting
9. Keep existing error handling and props
10. Maintain current state management approach

Technical Guidelines:
- Return complete, working component
- Include ALL necessary imports
- Use proper TypeScript syntax
- Avoid explanatory comments
- Return only the code
- Make surgical, precise changes
- Preserve file structure
- Keep existing logic flows
- Maintain component interfaces
- Use existing helper functions`.trim();
    },
    [],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || loading || isErrorFixing) return;

    const provider = getProviderFromModel(model);
    if (!provider) {
      setMessages((prev) => [
        ...prev,
        {
          id: generateMessageId(),
          role: "assistant",
          content:
            "No AI provider is currently available. Please check the configuration and try again.",
          timestamp: Date.now(),
          error: true,
        },
      ]);
      return;
    }

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
      if (inputMessage.toLowerCase().includes("error") || lastError) {
        await handleErrorFix(lastError || inputMessage);
        return;
      }

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
      let originalCode = currentCode;

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

          const finalCode =
            cleanCode.includes("import React") || !cleanCode.includes("React")
              ? cleanCode
              : `import React from 'react';\n${cleanCode}`;

          const validation = validateCode(finalCode);

          if (validation.isValid) {
            onUpdateCode(finalCode);
            setLastError(null);
            setRetryCount(0);

            await updateAnalytics(finalCode);

            // Generate change description using the AI
            const descriptionPrompt = `
  You are explaining changes made to a React component. The user requested: "${inputMessage}"
  
  Original code and updated code are provided. Analyze what specific changes were made and respond naturally about what was done.
  Be specific but conversational. Focus on what changed visually or functionally. Don't mention technical details unless relevant.
  
  Format response to end with a question about if they want any adjustments or what else they need.
  `;

            const descriptionResponse = await fetch("/api/generateCode", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                model,
                messages: [
                  {
                    role: "user",
                    content: descriptionPrompt,
                  },
                ],
                settings: {
                  ...settings,
                  temperature: 0.7,
                },
              }),
            });

            if (descriptionResponse.ok) {
              const descriptionReader = descriptionResponse.body?.getReader();
              let changeDescription = "";

              if (descriptionReader) {
                while (true) {
                  const { done, value } = await descriptionReader.read();
                  if (done) break;
                  changeDescription += decoder.decode(value);
                }
                descriptionReader.releaseLock();

                setMessages((prev) => [
                  ...prev.filter((msg) => !msg.thinking),
                  {
                    id: generateMessageId(),
                    role: "assistant",
                    content: changeDescription.trim(),
                    timestamp: Date.now(),
                  },
                ]);
              }
            } else {
              setMessages((prev) => [
                ...prev.filter((msg) => !msg.thinking),
                {
                  id: generateMessageId(),
                  role: "assistant",
                  content:
                    "I've updated the code according to your request. Would you like me to make any adjustments?",
                  timestamp: Date.now(),
                },
              ]);
            }
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
                
                handleSubmit({ preventDefault: () => {} } as React.FormEvent);
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
          content:
            "I encountered an error. Please try rephrasing your request or provide more specific details about what needs to be changed.",
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
              disabled={loading || isErrorFixing}
            />
            <button
              type="submit"
              disabled={loading || !inputMessage.trim() || isErrorFixing}
              className="rounded-lg bg-blue-500 p-2 text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
            >
              {isThinking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </form>
        </>
      )}
    </div>
  );
};

export default ChatInterface;
