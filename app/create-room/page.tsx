"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getOrCreateGuestId } from "@/lib/client-cookies";

const AVATAR_OPTIONS = [
  "😊",
  "😎",
  "🤓",
  "😍",
  "😇",
  "🤠",
  "👻",
  "🦄",
  "🐱",
  "🐶",
  "🦊",
  "🐼",
  "🌸",
  "🌺",
  "🌻",
  "🌹",
  "🌷",
  "💐",
  "🍀",
  "🌿",
  "🌱",
  "🌵",
  "🌴",
  "🌳",
];

interface UserSession {
  userId: string;
  name: string;
  avatar?: string;
  adminRooms: string[];
  currentRoom?: string;
}

function getClientUserSession(): UserSession | null {
  if (typeof window === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; user_session=`);
  if (parts.length === 2) {
    try {
      const sessionValue = parts.pop()?.split(";").shift();
      return sessionValue ? JSON.parse(sessionValue) : null;
    } catch {
      return null;
    }
  }
  return null;
}

function setClientUserSession(session: UserSession) {
  if (typeof document === "undefined") return;
  document.cookie = `user_session=${JSON.stringify(session)}; path=/; max-age=${
    60 * 60 * 24 * 30
  }`;
}

export default function CreateRoom() {
  const router = useRouter();
  const [roomName, setRoomName] = useState("");
  const [isPermanent, setIsPermanent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Session-aware state
  const [session, setSession] = useState<UserSession | null>(null);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [showEdit, setShowEdit] = useState(false);

  useEffect(() => {
    const sess = getClientUserSession();
    if (sess) {
      setSession(sess);
      setName(sess.name);
      setAvatar(sess.avatar || "");
    } else {
      // Preselect a random emoji for new users
      const randomEmoji =
        AVATAR_OPTIONS[Math.floor(Math.random() * AVATAR_OPTIONS.length)];
      setAvatar(randomEmoji);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!roomName.trim() || !name.trim() || !avatar) {
      alert("Please fill in all fields including selecting an emoji");
      return;
    }
    setIsLoading(true);
    try {
      const guestId = getOrCreateGuestId();
      let submitName = name;
      let submitAvatar = avatar;
      // If not editing and session exists, use session values
      if (session && !showEdit) {
        submitName = session.name;
        submitAvatar = session.avatar || session.name.charAt(0).toUpperCase();
      }
      if (!submitName.trim() || !submitAvatar) return;
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: guestId,
          name: submitName.trim(),
          avatar: submitAvatar,
          roomName: roomName.trim(),
          isPermanent,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create room");
      }
      // Update session cookie if changed
      if (
        !session ||
        session.name !== submitName ||
        session.avatar !== submitAvatar
      ) {
        setClientUserSession({
          userId: guestId,
          name: submitName,
          avatar: submitAvatar,
          adminRooms: session?.adminRooms || [],
          currentRoom: session?.currentRoom,
        });
      }
      const data = await response.json();
      router.push(`/room/${data.roomId}`);
    } catch (error) {
      console.error("Error creating room:", error);
      alert(error instanceof Error ? error.message : "Failed to create room");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-pink-200 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="text-pink-600 hover:text-pink-700 mb-4 inline-block transition-colors"
          >
            ← Back to Home
          </Link>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            Create Room
          </h1>
          <p className="text-gray-600 text-sm mt-2">
            Set up your game and invite friends!
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Session-aware name/avatar display or edit */}
          {session && !showEdit ? (
            <div className="mb-4 flex items-center justify-between bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <span className="text-2xl bg-white rounded-full p-2 shadow-sm">
                  {session.avatar || session.name.charAt(0).toUpperCase()}
                </span>
                <span className="font-semibold text-gray-700">
                  {session.name}
                </span>
              </div>
              <button
                type="button"
                className="text-xs text-pink-600 underline hover:text-pink-700 transition-colors cursor-pointer"
                onClick={() => setShowEdit(true)}
              >
                Change
              </button>
            </div>
          ) : (
            <>
              {/* Player Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all text-black"
                  placeholder="Enter your name"
                  required
                />
              </div>
              {/* Avatar Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Choose Avatar *
                </label>
                <div className="grid grid-cols-8 gap-2">
                  {AVATAR_OPTIONS.map((emoji, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setAvatar(emoji)}
                      className={`w-10 h-10 text-xl rounded-lg border-2 transition-all hover:scale-110 cursor-pointer ${
                        avatar === emoji
                          ? "border-pink-500 bg-pink-50 scale-110"
                          : "border-gray-200 hover:border-pink-300"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                {avatar ? (
                  <p className="text-xs text-gray-500 mt-2">
                    Selected: {avatar}
                  </p>
                ) : (
                  <p className="text-xs text-red-500 mt-2">
                    Please select an emoji
                  </p>
                )}
              </div>
            </>
          )}

          {/* Room Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Room Name *
            </label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all text-black"
              placeholder="Enter room name"
              required
            />
          </div>

          {/* Room Settings */}
          <div>
            <label className="flex items-center space-x-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={isPermanent}
                onChange={(e) => setIsPermanent(e.target.checked)}
                className="w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
              />
              <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                Make room permanent (won't expire)
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !roomName.trim() || !name.trim() || !avatar}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold py-4 px-6 rounded-xl hover:from-pink-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none cursor-pointer"
          >
            {isLoading ? "Creating Room..." : "🎮 Create Room"}
          </button>
        </form>
      </div>
    </div>
  );
}
