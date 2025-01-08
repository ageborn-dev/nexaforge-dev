"use client";

import React from 'react';
import CodeViewer from './code-viewer';
import { ArrowLeft, Clock, Eye } from 'lucide-react';
import Link from 'next/link';

interface SharedCodeViewerProps {
  shareData: {
    content: {
      code: string;
      prompt: string;
      model: string;
      settings: any;
    };
    expiresAt?: string;
    remainingViews?: number;
  };
}

const SharedCodeViewer: React.FC<SharedCodeViewerProps> = ({ shareData }) => {
  const { content, expiresAt, remainingViews } = shareData;
  const expiresDate = expiresAt ? new Date(expiresAt) : null;

  return (
    <div className="min-h-screen bg-gray-900 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-2 text-sm text-white/70 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Generator
          </Link>
          
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">Shared Code</h1>
            <div className="flex items-center gap-4 text-sm text-white/70">
              {expiresDate && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Expires {expiresDate.toLocaleDateString()}
                </div>
              )}
              {remainingViews !== undefined && remainingViews !== null && (
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  {remainingViews} views remaining
                </div>
              )}
            </div>
          </div>

          {content.prompt && (
            <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-4">
              <h2 className="mb-2 text-sm font-medium text-white">Original Prompt</h2>
              <p className="text-sm text-white/70">{content.prompt}</p>
            </div>
          )}
        </div>

        <CodeViewer
          code={content.code}
          showEditor={true}
          model={content.model}
          prompt={content.prompt}
          settings={content.settings}
        />
      </div>
    </div>
  );
};

export default SharedCodeViewer;