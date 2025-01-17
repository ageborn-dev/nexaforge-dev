import React, { useState, useEffect } from "react";
import { Settings2, X, Undo2, HelpCircle } from "lucide-react";
import { AI_PROVIDERS } from "@/config/ai-providers";
import * as Tooltip from "@radix-ui/react-tooltip";
import { AISettings } from '@/types/models/ai';

interface AISettingsPanelProps {
  visible: boolean;
  onClose: () => void;
  model: string;
  provider: string;
  settings: AISettings;
  onSettingsChange: (settings: AISettings) => void;
  onApply?: () => void;
}

const settingTooltips = {
  temperature:
    "Controls randomness in the output. Higher values (e.g., 0.8) make the output more creative but less predictable, while lower values (e.g., 0.2) make it more focused and deterministic.",
  maxTokens:
    "The maximum length of the generated code. Higher values allow for longer outputs but consume more resources. Set based on your needs while staying within model limits.",
  topP: "Controls diversity of word choices. Lower values (e.g., 0.1) make the output more focused, while higher values (0.9) allow for more diverse responses. Often used as an alternative to temperature.",
  streamOutput:
    "When enabled, shows the generated code in real-time as it's being created. Disable for faster bulk generation.",
  frequencyPenalty:
    "Reduces repetition by lowering the likelihood of using frequently used words. Higher values (-2.0 to 2.0) make the output more diverse but potentially less focused.",
  presencePenalty:
    "Encourages the model to use new topics by penalizing tokens that have appeared before. Higher values (-2.0 to 2.0) encourage more novel outputs.",
};

const getDefaultSettingsForModel = (modelId: string): AISettings => {
  const model = Object.values(AI_PROVIDERS)
    .flat()
    .find((m) => m.id === modelId);

  if (!model) {
    console.warn(`Model ${modelId} not found in configuration`);
    return defaultProviderSettings.anthropic;
  }

  switch (model.provider) {
    case "deepseek":
      return {
        temperature: 0.0,
        maxTokens: model.maxTokens,
        topP: 1,
        streamOutput: true,
        frequencyPenalty: 0,
        presencePenalty: 0,
      };
    case "google":
    case "anthropic":
    case "openai":
      return {
        temperature: 0.7,
        maxTokens: model.maxTokens,
        topP: 1,
        streamOutput: true,
        frequencyPenalty: 0,
        presencePenalty: 0,
      };
      case "ollama": 
        return {
          temperature: 0.7,
          maxTokens: model.maxTokens,
          topP: 1,
          streamOutput: true,
          frequencyPenalty: 0,
          presencePenalty: 0,
        };

    default:
      return defaultProviderSettings.anthropic;
  }
};

const defaultProviderSettings: Record<string, AISettings> = {
  openai: {
    temperature: 0.7,
    maxTokens: 64000,
    topP: 1,
    streamOutput: true,
    frequencyPenalty: 0,
    presencePenalty: 0,
  },
  anthropic: {
    temperature: 0.7,
    maxTokens: 100000,
    topP: 1,
    streamOutput: true,
    frequencyPenalty: 0,
    presencePenalty: 0,
  },
  google: {
    temperature: 0.7,
    maxTokens: 100000,
    topP: 1,
    streamOutput: true,
    frequencyPenalty: 0,
    presencePenalty: 0,
  },
  deepseek: {
    temperature: 0.0,
    maxTokens: 32768,
    topP: 1,
    streamOutput: true,
    frequencyPenalty: 0,
    presencePenalty: 0,
  },
  ollama: {
    temperature: 0.7,
    maxTokens: 4096,
    topP: 1,
    streamOutput: true,
    frequencyPenalty: 0,
    presencePenalty: 0,
  },
};

