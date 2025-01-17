export interface ErrorFixContext {
    provider: string;
    model: string;
    code: string;
    error: string;
    errorDetails?: {
      line?: number;
      column?: number;
      message: string;
    };
  }
  
  export interface CodeError {
    error_type: string;
    line_number?: number;
    column?: number;
    error_message: string;
    suggested_fix: string;
    fix_explanation: string;
    confidence: number;
  }
  
  export interface FixAttempt {
    original_error: CodeError;
    fix_successful: boolean;
    fixed_code?: string;
    remaining_issues?: string[];
    next_steps?: string[];
  }