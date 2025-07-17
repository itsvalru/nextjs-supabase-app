"use client";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
}

export default function LoadingSpinner({
  size = "md",
  text,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-12 w-12",
    lg: "h-16 w-16",
  };

  return (
    <div className="text-center">
      <div
        className={`animate-spin rounded-full border-b-2 border-pink-500 mx-auto mb-4 ${sizeClasses[size]}`}
      ></div>
      {text && <p className="text-gray-600">{text}</p>}
    </div>
  );
}
