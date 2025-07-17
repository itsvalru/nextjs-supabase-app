"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getOrCreateGuestId } from "@/lib/client-cookies";
import { supabase } from "@/lib/supabase";
import ConnectionStatus from "@/app/components/ConnectionStatus";
import PlayerCard from "@/app/components/PlayerCard";
import GamePhase from "@/app/components/GamePhase";
import LoadingSpinner from "@/app/components/LoadingSpinner";
import ErrorCard from "@/app/components/ErrorCard";
import SettingsModal from "@/app/components/SettingsModal";

interface Player {
  id: string;
  user_id: string;
  role: "you" | "girlfriend" | "potential_partner";
  score: number;
  user: {
    name: string;
    avatar: string;
  };
}

interface Room {
  id: string;
  name: string;
  is_permanent: boolean;
  admin_user_id: string;
  current_round: number;
  game_state: "waiting" | "playing" | "finished";
  players: Player[];
  winner_user_id?: string;
  is_tie?: boolean;
  used_question_ids?: string[];
  game_settings?: {
    totalRounds: number;
    questionCategories: string[];
  };
}

export default function RoomPage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gameRound, setGameRound] = useState<any>(null);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [continueLoading, setContinueLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "disconnected" | "connecting"
  >("connecting");
  const fetchTimeout = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<any>(null);

  // Get userId from cookie
  const userId = typeof window !== "undefined" ? getOrCreateGuestId() : "";

  // Default settings
  const defaultSettings = {
    totalRounds: 9,
    questionCategories: [
      "Alltag",
      "Spaß",
      "Persönlich",
      "Reisen",
      "Mutprobe",
      "Fitness",
      "Lifestyle",
    ],
  };

  // Fetch room and current round
  const fetchRoom = async () => {
    try {
      const response = await fetch(`/api/rooms?roomId=${roomId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch room");
      }
      const data = await response.json();
      setRoom(data.room);
      // If playing, fetch current round
      if (data.room.game_state === "playing") {
        const roundRes = await fetch(`/api/game-round?roomId=${roomId}`);
        if (roundRes.ok) {
          const roundData = await roundRes.json();
          setGameRound(roundData.gameRound);
        }
      } else {
        setGameRound(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load room");
    } finally {
      setLoading(false);
    }
  };

  // Debounced fetchRoom
  const debouncedFetchRoom = () => {
    if (fetchTimeout.current) clearTimeout(fetchTimeout.current);
    fetchTimeout.current = setTimeout(() => {
      fetchRoom();
    }, 200); // 200ms debounce
  };

  useEffect(() => {
    if (roomId) {
      fetchRoom();
    }
  }, [roomId, starting]);

  // Realtime subscriptions for room, players, and game_rounds (single channel)
  useEffect(() => {
    if (!roomId) return;
    setConnectionStatus("connecting");
    // Clean up previous channel if exists
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `room_id=eq.${roomId}`,
        },
        () => debouncedFetchRoom()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${roomId}`,
        },
        () => debouncedFetchRoom()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_rounds",
          filter: `room_id=eq.${roomId}`,
        },
        () => debouncedFetchRoom()
      )
      .on("broadcast", { event: "room_update" }, (payload) => {
        debouncedFetchRoom();
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setConnectionStatus("connected");
        else if (status === "TIMED_OUT" || status === "CLOSED")
          setConnectionStatus("disconnected");
      });
    channelRef.current = channel;
    return () => {
      if (fetchTimeout.current) clearTimeout(fetchTimeout.current);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [roomId]);

  // Start game handler
  const handleStartGame = async () => {
    setStarting(true);
    try {
      const res = await fetch(`/api/rooms/${roomId}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to start game");
        return;
      }
      const data = await res.json();
      setGameRound(data.gameRound);
      // Refetch room to update state
      const response = await fetch(`/api/rooms?roomId=${roomId}`);
      if (response.ok) {
        const data = await response.json();
        setRoom(data.room);
      }
    } catch (e) {
      alert("Failed to start game");
    } finally {
      setStarting(false);
    }
  };

  // Submit answer
  const submitAnswer = async (value: string) => {
    setSubmitting(true);
    try {
      await fetch("/api/game-round", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          userId,
          type: "answer",
          value: value.trim(),
        }),
      });
    } catch (e) {
      alert("Fehler beim Absenden der Antwort");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit guess (for Guess Me or Would You Rather voting)
  const submitGuess = async (value: any) => {
    setSubmitting(true);
    try {
      await fetch("/api/game-round", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          userId,
          type: gameRound.mode === "would_you_rather" ? "vote" : "guess",
          value,
        }),
      });
    } catch (e) {
      alert("Fehler beim Abstimmen");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit dare result
  const submitDareResult = async (result: "completed" | "declined") => {
    setSubmitting(true);
    try {
      await fetch("/api/game-round", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          userId,
          type: "dare_result",
          value: result,
        }),
      });
    } catch (e) {
      alert("Fehler beim Absenden der Mutprobe");
    } finally {
      setSubmitting(false);
    }
  };

  // Continue after reveal
  const submitContinue = async () => {
    setContinueLoading(true);
    try {
      await fetch("/api/game-round", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          userId,
          type: "continue",
        }),
      });
    } catch (e) {
      alert("Fehler beim Fortfahren");
    } finally {
      setContinueLoading(false);
    }
  };

  // Save settings handler
  const handleSaveSettings = async (settings: any) => {
    setSavingSettings(true);
    try {
      const res = await fetch(`/api/rooms/${roomId}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, settings }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to save settings");
        return;
      }
      // Refetch room to get updated settings
      await fetchRoom();
    } catch (e) {
      alert("Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  // Play Again handler
  const handlePlayAgain = async () => {
    setStarting(true);
    try {
      const res = await fetch(`/api/rooms/${roomId}/play-again`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to play again");
        return;
      }
      // Refetch room to update state
      const response = await fetch(`/api/rooms?roomId=${roomId}`);
      if (response.ok) {
        const data = await response.json();
        setRoom(data.room);
        setGameRound(null); // Clear current game round
      }
    } catch (e) {
      alert("Failed to play again");
    } finally {
      setStarting(false);
    }
  };

  // Kick player handler
  const handleKickPlayer = async (playerUserId: string, playerName: string) => {
    if (
      !confirm(`Are you sure you want to kick ${playerName} from the room?`)
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/rooms/${roomId}/kick`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, targetUserId: playerUserId }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to kick player");
        return;
      }
      // Refetch room to update state
      const response = await fetch(`/api/rooms?roomId=${roomId}`);
      if (response.ok) {
        const data = await response.json();
        setRoom(data.room);
      }
    } catch (e) {
      alert("Failed to kick player");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-pink-200 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading room..." />
      </div>
    );
  }

  if (error) {
    return <ErrorCard title="Error" message={error} />;
  }

  if (!room) {
    return (
      <ErrorCard
        title="Room Not Found"
        message="The room you're looking for doesn't exist."
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-pink-200 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
                {room.name}
              </h1>
              <p className="text-black mt-1">Room Code: {room.id}</p>
              {room.game_state === "playing" && gameRound && (
                <p className="text-sm text-black mt-1">
                  Round {room.current_round} of{" "}
                  {room.game_settings?.totalRounds || 9}
                </p>
              )}
            </div>
            <Link
              href="/"
              className="text-pink-600 hover:text-pink-700 font-medium transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </div>

        {/* Main Content with Sidebar */}
        <div className="flex gap-6">
          {/* Main Game Area */}
          <div className="flex-1">
            {/* Waiting for Players */}
            {room.players.length < 3 && (
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 mb-6">
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                  <p className="text-yellow-800 text-center">
                    Waiting for {3 - room.players.length} more player
                    {3 - room.players.length !== 1 ? "s" : ""}...
                  </p>
                  <p className="text-yellow-600 text-sm text-center mt-2">
                    Share the room code:{" "}
                    <span className="font-mono font-bold">{room.id}</span>
                  </p>
                </div>
              </div>
            )}

            {/* Game Status Area - Only render for non-hosts or when not in waiting state */}
            {!(room.players.length < 3) &&
              !(
                room.players.length === 3 &&
                room.game_state === "waiting" &&
                userId === room.admin_user_id
              ) && (
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 mb-6">
                  {room.players.length === 3 &&
                  room.game_state === "waiting" ? (
                    /* All players joined - only show message for non-hosts */
                    <div className="text-center">
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                        <p className="text-blue-800 text-center font-medium">
                          All players joined! 🎉
                        </p>
                        <p className="text-blue-600 text-sm text-center mt-2">
                          Waiting for host to start the game...
                        </p>
                      </div>
                    </div>
                  ) : room.game_state === "playing" && gameRound ? (
                    /* Game Phase */
                    <GamePhase
                      gameRound={gameRound}
                      room={room}
                      userId={userId}
                      onSubmitAnswer={submitAnswer}
                      onSubmitGuess={submitGuess}
                      onSubmitDareResult={submitDareResult}
                      onSubmitContinue={submitContinue}
                      submitting={submitting}
                      continueLoading={continueLoading}
                    />
                  ) : room.game_state === "finished" ? (
                    /* Game Finished */
                    <div className="text-center">
                      <h2 className="text-3xl font-bold text-black mb-6">
                        🏆 Game Finished!
                      </h2>

                      {/* Winner Announcement */}
                      {room.winner_user_id && !room.is_tie && (
                        <div className="mb-8">
                          <div className="bg-gradient-to-r from-yellow-100 to-orange-100 border-2 border-yellow-300 rounded-xl p-6 mb-4">
                            <h3 className="text-2xl font-bold text-yellow-800 mb-2">
                              🎉 Winner!
                            </h3>
                            {(() => {
                              const winner = room.players.find(
                                (p) => p.user_id === room.winner_user_id
                              );
                              return (
                                <div className="flex items-center justify-center gap-3">
                                  <span className="text-3xl">
                                    {winner?.user.avatar}
                                  </span>
                                  <span className="text-xl font-semibold text-black">
                                    {winner?.user.name}
                                  </span>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      )}

                      {/* Tie Announcement */}
                      {room.is_tie && (
                        <div className="mb-8">
                          <div className="bg-gradient-to-r from-purple-100 to-pink-100 border-2 border-purple-300 rounded-xl p-6 mb-4">
                            <h3 className="text-2xl font-bold text-purple-800 mb-2">
                              🤝 It's a Tie!
                            </h3>
                            <p className="text-black">
                              Multiple players tied for first place!
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Final Standings */}
                      <div className="mb-8">
                        <h3 className="text-xl font-bold text-black mb-4">
                          Final Standings
                        </h3>
                        <div className="space-y-3 max-w-md mx-auto">
                          {room.players
                            .sort((a, b) => b.score - a.score)
                            .map((player, index) => (
                              <div
                                key={player.id}
                                className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                                  index === 0
                                    ? "border-yellow-300 bg-yellow-50"
                                    : "border-gray-200 bg-gray-50"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="text-2xl">
                                    {index === 0
                                      ? "🥇"
                                      : index === 1
                                      ? "🥈"
                                      : "🥉"}
                                  </div>
                                  <span className="text-2xl">
                                    {player.user.avatar}
                                  </span>
                                  <span className="font-semibold text-black">
                                    {player.user.name}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <div className="font-bold text-lg bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
                                    {player.score} pts
                                  </div>
                                  {index === 0 && !room.is_tie && (
                                    <div className="text-xs text-yellow-600 font-medium">
                                      Winner!
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>

                      <Link
                        href="/"
                        className="bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold py-3 px-6 rounded-xl hover:from-pink-600 hover:to-purple-700 transition-all duration-200"
                      >
                        Back to Home
                      </Link>

                      {/* Play Again Button - Only for admin */}
                      {userId === room.admin_user_id && (
                        <div className="mt-4">
                          <button
                            onClick={handlePlayAgain}
                            disabled={starting}
                            className="bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold py-3 px-6 rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {starting ? "Resetting..." : "🔄 Reset to Lobby"}
                          </button>
                          <p className="text-xs text-gray-500 mt-2">
                            Reset scores and return to lobby for a fresh start!
                          </p>
                          <div className="mt-2 text-xs text-gray-400">
                            <p>
                              Questions used this game:{" "}
                              {room.used_question_ids?.length || 0}
                            </p>
                            <p>
                              Categories:{" "}
                              {room.game_settings?.questionCategories?.join(
                                ", "
                              ) || "All"}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              )}

            {/* Start Game Button */}
            {room.players.length === 3 &&
              room.game_state === "waiting" &&
              userId === room.admin_user_id && (
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 mb-6 text-center">
                  <div className="flex items-center justify-center gap-4 mb-4">
                    <button
                      className="bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold py-4 px-8 rounded-xl hover:from-pink-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg cursor-pointer"
                      onClick={handleStartGame}
                      disabled={starting}
                    >
                      {starting ? "Starting..." : "🎮 Start Game"}
                    </button>
                    <button
                      onClick={() => setShowSettings(true)}
                      className="bg-white/80 backdrop-blur-sm text-gray-700 font-semibold py-4 px-4 rounded-xl border-2 border-gray-200 hover:border-pink-300 hover:bg-white/90 transition-all duration-200 transform hover:scale-105 shadow-lg cursor-pointer"
                      title="Game Settings"
                    >
                      ⚙️
                    </button>
                  </div>

                  {/* Current Settings Display */}
                  <div className="text-sm text-gray-600">
                    <p>
                      {room.game_settings?.totalRounds ||
                        defaultSettings.totalRounds}{" "}
                      rounds •
                      {room.game_settings?.questionCategories?.length ||
                        defaultSettings.questionCategories.length}{" "}
                      categories
                    </p>
                  </div>
                </div>
              )}
          </div>

          {/* Players Sidebar */}
          <div className="w-80 flex-shrink-0">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 sticky top-4">
              <h2 className="text-xl font-bold text-black mb-4">
                Players ({room.players.length}/3)
              </h2>

              <div className="space-y-3">
                {room.players
                  .sort((a, b) => b.score - a.score) // Sort by score (highest first)
                  .map((player, index) => (
                    <div
                      key={player.id}
                      className={`relative bg-white/80 backdrop-blur-sm rounded-xl p-4 border-2 transition-all duration-300 hover:scale-105 hover:shadow-lg ${
                        player.user_id === userId
                          ? "border-purple-300 shadow-purple-100"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {/* Rank indicator */}
                      <div className="absolute -top-2 -left-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs px-2 py-1 rounded-full font-bold">
                        #{index + 1}
                      </div>

                      {/* Current user indicator */}
                      {player.user_id === userId && (
                        <div className="absolute -top-2 -right-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                          You
                        </div>
                      )}

                      <div className="flex items-center space-x-3">
                        {/* Avatar */}
                        <div className="text-2xl bg-gradient-to-br from-gray-100 to-gray-200 rounded-full p-2 shadow-inner">
                          {player.user.avatar}
                        </div>

                        {/* Player info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-black text-sm mb-1 truncate">
                            {player.user.name}
                          </h3>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-black">Score:</span>
                            <span className="font-bold text-lg bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
                              {player.score}
                            </span>
                          </div>
                        </div>

                        {/* Kick button - only for admin and not for themselves */}
                        {userId === room.admin_user_id &&
                          player.user_id !== userId && (
                            <button
                              onClick={() =>
                                handleKickPlayer(
                                  player.user_id,
                                  player.user.name
                                )
                              }
                              className="text-red-500 hover:text-red-700 transition-colors p-1 rounded-full hover:bg-red-50 cursor-pointer"
                              title={`Kick ${player.user.name}`}
                            >
                              🚫
                            </button>
                          )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={handleSaveSettings}
        currentSettings={room?.game_settings || defaultSettings}
        isLoading={savingSettings}
      />
    </div>
  );
}