const AISettingsPanel: React.FC<AISettingsPanelProps> = ({
  visible,
  onClose,
  model,
  provider,
  settings,
  onSettingsChange,

}) => {
  const [localSettings, setLocalSettings] = useState<AISettings>(settings);
  const [currentModel, setCurrentModel] = useState(model);

  useEffect(() => {
    if (model !== currentModel) {
      const newDefaultSettings = getDefaultSettingsForModel(model);
      setLocalSettings(newDefaultSettings);
      onSettingsChange(newDefaultSettings);
      setCurrentModel(model);
    }
  }, [model, currentModel, onSettingsChange]);

  const handleSettingChange = (
    key: keyof AISettings,
    value: number | boolean,
  ) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
  };

  const modelConfig = Object.values(AI_PROVIDERS)
    .flat()
    .find((m) => m.id === model);

  const renderSettingLabel = (
    label: string,
    tooltipKey: keyof typeof settingTooltips,
  ) => (
    <div className="flex items-center gap-1">
      <span className="text-xs text-white">{label}</span>
      <Tooltip.Provider delayDuration={200}>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <button className="rounded-full p-0.5 hover:bg-white/10">
              <HelpCircle className="h-3 w-3 text-white/70" />
            </button>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              className="animate-in fade-in-0 zoom-in-95 z-[100] max-w-xs rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-sm text-white shadow-lg"
              sideOffset={5}
              side="left"
              align="center"
              style={{ zIndex: 100 }}
            >
              {settingTooltips[tooltipKey]}
              <Tooltip.Arrow className="fill-gray-900" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
    </div>
  );

  if (!visible) return null;

  return (
    <div className="fixed right-4 top-24 z-50 w-80 rounded-lg border border-white/20 bg-white/10 p-4 backdrop-blur-lg">
      <div className="flex items-center justify-between pb-4">
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-white" />
          <span className="text-sm font-medium text-white">
            Settings for {modelConfig?.name || model}
          </span>
        </div>
        <button onClick={onClose} className="rounded p-1 hover:bg-white/20">
          <X className="h-4 w-4 text-white" />
        </button>
      </div>

      <div className="space-y-6">
        {/* Temperature */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            {renderSettingLabel("Temperature", "temperature")}
            <span className="text-xs text-white/70">
              {localSettings.temperature}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={localSettings.temperature}
            onChange={(e) =>
              handleSettingChange("temperature", parseFloat(e.target.value))
            }
            className="w-full accent-blue-500"
          />
        </div>

        {/* Max Tokens */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            {renderSettingLabel("Max Tokens", "maxTokens")}
            <input
              type="number"
              value={localSettings.maxTokens}
              onChange={(e) =>
                handleSettingChange("maxTokens", parseInt(e.target.value))
              }
              className="w-24 rounded border border-white/20 bg-white/10 px-2 py-1 text-xs text-white"
              max={modelConfig?.maxTokens}
            />
          </div>
          <div className="text-xs text-white/50">
            Max available: {modelConfig?.maxTokens.toLocaleString()}
          </div>
        </div>

        {/* Top P */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            {renderSettingLabel("Top P", "topP")}
            <span className="text-xs text-white/70">{localSettings.topP}</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={localSettings.topP}
            onChange={(e) =>
              handleSettingChange("topP", parseFloat(e.target.value))
            }
            className="w-full accent-blue-500"
          />
        </div>

        {/* Stream Output */}
        <div className="flex items-center justify-between">
          {renderSettingLabel("Stream Output", "streamOutput")}
          <button
            onClick={() =>
              handleSettingChange("streamOutput", !localSettings.streamOutput)
            }
            className={`relative h-6 w-11 rounded-full transition-colors ${
              localSettings.streamOutput ? "bg-blue-500" : "bg-white/20"
            }`}
          >
            <span
              className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                localSettings.streamOutput ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>

        {/* Frequency Penalty */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            {renderSettingLabel("Frequency Penalty", "frequencyPenalty")}
            <span className="text-xs text-white/70">
              {localSettings.frequencyPenalty}
            </span>
          </div>
          <input
            type="range"
            min="-2"
            max="2"
            step="0.1"
            value={localSettings.frequencyPenalty}
            onChange={(e) =>
              handleSettingChange(
                "frequencyPenalty",
                parseFloat(e.target.value),
              )
            }
            className="w-full accent-blue-500"
          />
        </div>

        {/* Presence Penalty */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            {renderSettingLabel("Presence Penalty", "presencePenalty")}
            <span className="text-xs text-white/70">
              {localSettings.presencePenalty}
            </span>
          </div>
          <input
            type="range"
            min="-2"
            max="2"
            step="0.1"
            value={localSettings.presencePenalty}
            onChange={(e) =>
              handleSettingChange("presencePenalty", parseFloat(e.target.value))
            }
            className="w-full accent-blue-500"
          />
        </div>

        {/* Reset Button */}
        <button
          onClick={() => {
            const defaultSettings = getDefaultSettingsForModel(model);
            setLocalSettings(defaultSettings);
          }}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
        >
          <Undo2 className="h-4 w-4" />
          Reset to Model Defaults
        </button>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
          >
            Cancel
          </button>
          <button
            onClick={() => onSettingsChange(localSettings)}
            className="flex-1 rounded-lg bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

export default AISettingsPanel;
