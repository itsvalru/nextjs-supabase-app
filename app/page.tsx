import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-pink-200 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent mb-4">
            💖 Poly Game
          </h1>
          <p className="text-xl text-gray-600 max-w-lg mx-auto">
            A fun 3-player question game with guessing, voting, and dares!
          </p>
        </div>

        {/* Game Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-pink-200 hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="text-3xl mb-3">🎯</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Guess Me
            </h3>
            <p className="text-gray-600 text-sm">
              Answer questions and guess who wrote what
            </p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-purple-200 hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="text-3xl mb-3">🤔</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Would You Rather
            </h3>
            <p className="text-gray-600 text-sm">
              Choose your preference and guess the majority
            </p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-orange-200 hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="text-3xl mb-3">💪</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Dare</h3>
            <p className="text-gray-600 text-sm">
              Complete challenges and earn points
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <Link
            href="/create-room"
            className="block w-full max-w-md mx-auto bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold py-4 px-8 rounded-xl hover:from-pink-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            🎮 Create New Room
          </Link>
          <Link
            href="/join-room"
            className="block w-full max-w-md mx-auto bg-white/80 backdrop-blur-sm text-gray-700 font-semibold py-4 px-8 rounded-xl border-2 border-gray-200 hover:border-pink-300 hover:bg-white/90 transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            🔗 Join Existing Room
          </Link>
        </div>

        {/* Footer Info */}
        <div className="mt-12 text-gray-500 text-sm">
          <p>
            Perfect for couples and friends looking for fun conversation
            starters!
          </p>
        </div>
      </div>
    </div>
  );
}
