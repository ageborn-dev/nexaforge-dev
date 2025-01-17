"use client";

import * as shadcnComponents from "@/utils/shadcn";
import { Sandpack } from "@codesandbox/sandpack-react";
import {
  SandpackPreview,
  SandpackProvider,
  useActiveCode,
  useSandpack,
} from "@codesandbox/sandpack-react/unstyled";
import { dracula as draculaTheme } from "@codesandbox/sandpack-themes";
import { Copy, Download, ExternalLink, Share2, Boxes, Check } from 'lucide-react';
import dedent from "dedent";
import "./code-viewer.css";
import { useEffect, useState } from "react";
import ShareCode from '@/components/ShareCode';
import { AISettings } from '@/types';

interface CodeViewerProps {
  code: string;
  showEditor?: boolean;
  model: string;
  prompt: string;
  settings?: AISettings;
  onError?: (error: string | null) => void;
}

function EditorControls({ code, model, prompt, settings }: { 
  code: string;
  model: string;
  prompt: string;
  settings?: AISettings;
}) {
  const { sandpack } = useSandpack();
  const { code: activeCode } = useActiveCode();
  const [shareUrl, setShareUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeCode);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([activeCode], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "App.tsx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleVSCode = async () => {
    try {
      if (!('showSaveFilePicker' in window)) {
        throw new Error('File System Access API not supported');
      }

      const blob = new Blob([activeCode], { type: 'text/plain' });
      const fileHandle = await (window as any).showSaveFilePicker({
        suggestedName: 'App.tsx',
        types: [{
          description: 'TypeScript Files',
          accept: { 'text/plain': ['.tsx'] },
        }],
      });
      
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();

      window.location.href = `vscode://file/${fileHandle.name}`;
    } catch (error) {
      console.error('Error opening in VSCode:', error);
      handleDownload();
      alert('Opening in VSCode failed. The file has been downloaded instead.');
    }
  };

  const handleCodeSandbox = async () => {
    try {
      // Create package.json
      const packageJson = {
        name: "generated-react-app",
        version: "1.0.0",
        description: `Generated from prompt: ${prompt}`,
        dependencies: {
          ...sharedProps.customSetup.dependencies
        },
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

      // Prepare files
      const files = {
        "package.json": {
          content: JSON.stringify(packageJson, null, 2)
        },
        "tsconfig.json": {
          content: JSON.stringify(tsConfig, null, 2)
        },
        "src/App.tsx": {
          content: activeCode
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
          content: sharedFiles["/public/index.html"]
        }
      };

      const response = await fetch('https://codesandbox.io/api/v1/sandboxes/define?json=1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: Object.entries(files).reduce((acc, [path, file]) => ({
            ...acc,
            [path]: { content: file.content }
          }), {})
        })
      });

      if (!response.ok) throw new Error('Failed to create CodeSandbox');

      const { sandbox_id } = await response.json();
      window.open(`https://codesandbox.io/s/${sandbox_id}`, '_blank');
    } catch (error) {
      console.error('Error creating CodeSandbox:', error);
    }
  };

  return (
    <div className="flex items-center justify-end gap-2 mb-4">      
      <button
        onClick={handleCopy}
        className="rounded-lg border border-white/20 bg-white/10 p-2 text-white hover:bg-white/20"
        title="Copy to Clipboard"
      >
        <Copy className="h-4 w-4" />
      </button>
      
      <button
        onClick={handleDownload}
        className="rounded-lg border border-white/20 bg-white/10 p-2 text-white hover:bg-white/20"
        title="Download Code"
      >
        <Download className="h-4 w-4" />
      </button>
      
      <button
        onClick={handleVSCode}
        className="rounded-lg border border-white/20 bg-white/10 p-2 text-white hover:bg-white/20"
        title="Open in VS Code"
      >
        <ExternalLink className="h-4 w-4" />
      </button>

      <ShareCode 
        code={code}
        model={model}
        prompt={prompt}
        settings={settings}
      />

      <button
        onClick={handleCodeSandbox}
        className="rounded-lg border border-white/20 bg-white/10 p-2 text-white hover:bg-white/20"
        title="Open in CodeSandbox"
      >
        <Boxes className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function CodeViewer({ code, showEditor = false, model, prompt, settings, onError }: CodeViewerProps) {
  useEffect(() => {
    const handleError = (error: string | null) => {
      onError?.(error);
    };

    return () => {
      handleError(null);
    };
  }, [onError]);

  return showEditor ? (
    <SandpackProvider
      files={{
        "App.tsx": code,
        ...sharedFiles,
      }}
      className="flex h-full w-full grow flex-col justify-center"
      options={{ ...sharedOptions }}
      {...sharedProps}
    >
      <div className="relative">
        <EditorControls 
          code={code}
          model={model}
          prompt={prompt}
          settings={settings}
        />
        <Sandpack
          options={{
            showNavigator: true,
            editorHeight: "calc(100vh - 200px)",
            editorWidthPercentage: 60,
            showInlineErrors: true,
            showLineNumbers: true,
            showTabs: false,
            ...sharedOptions,
          }}
          files={{
            "App.tsx": code,
            ...sharedFiles,
          }}
          {...sharedProps}
        />
      </div>
    </SandpackProvider>
  ) : (
    <SandpackProvider
      files={{
        "App.tsx": code,
        ...sharedFiles,
      }}
      className="flex h-full w-full grow flex-col justify-center"
      options={{ ...sharedOptions }}
      {...sharedProps}
    >
      <SandpackPreview
        className="flex h-full w-full grow flex-col justify-center p-4 md:pt-16"
        showOpenInCodeSandbox={false}
        showRefreshButton={false}
      />
    </SandpackProvider>
  );
}

let sharedProps = {
  template: "react-ts",
  theme: draculaTheme,
  customSetup: {
    dependencies: {
      "lucide-react": "latest",
      recharts: "2.9.0",
      "react-router-dom": "latest",
      "@radix-ui/react-accordion": "^1.2.0",
      "@radix-ui/react-alert-dialog": "^1.1.1",
      "@radix-ui/react-aspect-ratio": "^1.1.0",
      "@radix-ui/react-avatar": "^1.1.0",
      "@radix-ui/react-checkbox": "^1.1.1",
      "@radix-ui/react-collapsible": "^1.1.0",
      "@radix-ui/react-dialog": "^1.1.1",
      "@radix-ui/react-dropdown-menu": "^2.1.1",
      "@radix-ui/react-hover-card": "^1.1.1",
      "@radix-ui/react-label": "^2.1.0",
      "@radix-ui/react-menubar": "^1.1.1",
      "@radix-ui/react-navigation-menu": "^1.2.0",
      "@radix-ui/react-popover": "^1.1.1",
      "@radix-ui/react-progress": "^1.1.0",
      "@radix-ui/react-radio-group": "^1.2.0",
      "@radix-ui/react-select": "^2.1.1",
      "@radix-ui/react-separator": "^1.1.0",
      "@radix-ui/react-slider": "^1.2.0",
      "@radix-ui/react-slot": "^1.1.0",
      "@radix-ui/react-switch": "^1.1.0",
      "@radix-ui/react-tabs": "^1.1.0",
      "@radix-ui/react-toast": "^1.2.1",
      "@radix-ui/react-toggle": "^1.1.0",
      "@radix-ui/react-toggle-group": "^1.1.0",
      "@radix-ui/react-tooltip": "^1.1.2",
      "class-variance-authority": "^0.7.0",
      clsx: "^2.1.1",
      "date-fns": "^3.6.0",
      "embla-carousel-react": "^8.1.8",
      "react-day-picker": "^8.10.1",
      "tailwind-merge": "^2.4.0",
      "tailwindcss-animate": "^1.0.7",
      vaul: "^0.9.1",
    },
  },
} as const;

let sharedOptions = {
  externalResources: [
    "https://unpkg.com/@tailwindcss/ui/dist/tailwind-ui.min.css",
  ],
};

let sharedFiles = {
  "/lib/utils.ts": shadcnComponents.utils,
  "/components/ui/accordion.tsx": shadcnComponents.accordian,
  "/components/ui/alert-dialog.tsx": shadcnComponents.alertDialog,
  "/components/ui/alert.tsx": shadcnComponents.alert,
  "/components/ui/avatar.tsx": shadcnComponents.avatar,
  "/components/ui/badge.tsx": shadcnComponents.badge,
  "/components/ui/breadcrumb.tsx": shadcnComponents.breadcrumb,
  "/components/ui/button.tsx": shadcnComponents.button,
  "/components/ui/calendar.tsx": shadcnComponents.calendar,
  "/components/ui/card.tsx": shadcnComponents.card,
  "/components/ui/carousel.tsx": shadcnComponents.carousel,
  "/components/ui/checkbox.tsx": shadcnComponents.checkbox,
  "/components/ui/collapsible.tsx": shadcnComponents.collapsible,
  "/components/ui/dialog.tsx": shadcnComponents.dialog,
  "/components/ui/drawer.tsx": shadcnComponents.drawer,
  "/components/ui/dropdown-menu.tsx": shadcnComponents.dropdownMenu,
  "/components/ui/input.tsx": shadcnComponents.input,
  "/components/ui/label.tsx": shadcnComponents.label,
  "/components/ui/menubar.tsx": shadcnComponents.menuBar,
  "/components/ui/navigation-menu.tsx": shadcnComponents.navigationMenu,
  "/components/ui/pagination.tsx": shadcnComponents.pagination,
  "/components/ui/popover.tsx": shadcnComponents.popover,
  "/components/ui/progress.tsx": shadcnComponents.progress,
  "/components/ui/radio-group.tsx": shadcnComponents.radioGroup,
  "/components/ui/select.tsx": shadcnComponents.select,
  "/components/ui/separator.tsx": shadcnComponents.separator,
  "/components/ui/skeleton.tsx": shadcnComponents.skeleton,
  "/components/ui/slider.tsx": shadcnComponents.slider,
  "/components/ui/switch.tsx": shadcnComponents.switchComponent,
  "/components/ui/table.tsx": shadcnComponents.table,
  "/components/ui/tabs.tsx": shadcnComponents.tabs,
  "/components/ui/textarea.tsx": shadcnComponents.textarea,
  "/components/ui/toast.tsx": shadcnComponents.toast,
  "/components/ui/toaster.tsx": shadcnComponents.toaster,
  "/components/ui/toggle-group.tsx": shadcnComponents.toggleGroup,
  "/components/ui/toggle.tsx": shadcnComponents.toggle,
  "/components/ui/tooltip.tsx": shadcnComponents.tooltip,
  "/components/ui/use-toast.tsx": shadcnComponents.useToast,
  "/public/index.html": dedent`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Document</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body>
        <div id="root"></div>
      </body>
    </html>
  `,
};