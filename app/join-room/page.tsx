"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getOrCreateGuestId } from "@/lib/client-cookies";

const AVATAR_OPTIONS = [
  "😊",
  "😎",
  "🍆",
  "😍",
  "😇",
  "😽",
  "👻",
  "🦄",
  "🐱",
  "🐶",
  "🦊",
  "🐼",
  "🌸",
  "🌺",
  "💗",
  "🌹",
  "🌷",
  "🐈",
  "🐟",
  "🐺",
  "🦇",
  "😈",
  "🤪",
  "💀",
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

  try {
    // More robust cookie parsing
    const cookies = document.cookie.split(";");
    const userSessionCookie = cookies.find((cookie) =>
      cookie.trim().startsWith("user_session=")
    );

    if (userSessionCookie) {
      const sessionValue = userSessionCookie.split("=")[1];
      if (sessionValue) {
        const parsed = JSON.parse(decodeURIComponent(sessionValue));
        // Validate the session has required fields
        if (parsed && parsed.userId && parsed.name) {
          return parsed;
        }
      }
    }
  } catch (error) {
    console.warn("Failed to parse user session cookie:", error);
  }

  return null;
}

function setClientUserSession(session: UserSession) {
  if (typeof document === "undefined") return;

  try {
    const sessionValue = encodeURIComponent(JSON.stringify(session));
    document.cookie = `user_session=${sessionValue}; path=/; max-age=${
      60 * 60 * 24 * 30
    }; SameSite=Lax`;
  } catch (error) {
    console.error("Failed to set user session cookie:", error);
  }
}

function JoinRoomContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [roomCode, setRoomCode] = useState<string>(
    searchParams!.get("room") || ""
  );
  const [isLoading, setIsLoading] = useState(false);

  // Session-aware state
  const [session, setSession] = useState<UserSession | null>(null);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [showEdit, setShowEdit] = useState(false);

  useEffect(() => {
    const sess = getClientUserSession();
    if (sess && sess.name && sess.userId) {
      setSession(sess);
      setName(sess.name);
      setAvatar(sess.avatar || "");
    } else {
      // Clear any corrupted session
      if (sess) {
        console.warn("Clearing corrupted session:", sess);
        document.cookie =
          "user_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      }
      // Preselect a random emoji for new users
      const randomEmoji =
        AVATAR_OPTIONS[Math.floor(Math.random() * AVATAR_OPTIONS.length)];
      setAvatar(randomEmoji);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!roomCode.trim() || !name.trim() || !avatar) {
      alert("Please fill in all fields including selecting an emoji");
      return;
    }
    setIsLoading(true);
    try {
      const guestId = getOrCreateGuestId();
      console.log("Debug - Join room using guest ID:", guestId);
      let submitName = name;
      let submitAvatar = avatar;
      // If not editing and session exists, use session values
      if (session && !showEdit) {
        submitName = session.name;
        submitAvatar = session.avatar || session.name.charAt(0).toUpperCase();
      }
      if (!submitName.trim() || !submitAvatar) return;
      const response = await fetch("/api/rooms/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: guestId,
          name: submitName.trim(),
          avatar: submitAvatar,
          roomId: roomCode.trim().toUpperCase(),
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to join room");
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
      // Always set user_session cookie with canonical user.id from backend
      setClientUserSession({
        userId: data.user.id, // Use backend user.id
        name: submitName,
        avatar: submitAvatar,
        adminRooms: session?.adminRooms || [],
        currentRoom: data.roomId,
      });
      router.push(`/room/${data.roomId}`);
    } catch (error) {
      console.error("Error joining room:", error);
      alert(error instanceof Error ? error.message : "Failed to join room");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-pink-200 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="text-pink-600 hover:text-pink-700 mb-4 inline-block"
          >
            ← Back to Home
          </Link>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            Join Room
          </h1>
          <p className="text-gray-600 text-sm mt-2">
            Enter your details and join the game!
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Session-aware name/avatar display or edit */}
          {session && !showEdit ? (
            <div className="mb-4 flex items-center justify-between bg-pink-50 border border-pink-200 rounded-xl p-3">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">
                  {session.avatar || session.name.charAt(0).toUpperCase()}
                </span>
                <span className="font-semibold text-gray-700">
                  {session.name}
                </span>
              </div>
              <button
                type="button"
                className="text-xs text-pink-600 underline ml-2 cursor-pointer"
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
                      className={`w-10 h-10 text-xl rounded-lg border-2 transition-all cursor-pointer ${
                        avatar === emoji
                          ? "border-pink-500 bg-pink-50 scale-110"
                          : "border-gray-200 hover:border-pink-300 hover:scale-105"
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

          {/* Room Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Room Code *
            </label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all text-black"
              placeholder="Enter room code"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Ask the room creator for the invite link or code
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !name.trim() || !roomCode.trim() || !avatar}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold py-3 px-6 rounded-xl hover:from-pink-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none cursor-pointer"
          >
            {isLoading ? "Joining Room..." : "🔗 Join Room"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function JoinRoom() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-pink-200 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 text-center">
            <div className="animate-spin rounded-full border-b-2 border-pink-500 h-8 w-8 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <JoinRoomContent />
    </Suspense>
  );
}
