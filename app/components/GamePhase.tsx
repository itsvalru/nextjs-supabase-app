"use client";

import { useState } from "react";

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

interface GamePhaseProps {
  gameRound: any;
  room: any;
  userId: string;
  onSubmitAnswer: (value: string) => Promise<void>;
  onSubmitGuess: (value: any) => Promise<void>;
  onSubmitDareResult: (result: "completed" | "declined") => Promise<void>;
  onSubmitContinue: () => Promise<void>;
  submitting: boolean;
  continueLoading: boolean;
}

export default function GamePhase({
  gameRound,
  room,
  userId,
  onSubmitAnswer,
  onSubmitGuess,
  onSubmitDareResult,
  onSubmitContinue,
  submitting,
  continueLoading,
}: GamePhaseProps) {
  const [answer, setAnswer] = useState("");

  const getModeDisplay = (mode: string) => {
    switch (mode) {
      case "guess_me":
        return {
          name: "Guess Me",
          icon: "🎯",
          color: "from-pink-500 to-purple-600",
        };
      case "would_you_rather":
        return {
          name: "Would You Rather",
          icon: "🤔",
          color: "from-blue-500 to-indigo-600",
        };
      case "dare":
        return {
          name: "Dare",
          icon: "💪",
          color: "from-orange-500 to-red-600",
        };
      default:
        return { name: mode, icon: "🎮", color: "from-gray-500 to-gray-600" };
    }
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "answering":
        return { text: "Answering", color: "bg-blue-100 text-blue-700" };
      case "revealing":
        return { text: "Revealing", color: "bg-purple-100 text-purple-700" };
      case "guessing":
        return { text: "Guessing", color: "bg-orange-100 text-orange-700" };
      case "continue":
        return { text: "Continue", color: "bg-green-100 text-green-700" };
      default:
        return { text: status, color: "bg-gray-100 text-gray-700" };
    }
  };

  const modeConfig = getModeDisplay(gameRound.mode);
  const statusConfig = getStatusDisplay(gameRound.status);

  // Type guard for string values
  function isString(val: unknown): val is string {
    return typeof val === "string" && !!val;
  }

  // Only show question at top if not would_you_rather revealing
  const showQuestionAtTop = !(
    gameRound.mode === "would_you_rather" && gameRound.status === "revealing"
  );

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-200">
      {/* Game Mode Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-3 mb-2">
          <span className="text-2xl">{modeConfig.icon}</span>
          <h2 className="text-xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            {modeConfig.name}
          </h2>
        </div>
        <div
          className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusConfig.color}`}
        >
          {statusConfig.text}
        </div>
      </div>

      {/* Question */}
      {showQuestionAtTop && (
        <div className="text-center mb-6">
          <p className="text-lg text-black font-medium">
            {gameRound.question?.text || "Loading question..."}
          </p>
        </div>
      )}

      {/* Guess Me Mode */}
      {gameRound.mode === "guess_me" && (
        <GuessMePhase
          gameRound={gameRound}
          room={room}
          userId={userId}
          onSubmitAnswer={onSubmitAnswer}
          onSubmitGuess={onSubmitGuess}
          onSubmitContinue={onSubmitContinue}
          submitting={submitting}
          continueLoading={continueLoading}
          answer={answer}
          setAnswer={setAnswer}
        />
      )}

      {/* Would You Rather Mode */}
      {gameRound.mode === "would_you_rather" && (
        <WouldYouRatherPhase
          gameRound={gameRound}
          room={room}
          userId={userId}
          onSubmitAnswer={onSubmitAnswer}
          onSubmitGuess={onSubmitGuess}
          onSubmitContinue={onSubmitContinue}
          submitting={submitting}
          continueLoading={continueLoading}
        />
      )}

      {/* Dare Mode */}
      {gameRound.mode === "dare" && (
        <DarePhase
          gameRound={gameRound}
          room={room}
          userId={userId}
          onSubmitDareResult={onSubmitDareResult}
          onSubmitContinue={onSubmitContinue}
          submitting={submitting}
          continueLoading={continueLoading}
        />
      )}
    </div>
  );
}

