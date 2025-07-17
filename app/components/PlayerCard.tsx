"use client";

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

interface PlayerCardProps {
  player: Player;
  isCurrentUser?: boolean;
}

export default function PlayerCard({
  player,
  isCurrentUser = false,
}: PlayerCardProps) {
  return (
    <div
      className={`relative bg-white/90 backdrop-blur-sm rounded-2xl p-4 border-2 transition-all duration-300 hover:scale-105 hover:shadow-lg ${
        isCurrentUser
          ? "border-purple-300 shadow-purple-100"
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      {/* Current user indicator */}
      {isCurrentUser && (
        <div className="absolute -top-2 -right-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-2 py-1 rounded-full font-medium">
          You
        </div>
      )}

      <div className="flex items-center space-x-4">
        {/* Avatar */}
        <div className="text-3xl bg-gradient-to-br from-gray-100 to-gray-200 rounded-full p-3 shadow-inner">
          {player.user.avatar}
        </div>

        {/* Player info */}
        <div className="flex-1">
          <h3 className="font-bold text-gray-800 text-lg mb-1">
            {player.user.name}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Score:</span>
            <span className="font-bold text-lg bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
              {player.score}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
