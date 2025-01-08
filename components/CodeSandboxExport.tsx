import React, { useState } from 'react';
import { Boxes, Loader2 } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';

interface CodeSandboxExportProps {
  code: string;
  prompt: string;
  dependencies: Record<string, string>;
}

const CodeSandboxExport: React.FC<CodeSandboxExportProps> = ({
  code,
  prompt,
  dependencies
}) => {
  const [isExporting, setIsExporting] = useState(false);

  const createCodeSandbox = async () => {
    setIsExporting(true);
    try {
      // Create package.json
      const packageJson = {
        name: "generated-react-app",
        version: "1.0.0",
        description: `Generated from prompt: ${prompt}`,
        dependencies: {
          "react": "^18.0.0",
          "react-dom": "^18.0.0",
          "@types/react": "^18.0.0",
          "@types/react-dom": "^18.0.0",
          "typescript": "^4.9.0",
          ...dependencies
        },
        main: "src/index.tsx"
      };

      // Create tsconfig
      const tsConfig = {
        include: ["src"],
        compilerOptions: {
          strict: true,
          esModuleInterop: true,
          lib: ["dom", "es2015"],
          jsx: "react-jsx"
        }
      };

      // Prepare files for CodeSandbox
      const files = {
        "package.json": {
          content: JSON.stringify(packageJson, null, 2)
        },
        "tsconfig.json": {
          content: JSON.stringify(tsConfig, null, 2)
        },
        "src/App.tsx": {
          content: code
        },
        "src/index.tsx": {
          content: `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

const rootElement = document.getElementById("root");
const root = createRoot(rootElement!);

root.render(
  <StrictMode>
    <App />
  </StrictMode>
);`
        },
        "public/index.html": {
          content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Generated React App</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`
        }
      };

      // Create sandbox using CodeSandbox API
      const response = await fetch('https://codesandbox.io/api/v1/sandboxes/define?json=1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files: Object.entries(files).reduce((acc, [path, file]) => ({
            ...acc,
            [path]: { content: file.content }
          }), {}),
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create CodeSandbox');
      }

      const { sandbox_id } = await response.json();
      window.open(`https://codesandbox.io/s/${sandbox_id}`, '_blank');
    } catch (error) {
      console.error('Error creating CodeSandbox:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="inline-block">
      <Popover.Root>
        <Popover.Trigger asChild>
          <button
            onClick={createCodeSandbox}
            disabled={isExporting}
            className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm text-white backdrop-blur-lg transition-colors hover:bg-white/20 disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Boxes className="h-4 w-4" />
                Open in CodeSandbox
              </>
            )}
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            className="z-50 w-80 rounded-lg border border-white/20 bg-white/10 p-4 backdrop-blur-lg"
            sideOffset={5}
          >
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-white">Project Structure</h3>
              <div className="space-y-2 rounded-lg bg-white/5 p-3 text-sm text-white/70">
                <pre className="font-mono">
{`├── src/
│   ├── App.tsx
│   └── index.tsx
├── public/
│   └── index.html
├── package.json
└── tsconfig.json`}
                </pre>
              </div>
              <div className="space-y-1 text-xs text-white/50">
                <p>• All dependencies will be automatically installed</p>
                <p>• Tailwind CSS is included via CDN</p>
                <p>• TypeScript is pre-configured</p>
              </div>
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
};

export default CodeSandboxExport;