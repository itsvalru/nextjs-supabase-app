"use client";

interface ConnectionStatusProps {
  status: "connected" | "disconnected" | "connecting";
}

export default function ConnectionStatus({ status }: ConnectionStatusProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "connected":
        return {
          text: "Live",
          className: "bg-emerald-100 text-emerald-700 border-emerald-200",
          icon: "🟢",
        };
      case "connecting":
        return {
          text: "Connecting...",
          className:
            "bg-amber-100 text-amber-700 border-amber-200 animate-pulse",
          icon: "🟡",
        };
      case "disconnected":
        return {
          text: "Disconnected",
          className: "bg-red-100 text-red-700 border-red-200",
          icon: "🔴",
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className="flex justify-end mb-4">
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-200 ${config.className}`}
      >
        <span className="text-sm">{config.icon}</span>
        <span>{config.text}</span>
      </div>
    </div>
  );
}
