"use client";

import Link from "next/link";

interface ErrorCardProps {
  title: string;
  message: string;
  showBackButton?: boolean;
}

export default function ErrorCard({
  title,
  message,
  showBackButton = true,
}: ErrorCardProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-pink-200 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">{title}</h1>
        <p className="text-gray-600 mb-6">{message}</p>
        {showBackButton && (
          <Link
            href="/"
            className="bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold py-3 px-6 rounded-xl hover:from-pink-600 hover:to-purple-700 transition-all duration-200"
          >
            Back to Home
          </Link>
        )}
      </div>
    </div>
  );
}
