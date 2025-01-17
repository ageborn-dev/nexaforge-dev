import { z } from "zod";
import { StructuredOutputParser } from "@langchain/core/output_parsers";

// Schema for code validation error details
const codeErrorSchema = z.object({
  error_type: z.string().describe("Type of the error encountered"),
  line_number: z.number().optional().describe("Line number where error occurred"),
  column: z.number().optional().describe("Column where error occurred"),
  error_message: z.string().describe("Original error message"),
  suggested_fix: z.string().describe("Suggested fix for the error"),
  fix_explanation: z.string().describe("Explanation of why this fix should work"),
  confidence: z.number().min(0).max(1).describe("Confidence score for the suggested fix"),
});

// Schema for the fix attempt result
const fixAttemptSchema = z.object({
  original_error: codeErrorSchema,
  fix_successful: z.boolean(),
  fixed_code: z.string().optional(),
  remaining_issues: z.array(z.string()).optional(),
  next_steps: z.array(z.string()).optional()
});

// Create a parser with the schema
export const errorFixingParser = StructuredOutputParser.fromZodSchema(fixAttemptSchema);

/**
 * Formats error context for better error fixing
 */
export function formatErrorContext(
  code: string,
  error: string,
  errorDetails?: { line?: number; column?: number }
): string {
  let context = `Code:\n${code}\n\nError:\n${error}`;
  
  if (errorDetails?.line) {
    const lines = code.split('\n');
    const startLine = Math.max(0, errorDetails.line - 2);
    const endLine = Math.min(lines.length, errorDetails.line + 2);
    const relevantLines = lines.slice(startLine, endLine);
    
    context += '\n\nRelevant section:\n';
    relevantLines.forEach((line, idx) => {
      const lineNum = startLine + idx + 1;
      const marker = lineNum === errorDetails.line ? '> ' : '  ';
      context += `${marker}${lineNum}: ${line}\n`;
    });
  }

  return context;
}

/**
 * Extracts structured error information from error string
 */
export function parseErrorDetails(error: string): { 
  line?: number;
  column?: number;
  message: string;
} {
  // Extract line number if present
  const lineMatch = error.match(/line (\d+)/i);
  const line = lineMatch ? parseInt(lineMatch[1], 10) : undefined;

  // Extract column if present  
  const columnMatch = error.match(/column (\d+)/i);
  const column = columnMatch ? parseInt(columnMatch[1], 10) : undefined;

  // Clean up error message
  const message = error
    .replace(/\(line \d+(?:, column \d+)?\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return { line, column, message };
}

// Type exports for use in other files
export type CodeError = z.infer<typeof codeErrorSchema>;
export type FixAttempt = z.infer<typeof fixAttemptSchema>;