// components/ShareCode.tsx

import React, { useState } from "react";
import { Share2, Check, Copy, Link, Clock, Lock, Eye } from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
import * as Switch from "@radix-ui/react-switch";

interface ShareCodeProps {
  code: string;
  prompt: string;
  model: string;
  settings: any;
}

interface ShareOptions {
  password?: string;
  expiresIn?: number;
  allowedViews?: number;
  generateQR?: boolean;
}

const ShareCode: React.FC<ShareCodeProps> = ({
  code,
  prompt,
  model,
  settings,
}) => {
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [shareOptions, setShareOptions] = useState<ShareOptions>({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  const generateShareUrl = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/share", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code,
          prompt,
          model,
          settings,
          ...shareOptions,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate share link");
      }

      const { id, qrCode } = await response.json();
      const url = `${window.location.origin}/share/${id}`;
      setShareUrl(url);
      return { url, qrCode };
    } catch (error) {
      console.error("Error generating share URL:", error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleShare = async () => {
    const result = await generateShareUrl();
    if (result?.url) {
      copyToClipboard(result.url);
    }
  };

  return (
    <div className="inline-block">
      <Popover.Root>
        <Popover.Trigger asChild>
          <button className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm text-white backdrop-blur-lg transition-colors hover:bg-white/20">
            <Share2 className="h-4 w-4" />
            {copied ? "Copied!" : "Share"}
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            className="z-50 w-80 rounded-lg border border-gray-400 bg-gray-800/70 p-4 shadow-md backdrop-blur-sm"
            sideOffset={5}
          >
            <div className="space-y-4">
              {/* Basic/Advanced Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-white">Advanced Options</span>
                <Switch.Root
                  checked={showAdvanced}
                  onCheckedChange={setShowAdvanced}
                  className="relative h-6 w-11 rounded-full bg-white/20 transition-colors data-[state=checked]:bg-blue-500"
                >
                  <Switch.Thumb className="block h-4 w-4 translate-x-1 rounded-full bg-white transition-transform data-[state=checked]:translate-x-6" />
                </Switch.Root>
              </div>

              {showAdvanced && (
                <div className="space-y-4">
                  {/* Password Protection */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm text-blue-400">
                      <Lock className="h-4 w-4 text-blue-400" />
                      Password Protection
                    </label>
                    <input
                      type="password"
                      placeholder="Enter password..."
                      className="w-full rounded-lg bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-500"
                      onChange={(e) =>
                        setShareOptions((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }))
                      }
                    />
                  </div>

                  {/* Expiration */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm text-blue-400">
                      <Clock className="h-4 w-4 text-blue-400" />
                      Expires After (hours)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="168"
                      placeholder="Never"
                      className="w-full rounded-lg bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-500"
                      onChange={(e) =>
                        setShareOptions((prev) => ({
                          ...prev,
                          expiresIn: parseInt(e.target.value),
                        }))
                      }
                    />
                  </div>

                  {/* View Limit */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm text-blue-400">
                      <Eye className="h-4 w-4 text-blue-400" />
                      View Limit
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="Unlimited"
                      className="w-full rounded-lg bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-500"
                      onChange={(e) =>
                        setShareOptions((prev) => ({
                          ...prev,
                          allowedViews: parseInt(e.target.value),
                        }))
                      }
                    />
                  </div>
                </div>
              )}

              <button
                onClick={handleShare}
                disabled={isLoading}
                className="w-full rounded-lg bg-blue-500 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
              >
                {isLoading ? "Generating..." : "Generate Share Link"}
              </button>

              {shareUrl && (
                <div className="flex items-center gap-2 rounded-lg bg-white/5 p-2">
                  <Link className="h-4 w-4 text-white/70" />
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 bg-transparent text-sm text-white/70 outline-none"
                  />
                </div>
              )}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
};

export default ShareCode;
