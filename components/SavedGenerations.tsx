import React, { useState, useEffect } from 'react';
import { Save, Folder, Trash2, Clock, ChevronRight, Zap } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import { useRouter } from 'next/navigation';

interface Analytics {
  modelName: string;
  provider: string;
  promptTokens: number;
  responseTokens: number;
  totalTokens: number;
  maxTokens: number;
  utilizationPercentage: number;
}

interface SavedGeneration {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
  generatedApp: {
    id: string;
    code: string;
    model: string;
    prompt: string;
    analytics: Analytics | null;
  };
}

interface SavedGenerationsProps {
  currentGeneratedAppId: string | null;
  currentCode: string;
  currentPrompt: string;
  currentModel: string;
  currentSettings: any;
  onLoad: (generation: SavedGeneration) => void;
}

const SavedGenerations: React.FC<SavedGenerationsProps> = ({
  currentGeneratedAppId,
  currentCode,
  currentPrompt,
  currentModel,
  currentSettings,
  onLoad
}) => {
  const [generations, setGenerations] = useState<SavedGeneration[]>([]);
  const [saveTitle, setSaveTitle] = useState('');
  const [saveDescription, setSaveDescription] = useState('');
  const [savePopoverOpen, setSavePopoverOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();


  useEffect(() => {
    fetchSavedGenerations();
  }, []);

  const fetchSavedGenerations = async () => {
    try {
      const response = await fetch('/api/saved-generations');
      if (!response.ok) throw new Error('Failed to fetch saved generations');
      const data = await response.json();
      setGenerations(data);
    } catch (error) {
      console.error('Error fetching saved generations:', error);
    }
  };

  const saveGeneration = async () => {
    if (!currentGeneratedAppId || !saveTitle) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/saved-generations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: saveTitle,
          description: saveDescription,
          generatedAppId: currentGeneratedAppId,
        }),
      });

      if (!response.ok) throw new Error('Failed to save generation');

      // Reset form and fetch updated list
      setSavePopoverOpen(false);
      setSaveTitle('');
      setSaveDescription('');
      await fetchSavedGenerations();
      router.refresh();
    } catch (error) {
      console.error('Error saving generation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteGeneration = async (id: string) => {
    try {
      const response = await fetch(`/api/saved-generations?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete generation');
      
      await fetchSavedGenerations();
      router.refresh();
    } catch (error) {
      console.error('Error deleting generation:', error);
    }
  };

  return (
    <div className="fixed left-4 top-4 z-50">
      <div className="flex items-center gap-2">
        <Popover.Root open={savePopoverOpen} onOpenChange={setSavePopoverOpen}>
          <Popover.Trigger asChild>
            <button
              className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm text-white backdrop-blur-lg transition-colors hover:bg-white/20"
              disabled={!currentGeneratedAppId}
            >
              <Save className="h-4 w-4 text-blue-500" />
              Save Generation
            </button>
          </Popover.Trigger>

          <Popover.Portal>
            <Popover.Content
              className="z-50 w-80 rounded-lg border border-white/20 bg-white/10 p-4 backdrop-blur-lg"
              sideOffset={5}
            >
              <div className="space-y-4">
                <input
                  type="text"
                  value={saveTitle}
                  onChange={(e) => setSaveTitle(e.target.value)}
                  placeholder="Enter a title..."
                  className="w-full rounded-lg bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/50"
                />
                <textarea
                  value={saveDescription}
                  onChange={(e) => setSaveDescription(e.target.value)}
                  placeholder="Add a description (optional)..."
                  className="h-20 w-full rounded-lg bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/50"
                />
                <button
                  onClick={saveGeneration}
                  disabled={!saveTitle || isLoading}
                  className="w-full rounded-lg bg-blue-500 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
                >
                  {isLoading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>

        <Popover.Root>
          <Popover.Trigger asChild>
            <button
              className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm text-white backdrop-blur-lg transition-colors hover:bg-white/20"
            >
              <Folder className="h-4 w-4 text-blue-500" />
              Saved Generations
            </button>
          </Popover.Trigger>

          <Popover.Portal>
            <Popover.Content
              className="z-50 w-96 rounded-lg border border-white/20 bg-white/10 p-4 backdrop-blur-lg"
              sideOffset={5}
            >
              <div className="max-h-[70vh] space-y-4 overflow-y-auto">
                {generations.length === 0 ? (
                  <p className="text-center text-sm text-white/70">No saved generations yet</p>
                ) : (
                  generations.map((gen) => (
                    <div
                      key={gen.id}
                      className="rounded-lg border border-white/10 bg-white/5 p-3"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-white">{gen.title}</h3>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => deleteGeneration(gen.id)}
                            className="rounded p-1 text-white/70 hover:bg-white/10 hover:text-white"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => onLoad(gen)}
                            className="rounded p-1 text-white/70 hover:bg-white/10 hover:text-white"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      {gen.description && (
                        <p className="mt-1 text-sm text-white/70">{gen.description}</p>
                      )}
                      <div className="mt-2 flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-xs text-white/50">
                          <Clock className="h-3 w-3" />
                          {new Date(gen.createdAt).toLocaleDateString()}
                        </div>
                        {gen.generatedApp?.analytics && (
                          <div className="flex items-center gap-2 text-xs text-white/50">
                            <Zap className="h-3 w-3" />
                            {gen.generatedApp.analytics.provider} - {gen.generatedApp.analytics.modelName}
                            <span className="ml-1">
                              ({gen.generatedApp.analytics.totalTokens.toLocaleString()} tokens)
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>
    </div>
  );
};

export default SavedGenerations;