// Guess Me Phase Component
function GuessMePhase({
  gameRound,
  room,
  userId,
  onSubmitAnswer,
  onSubmitGuess,
  onSubmitContinue,
  submitting,
  continueLoading,
  answer,
  setAnswer,
}: any) {
  function isString(val: unknown): val is string {
    return typeof val === "string" && !!val;
  }

  if (gameRound.status === "answering" && !gameRound.answers?.[userId]) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <p className="text-black mb-4">Write your answer in secret:</p>
          <div className="flex gap-3 max-w-md mx-auto">
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all text-black"
              placeholder="Your answer..."
              disabled={submitting}
            />
            <button
              onClick={() => {
                onSubmitAnswer(answer);
                setAnswer("");
              }}
              disabled={submitting || !answer.trim()}
              className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-pink-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? "Sending..." : "Submit"}
            </button>
          </div>
        </div>
        <ReadyIndicator answers={gameRound.answers} total={3} />
      </div>
    );
  }

  if (gameRound.status === "answering" && gameRound.answers?.[userId]) {
    return (
      <div className="text-center">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
          <p className="text-green-700 font-medium">✅ Answer submitted!</p>
          <p className="text-green-600 text-sm">Waiting for other players...</p>
        </div>
        <ReadyIndicator answers={gameRound.answers} total={3} />
      </div>
    );
  }

  // Reveal and guessing phase
  if (
    (gameRound.status === "revealing" || gameRound.status === "continue") &&
    typeof gameRound.reveal_index === "number"
  ) {
    const answerUserIds = Object.keys(gameRound.answers || {});
    const revealIndex = gameRound.reveal_index;
    // Use randomized order if available, otherwise fall back to original order
    const revealOrder = gameRound.reveal_order || answerUserIds;
    const currentAnswerUserId = revealOrder[revealIndex];
    const currentAnswer = gameRound.answers?.[currentAnswerUserId];
    const revealGuesses =
      gameRound.guesses?.reveal_guesses?.[revealIndex] || {};
    const readyCount = Object.keys(revealGuesses).length;
    const isAuthor = userId === currentAnswerUserId;
    const hasUserGuessed = revealGuesses[userId];

    if (gameRound.status === "revealing") {
      return (
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-lg font-semibold text-black mb-4">
              Who wrote this answer?
            </p>
            <div className="bg-gradient-to-r from-pink-50 to-purple-50 border-2 border-pink-200 rounded-xl p-6 mb-4">
              <p className="text-xl font-mono text-black">
                {isString(currentAnswer) ? currentAnswer : "?"}
              </p>
            </div>
            <p className="text-sm text-black mb-4">Ready {readyCount}/2</p>
          </div>

          {!isAuthor && !hasUserGuessed && (
            <div className="space-y-3">
              <p className="text-center text-black">
                Choose who you think wrote this:
              </p>
              <div className="grid grid-cols-1 gap-3 max-w-sm mx-auto">
                {room.players
                  .filter((player: any) => player.user_id !== userId)
                  .map((player: any) => (
                    <button
                      key={player.user_id}
                      onClick={() => onSubmitGuess(player.user_id)}
                      disabled={submitting}
                      className="flex items-center gap-3 bg-white border-2 border-gray-200 hover:border-pink-300 px-4 py-3 rounded-xl font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50 cursor-pointer"
                    >
                      <span className="text-2xl">{player.user.avatar}</span>
                      <span className="text-black">{player.user.name}</span>
                    </button>
                  ))}
              </div>
            </div>
          )}

          {isAuthor && (
            <div className="text-center text-black">
              <p>You wrote this answer - waiting for others to guess!</p>
            </div>
          )}

          {!isAuthor && hasUserGuessed && (
            <div className="text-center text-green-600">
              <p>✅ Your guess submitted!</p>
            </div>
          )}
        </div>
      );
    }

    // Continue phase
    if (gameRound.status === "continue") {
      const continues = gameRound.scores || {};
      const readyCount = Object.keys(continues).length;
      // Use the same randomized order for consistency
      const revealOrder =
        gameRound.reveal_order || Object.keys(gameRound.answers || {});
      const currentAnswerUserId = revealOrder[revealIndex];
      const correctAuthor = room.players.find(
        (p: any) => p.user_id === currentAnswerUserId
      );
      const revealGuesses =
        gameRound.guesses?.reveal_guesses?.[revealIndex] || {};

      return (
        <div className="space-y-6">
          {/* Answer Reveal */}
          <div className="text-center">
            <p className="text-lg font-semibold text-black mb-4">
              The answer was written by:
            </p>
            <div className="bg-gradient-to-r from-pink-50 to-purple-50 border-2 border-pink-200 rounded-xl p-6 mb-4">
              <p className="text-xl font-mono text-black mb-3">
                {isString(currentAnswer) ? currentAnswer : "?"}
              </p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-2xl">{correctAuthor?.user.avatar}</span>
                <span className="font-semibold text-black">
                  {correctAuthor?.user.name}
                </span>
              </div>
            </div>
          </div>

          {/* Player Guesses */}
          <div>
            <h3 className="text-lg font-semibold text-black mb-4 text-center">
              Who Guessed Correctly?
            </h3>
            <div className="space-y-3">
              {room.players
                .filter((player: any) => player.user_id !== currentAnswerUserId) // Exclude the author
                .map((player: any) => {
                  const playerGuess = revealGuesses[player.user_id];
                  const guessedAuthor = room.players.find(
                    (p: any) => p.user_id === playerGuess
                  );
                  const guessedCorrectly = playerGuess === currentAnswerUserId;

                  return (
                    <div
                      key={player.user_id}
                      className={`p-4 rounded-xl border-2 flex items-center gap-3 ${
                        guessedCorrectly
                          ? "border-emerald-300 bg-emerald-50"
                          : "border-red-300 bg-red-50"
                      }`}
                    >
                      <span className="text-2xl">{player.user.avatar}</span>
                      <div className="flex-1">
                        <span className="font-medium text-black">
                          {player.user.name}
                        </span>
                        <span className="text-sm text-black ml-2">
                          guessed {guessedAuthor?.user.name || "?"}
                        </span>
                      </div>
                      <span
                        className={`text-sm font-semibold ${
                          guessedCorrectly ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {guessedCorrectly ? "✅ Correct" : "❌ Wrong"}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Continue Button */}
          <div className="text-center">
            <p className="text-sm text-black mb-3">Ready {readyCount}/3</p>
            <button
              onClick={onSubmitContinue}
              disabled={continueLoading || continues[userId]}
              className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-purple-600 hover:to-pink-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {continues[userId]
                ? "✅ Ready"
                : continueLoading
                ? "Loading..."
                : "Continue"}
            </button>
          </div>
        </div>
      );
    }
  }

  return null;
}

// Would You Rather Phase Component
function WouldYouRatherPhase({
  gameRound,
  room,
  userId,
  onSubmitAnswer,
  onSubmitGuess,
  onSubmitContinue,
  submitting,
  continueLoading,
}: any) {
  if (gameRound.status === "answering" && !gameRound.answers?.[userId]) {
    return (
      <div className="space-y-4">
        <p className="text-center text-black mb-4">Choose your preference:</p>
        <div className="grid grid-cols-1 gap-3 max-w-md mx-auto">
          {gameRound.question?.options?.map((opt: string, idx: number) => (
            <button
              key={idx}
              onClick={() => onSubmitAnswer(opt)}
              disabled={submitting}
              className="bg-gradient-to-r from-pink-100 to-purple-100 hover:from-pink-200 hover:to-purple-200 border-2 border-pink-200 hover:border-pink-300 px-6 py-4 rounded-xl font-semibold text-black transition-all duration-200 hover:scale-105 disabled:opacity-50 cursor-pointer"
            >
              {opt}
            </button>
          ))}
        </div>
        <ReadyIndicator answers={gameRound.answers} total={3} />
      </div>
    );
  }

  if (gameRound.status === "answering" && gameRound.answers?.[userId]) {
    return (
      <div className="text-center">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
          <p className="text-green-700 font-medium">✅ Choice submitted!</p>
          <p className="text-green-600 text-sm">Waiting for other players...</p>
        </div>
        <ReadyIndicator answers={gameRound.answers} total={3} />
      </div>
    );
  }

  if (gameRound.status === "guessing" && !gameRound.guesses?.[userId]) {
    return (
      <div className="space-y-4">
        <p className="text-center text-black mb-4">
          What was the most popular choice?
        </p>
        <div className="grid grid-cols-1 gap-3 max-w-md mx-auto">
          {gameRound.question?.options?.map((opt: string, idx: number) => (
            <button
              key={idx}
              onClick={() => onSubmitGuess(opt)}
              disabled={submitting}
              className="bg-gradient-to-r from-blue-100 to-indigo-100 hover:from-blue-200 hover:to-indigo-200 border-2 border-blue-200 hover:border-blue-300 px-6 py-4 rounded-xl font-semibold text-black transition-all duration-200 hover:scale-105 disabled:opacity-50 cursor-pointer"
            >
              {opt}
            </button>
          ))}
        </div>
        <ReadyIndicator guesses={gameRound.guesses} total={3} />
      </div>
    );
  }

  if (gameRound.status === "guessing" && gameRound.guesses?.[userId]) {
    return (
      <div className="text-center">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
          <p className="text-green-700 font-medium">✅ Guess submitted!</p>
          <p className="text-green-600 text-sm">Waiting for other players...</p>
        </div>
        <ReadyIndicator guesses={gameRound.guesses} total={3} />
      </div>
    );
  }

  if (gameRound.status === "revealing") {
    return (
      <WouldYouRatherResults
        gameRound={gameRound}
        room={room}
        userId={userId}
        onSubmitContinue={onSubmitContinue}
        continueLoading={continueLoading}
      />
    );
  }

  return null;
}

// Would You Rather Results Component
function WouldYouRatherResults({
  gameRound,
  room,
  userId,
  onSubmitContinue,
  continueLoading,
}: any) {
  const continues = gameRound.scores || {};
  const readyCount = Object.keys(continues).length;

  return (
    <div className="space-y-6">
      {/* Vote Results */}
      <div>
        <h3 className="text-lg font-semibold text-black mb-4 text-center">
          Voting Results
        </h3>
        <div className="space-y-3">
          {gameRound.question?.options?.map((opt: string, idx: number) => {
            // Safe vote counting
            const voteCount = Object.values(gameRound.answers || {}).filter(
              (answer) => answer === opt
            ).length;

            // Find most voted option safely
            const voteCounts: { [key: string]: number } = {};
            gameRound.question.options.forEach((option: string) => {
              voteCounts[option] = Object.values(
                gameRound.answers || {}
              ).filter((answer) => answer === option).length;
            });

            const maxVotes = Math.max(...Object.values(voteCounts));
            const isMostVoted = voteCount === maxVotes && maxVotes > 0;

            return (
              <div
                key={idx}
                className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                  isMostVoted
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-gray-200 bg-gray-50"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium text-black">{opt}</span>
                  <span className="text-sm text-black">
                    {voteCount} vote{voteCount !== 1 ? "s" : ""}
                  </span>
                </div>
                {isMostVoted && (
                  <div className="mt-2 text-emerald-600 text-sm font-semibold flex items-center gap-1">
                    <span>⭐</span>
                    <span>Most Popular</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Player Guesses */}
      <div>
        <h3 className="text-lg font-semibold text-black mb-4 text-center">
          Who Guessed Correctly?
        </h3>
        <div className="space-y-3">
          {room.players.map((player: any) => {
            const playerGuess = gameRound.guesses?.[player.user_id];

            // Safe vote counting for correct answer
            const voteCounts: { [key: string]: number } = {};
            gameRound.question.options.forEach((option: string) => {
              voteCounts[option] = Object.values(
                gameRound.answers || {}
              ).filter((answer) => answer === option).length;
            });

            const maxVotes = Math.max(...Object.values(voteCounts));
            const correctAnswer =
              maxVotes > 0
                ? gameRound.question.options.find(
                    (opt: string) => voteCounts[opt] === maxVotes
                  )
                : null;

            const guessedCorrectly = playerGuess === correctAnswer;

            return (
              <div
                key={player.user_id}
                className={`p-4 rounded-xl border-2 flex items-center gap-3 ${
                  guessedCorrectly
                    ? "border-emerald-300 bg-emerald-50"
                    : "border-red-300 bg-red-50"
                }`}
              >
                <span className="text-2xl">{player.user.avatar}</span>
                <div className="flex-1">
                  <span className="font-medium text-black">
                    {player.user.name}
                  </span>
                  <span className="text-sm text-black ml-2">
                    guessed "{playerGuess}"
                  </span>
                </div>
                <span
                  className={`text-sm font-semibold ${
                    guessedCorrectly ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {guessedCorrectly ? "✅ Correct" : "❌ Wrong"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Continue Button */}
      <div className="text-center">
        <p className="text-sm text-black mb-3">Ready {readyCount}/3</p>
        <button
          onClick={onSubmitContinue}
          disabled={continueLoading || continues[userId]}
          className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-purple-600 hover:to-pink-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {continues[userId]
            ? "✅ Ready"
            : continueLoading
            ? "Loading..."
            : "Continue"}
        </button>
      </div>
    </div>
  );
}

// Dare Phase Component
function DarePhase({
  gameRound,
  room,
  userId,
  onSubmitDareResult,
  onSubmitContinue,
  submitting,
  continueLoading,
}: any) {
  const isDareTarget = userId === gameRound.dare_target_user_id;
  const dareTargetPlayer = room.players.find(
    (p: any) => p.user_id === gameRound.dare_target_user_id
  );

  if (gameRound.status === "answering" && isDareTarget) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <p className="text-lg font-semibold text-black mb-4">Your Dare:</p>
          <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200 rounded-xl p-6 mb-4">
            <p className="text-xl text-black">{gameRound.question?.text}</p>
          </div>
          <p className="text-black mb-4">Will you complete this dare?</p>
        </div>
        <div className="flex justify-center gap-4">
          <button
            onClick={() => onSubmitDareResult("completed")}
            disabled={submitting}
            className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-emerald-600 hover:to-green-700 transition-all duration-200 disabled:opacity-50 cursor-pointer"
          >
            ✅ Complete
          </button>
          <button
            onClick={() => onSubmitDareResult("declined")}
            disabled={submitting}
            className="bg-gradient-to-r from-red-500 to-pink-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-red-600 hover:to-pink-700 transition-all duration-200 disabled:opacity-50 cursor-pointer"
          >
            ❌ Decline
          </button>
        </div>
      </div>
    );
  }

  if (gameRound.status === "answering" && !isDareTarget) {
    return (
      <div className="text-center">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
          <p className="text-blue-700 font-medium">
            Waiting for {dareTargetPlayer?.user.name} to complete their dare...
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 mb-4">
          <span className="text-2xl">{dareTargetPlayer?.user.avatar}</span>
          <span className="font-semibold text-black">
            {dareTargetPlayer?.user.name}
          </span>
        </div>
        <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200 rounded-xl p-4">
          <p className="text-black">{gameRound.question?.text}</p>
        </div>
      </div>
    );
  }

  if (gameRound.status === "revealing") {
    const continues = gameRound.scores || {};
    const readyCount = Object.keys(continues).length;
    const dareResult = gameRound.answers?.[gameRound.dare_target_user_id];

    return (
      <div className="space-y-4">
        <div className="text-center">
          <p className="text-lg font-semibold text-black mb-4">Dare Result</p>
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="text-2xl">{dareTargetPlayer?.user.avatar}</span>
            <span className="font-semibold text-black">
              {dareTargetPlayer?.user.name}
            </span>
          </div>
          <div
            className={`inline-block px-6 py-3 rounded-xl font-semibold ${
              dareResult === "completed"
                ? "bg-emerald-100 text-emerald-800 border-2 border-emerald-300"
                : "bg-red-100 text-red-800 border-2 border-red-300"
            }`}
          >
            {dareResult === "completed"
              ? "✅ Dare Completed!"
              : "❌ Dare Declined"}
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm text-black mb-3">Ready {readyCount}/3</p>
          <button
            onClick={onSubmitContinue}
            disabled={continueLoading || continues[userId]}
            className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-purple-600 hover:to-pink-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {continues[userId]
              ? "✅ Ready"
              : continueLoading
              ? "Loading..."
              : "Continue"}
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// Ready Indicator Component
function ReadyIndicator({ answers, guesses, total }: any) {
  const count = Object.keys(answers || guesses || {}).length;

  return (
    <div className="text-center">
      <div className="inline-flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full">
        <span className="text-sm font-medium text-black">
          Ready {count}/{total}
        </span>
        <div className="flex gap-1">
          {Array.from({ length: total }, (_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                i < count ? "bg-green-500" : "bg-gray-300"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
