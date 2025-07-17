"use client";

import { useState, useEffect } from "react";

interface GameSettings {
  totalRounds: number;
  questionCategories: string[];
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: GameSettings) => Promise<void>;
  currentSettings: GameSettings;
  isLoading?: boolean;
}

const AVAILABLE_CATEGORIES = [
  "Alltag",
  "Spaß",
  "Persönlich",
  "Reisen",
  "Mutprobe",
  "Fitness",
  "Lifestyle",
];

export default function SettingsModal({
  isOpen,
  onClose,
  onSave,
  currentSettings,
  isLoading = false,
}: SettingsModalProps) {
  const [settings, setSettings] = useState<GameSettings>(currentSettings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSettings(currentSettings);
  }, [currentSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(settings);
      onClose();
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = (category: string) => {
    setSettings((prev) => ({
      ...prev,
      questionCategories: prev.questionCategories.includes(category)
        ? prev.questionCategories.filter((c) => c !== category)
        : [...prev.questionCategories, category],
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            Game Settings
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            disabled={saving}
          >
            ✕
          </button>
        </div>

        {/* Number of Rounds */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Number of Rounds: {settings.totalRounds}
          </label>
          <input
            type="range"
            min="3"
            max="30"
            value={settings.totalRounds}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                totalRounds: parseInt(e.target.value),
              }))
            }
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            disabled={saving}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>3</span>
            <span>30</span>
          </div>
        </div>

        {/* Question Categories */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Question Categories ({settings.questionCategories.length} selected)
          </label>
          <div className="grid grid-cols-2 gap-2">
            {AVAILABLE_CATEGORIES.map((category) => (
              <label
                key={category}
                className={`flex items-center p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                  settings.questionCategories.includes(category)
                    ? "border-pink-500 bg-pink-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={settings.questionCategories.includes(category)}
                  onChange={() => toggleCategory(category)}
                  className="sr-only"
                  disabled={saving}
                />
                <span className="text-sm font-medium text-black">
                  {category}
                </span>
              </label>
            ))}
          </div>
          {settings.questionCategories.length === 0 && (
            <p className="text-red-500 text-xs mt-2">
              Please select at least one category
            </p>
          )}
        </div>

        {/* Game Flow Preview */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Game Flow Preview
          </label>
          <div className="bg-gray-50 rounded-xl p-3 text-xs">
            <p className="text-gray-600 mb-2">
              {settings.totalRounds} rounds total
            </p>
            <p className="text-gray-600">
              Categories: {settings.questionCategories.join(", ")}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || settings.questionCategories.length === 0}
            className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-3 rounded-xl font-medium hover:from-pink-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
