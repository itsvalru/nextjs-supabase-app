import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

const MODES = ["guess_me", "would_you_rather", "dare"];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get("roomId");
    if (!roomId) {
      return NextResponse.json(
        { error: "Room ID is required" },
        { status: 400 }
      );
    }
    // Get latest game round for this room, join question
    const { data: round, error } = await supabase
      .from("game_rounds")
      .select(`*, question:questions(*)`)
      .eq("room_id", roomId)
      .order("round_number", { ascending: false })
      .limit(1)
      .single();
    if (error || !round) {
      return NextResponse.json(
        { error: "No game round found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ gameRound: round });
  } catch (error) {
    console.error("Error in GET /api/game-round:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// --- PHASE/AUTO-ADVANCE LOGIC REWRITE ---
// (1) Remove all manual round advancement
// (2) After all required actions for a phase are complete, automatically advance to the next phase or next round
// (3) For Guess Me, implement per-answer reveal and voting loop
// (4) When all players have pressed Continue in the last phase, automatically create the next round (or finish after 9 rounds)
// (5) Remove any logic that allows manual round advancement from the frontend

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomId, userId, type, value } = body;
    if (!roomId || !userId || !type) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }
    // Get latest game round
    const { data: round, error } = await supabase
      .from("game_rounds")
      .select("*")
      .eq("room_id", roomId)
      .order("round_number", { ascending: false })
      .limit(1)
      .single();
    if (error || !round) {
      return NextResponse.json(
        { error: "No game round found" },
        { status: 404 }
      );
    }
    // Get room for used_question_ids, dare rotation, etc.
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("*")
      .eq("id", roomId)
      .single();

    if (roomError || !room) {
      console.error("Error fetching room:", roomError);
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    let update: any = {};
    let autoAdvance = false;
    // --- PHASE LOGIC ---
    if (type === "answer") {
      const answers = { ...(round.answers || {}) };
      answers[userId] = value;
      update.answers = answers;
      // If all 3 answered, advance phase
      if (Object.keys(answers).length === 3) {
        if (round.mode === "guess_me") {
          // Create a randomized order for revealing answers
          const answerUserIds = Object.keys(answers);
          const shuffledOrder = [...answerUserIds].sort(
            () => Math.random() - 0.5
          );
          update.status = "revealing";
          update.reveal_index = 0;
          update.reveal_order = shuffledOrder; // Store the randomized order
        } else if (round.mode === "would_you_rather") {
          update.status = "guessing";
        } else if (round.mode === "dare") {
          update.status = "revealing";
        }
      }
    } else if (type === "guess") {
      // Guess Me: per-answer reveal loop
      if (round.mode === "guess_me" && round.status === "revealing") {
        const revealIndex =
          typeof round.reveal_index === "number" ? round.reveal_index : 0;
        const answers = round.answers || {};
        // Use randomized order if available, otherwise fall back to original order
        const revealOrder = round.reveal_order || Object.keys(answers);
        const currentAnswerUserId = revealOrder[revealIndex];

        // Only allow non-author to guess
        if (userId === currentAnswerUserId) {
          return NextResponse.json(
            { error: "Author cannot guess their own answer" },
            { status: 403 }
          );
        }

        // Store guesses in a structured way
        const guesses = { ...(round.guesses || {}) };
        if (!guesses.reveal_guesses) guesses.reveal_guesses = {};
        if (!guesses.reveal_guesses[revealIndex])
          guesses.reveal_guesses[revealIndex] = {};
        guesses.reveal_guesses[revealIndex][userId] = value;
        update.guesses = guesses;

        // If 2 guesses submitted, advance to continue phase for this answer
        const currentRevealGuesses = guesses.reveal_guesses[revealIndex] || {};
        if (Object.keys(currentRevealGuesses).length === 2) {
          update.status = "continue";
          update.scores = {}; // reset continues for this answer
        }
      } else {
        // Would You Rather: all 3 guess, then reveal
        const guesses = { ...(round.guesses || {}) };
        guesses[userId] = value;
        update.guesses = guesses;
        if (Object.keys(guesses).length === 3) {
          update.status = "revealing";
        }
      }
    } else if (type === "dare_result") {
      if (userId !== round.dare_target_user_id) {
        return NextResponse.json({ error: "Not dare target" }, { status: 403 });
      }
      update.answers = { ...(round.answers || {}), [userId]: value };
      update.status = "revealing";
    } else if (type === "vote") {
      const guesses = { ...(round.guesses || {}) };
      guesses[userId] = value;
      update.guesses = guesses;
      console.log(
        "Would You Rather vote submitted by:",
        userId,
        "value:",
        value
      );
      console.log("Current guesses:", guesses);
      if (Object.keys(guesses).length === 3) {
        update.status = "revealing";
        console.log("All 3 votes submitted, moving to revealing phase");
      }
    } else if (type === "continue") {
      // Track who pressed continue in current phase
      const continues = { ...(round.scores || {}) };
      continues[userId] = true;
      update.scores = continues;

      console.log("Continue pressed by user:", userId);
      console.log("Current continues:", Object.keys(continues));
      console.log("Current mode:", round.mode);
      console.log("Current status:", round.status);

      // For Guess Me: per-answer continue, then advance reveal_index or next mode
      if (round.mode === "guess_me" && round.status === "continue") {
        const revealIndex =
          typeof round.reveal_index === "number" ? round.reveal_index : 0;
        console.log("Guess Me continue - revealIndex:", revealIndex);
        console.log("Total answers:", Object.keys(round.answers || {}).length);

        if (Object.keys(continues).length === 3) {
          // Award points for correct guesses in this reveal
          const revealOrder =
            round.reveal_order || Object.keys(round.answers || {});
          const currentAnswerUserId = revealOrder[revealIndex];
          const revealGuesses =
            round.guesses?.reveal_guesses?.[revealIndex] || {};

          // Award points to players who guessed correctly
          for (const [guesserId, guessedUserId] of Object.entries(
            revealGuesses
          )) {
            if (guessedUserId === currentAnswerUserId) {
              // Correct guess - award 2 points
              const { data: player } = await supabase
                .from("players")
                .select("score")
                .eq("user_id", guesserId)
                .eq("room_id", roomId)
                .single();

              if (player) {
                await supabase
                  .from("players")
                  .update({ score: player.score + 2 })
                  .eq("user_id", guesserId)
                  .eq("room_id", roomId);
              }
            }
          }

          // If more answers to reveal, advance reveal_index
          const totalAnswers = revealOrder.length;
          if (revealIndex + 1 < totalAnswers) {
            console.log(
              "Advancing to next answer, revealIndex:",
              revealIndex + 1
            );
            update.reveal_index = revealIndex + 1;
            update.status = "revealing";
            update.scores = {}; // reset continues for next answer
          } else {
            // All answers revealed, auto-advance to next round (Would You Rather)
            console.log("All answers revealed, setting autoAdvance = true");
            autoAdvance = true;
          }
        }
      } else if (
        round.mode === "would_you_rather" &&
        round.status === "revealing"
      ) {
        // Award points for correct majority predictions
        if (Object.keys(continues).length === 3) {
          // Build vote counts safely from round.answers (the actual votes)
          const voteCounts: { [key: string]: number } = {};
          const answers = round.answers || {};

          console.log(
            "Would You Rather - checking answers for vote counting:",
            answers
          );
          console.log("Question options:", round.question?.options);

          // Initialize vote counts for all options
          if (round.question?.options) {
            round.question.options.forEach((option: string) => {
              voteCounts[option] = 0;
            });
          }

          console.log("Initialized voteCounts:", voteCounts);

          // Count votes from round.answers (the actual choices)
          Object.values(answers).forEach((answer: any) => {
            console.log("Processing answer:", answer, "type:", typeof answer);
            if (
              typeof answer === "string" &&
              voteCounts.hasOwnProperty(answer)
            ) {
              voteCounts[answer]++;
              console.log(
                "Incremented vote for:",
                answer,
                "new count:",
                voteCounts[answer]
              );
            } else {
              console.log(
                "Skipped answer:",
                answer,
                "hasProperty:",
                voteCounts.hasOwnProperty(answer)
              );
            }
          });

          console.log("Final vote counts:", voteCounts);

          // Find the most voted option safely
          let mostVotedOption = null;
          let maxVotes = 0;

          for (const [option, count] of Object.entries(voteCounts)) {
            console.log("Checking option:", option, "count:", count);
            if (count > maxVotes) {
              maxVotes = count;
              mostVotedOption = option;
            }
          }

          // Only proceed if we have a valid most voted option
          if (mostVotedOption && maxVotes > 0) {
            console.log(
              "Most voted option:",
              mostVotedOption,
              "with",
              maxVotes,
              "votes"
            );

            // Award points to players who guessed correctly (from round.guesses)
            for (const [playerId, playerGuess] of Object.entries(
              round.guesses || {}
            )) {
              console.log(
                "Checking player guess:",
                playerId,
                "guessed:",
                playerGuess,
                "correct:",
                mostVotedOption
              );
              if (playerGuess === mostVotedOption) {
                // Correct prediction - award 3 points
                const { data: player } = await supabase
                  .from("players")
                  .select("score")
                  .eq("user_id", playerId)
                  .eq("room_id", roomId)
                  .single();

                if (player) {
                  await supabase
                    .from("players")
                    .update({ score: player.score + 3 })
                    .eq("user_id", playerId)
                    .eq("room_id", roomId);

                  console.log("Awarded 3 points to player:", playerId);
                }
              }
            }
          } else {
            console.log("No valid votes found or all votes are 0");
            console.log("Answers object:", answers);
            console.log("Vote counts:", voteCounts);

            // Fallback: count votes directly from answers without relying on question options
            console.log("Trying fallback vote counting...");
            const fallbackVoteCounts: { [key: string]: number } = {};

            Object.values(answers).forEach((answer: any) => {
              if (typeof answer === "string") {
                fallbackVoteCounts[answer] =
                  (fallbackVoteCounts[answer] || 0) + 1;
              }
            });

            console.log("Fallback vote counts:", fallbackVoteCounts);

            // Find most voted option from fallback counts
            let fallbackMostVoted = null;
            let fallbackMaxVotes = 0;

            for (const [option, count] of Object.entries(fallbackVoteCounts)) {
              if (count > fallbackMaxVotes) {
                fallbackMaxVotes = count;
                fallbackMostVoted = option;
              }
            }

            if (fallbackMostVoted && fallbackMaxVotes > 0) {
              console.log(
                "Fallback most voted option:",
                fallbackMostVoted,
                "with",
                fallbackMaxVotes,
                "votes"
              );

              // Award points using fallback result
              for (const [playerId, playerGuess] of Object.entries(
                round.guesses || {}
              )) {
                console.log(
                  "Fallback checking player guess:",
                  playerId,
                  "guessed:",
                  playerGuess,
                  "correct:",
                  fallbackMostVoted
                );
                if (playerGuess === fallbackMostVoted) {
                  // Correct prediction - award 3 points
                  const { data: player } = await supabase
                    .from("players")
                    .select("score")
                    .eq("user_id", playerId)
                    .eq("room_id", roomId)
                    .single();

                  if (player) {
                    await supabase
                      .from("players")
                      .update({ score: player.score + 3 })
                      .eq("user_id", playerId)
                      .eq("room_id", roomId);

                    console.log(
                      "Fallback awarded 3 points to player:",
                      playerId
                    );
                  }
                }
              }
            }
          }

          console.log("All players continued, setting autoAdvance = true");
          autoAdvance = true;
        }
      } else if (round.mode === "dare" && round.status === "revealing") {
        // Award/deduct points for dare completion/decline
        if (Object.keys(continues).length === 3) {
          const dareResult = round.answers?.[round.dare_target_user_id];
          if (dareResult === "completed") {
            // Dare completed - award 5 points
            const { data: player } = await supabase
              .from("players")
              .select("score")
              .eq("user_id", round.dare_target_user_id)
              .eq("room_id", roomId)
              .single();

            if (player) {
              await supabase
                .from("players")
                .update({ score: player.score + 5 })
                .eq("user_id", round.dare_target_user_id)
                .eq("room_id", roomId);
            }
          } else if (dareResult === "declined") {
            // Dare declined - deduct 2 points
            const { data: player } = await supabase
              .from("players")
              .select("score")
              .eq("user_id", round.dare_target_user_id)
              .eq("room_id", roomId)
              .single();

            if (player) {
              await supabase
                .from("players")
                .update({ score: Math.max(0, player.score - 2) })
                .eq("user_id", round.dare_target_user_id)
                .eq("room_id", roomId);
            }
          }

          console.log("All players continued, setting autoAdvance = true");
          autoAdvance = true;
        }
      } else {
        // For Would You Rather and Dare: after all 3 continue, auto-advance
        if (Object.keys(continues).length === 3) {
          console.log("All players continued, setting autoAdvance = true");
          autoAdvance = true;
        }
      }
    } else {
      return NextResponse.json({ error: "Unknown type" }, { status: 400 });
    }

    // Update game_round
    const { data: updated, error: updateError } = await supabase
      .from("game_rounds")
      .update(update)
      .eq("id", round.id)
      .select()
      .single();
    if (updateError) {
      console.error("Error updating game round:", updateError);
      return NextResponse.json(
        { error: "Failed to update round" },
        { status: 500 }
      );
    }

    // --- Auto-advance to next round/phase if needed ---
    if (autoAdvance) {
      console.log("Auto-advancing to next round...");
      // Determine next round number and mode
      const nextRoundNum = (room.current_round || 0) + 1;
      console.log("Next round number:", nextRoundNum);

      // Get room settings for max rounds
      const maxRounds = room.game_settings?.totalRounds || 9;

      if (nextRoundNum > maxRounds) {
        console.log("Game finished, determining winner...");

        // Get final scores and determine winner
        const { data: finalPlayers } = await supabase
          .from("players")
          .select("*")
          .eq("room_id", roomId)
          .order("score", { ascending: false });

        if (finalPlayers && finalPlayers.length > 0) {
          const winner = finalPlayers[0];
          const isTie =
            finalPlayers.length > 1 && finalPlayers[1].score === winner.score;

          // Mark game as finished with winner info
          await supabase
            .from("rooms")
            .update({
              game_state: "finished",
              winner_user_id: winner.user_id,
              is_tie: isTie,
              final_scores: finalPlayers.map((p) => ({
                user_id: p.user_id,
                score: p.score,
              })),
            })
            .eq("id", roomId);
        } else {
          // Mark game as finished without winner (fallback)
          await supabase
            .from("rooms")
            .update({ game_state: "finished" })
            .eq("id", roomId);
        }
      } else {
        // Determine next mode
        const mode = MODES[(nextRoundNum - 1) % 3];
        console.log("Next mode:", mode);

        // For dare, determine target player
        let dareTargetUserId = null;
        let dareIndex = room.dare_rotation_index || 0;
        if (mode === "dare") {
          const { data: players } = await supabase
            .from("players")
            .select("*")
            .eq("room_id", roomId);
          if (players && players.length === 3) {
            dareTargetUserId = players[dareIndex % 3].user_id;
            dareIndex = (dareIndex + 1) % 3;
          }
        }

        // Select a unique question for this mode and selected categories
        const usedIds = Array.isArray(room.used_question_ids)
          ? room.used_question_ids
          : [];
        const selectedCategories = room.game_settings?.questionCategories || [
          "Alltag",
          "Spaß",
          "Persönlich",
          "Reisen",
          "Mutprobe",
          "Fitness",
          "Lifestyle",
        ];

        // Get questions for this mode and categories, excluding used ones
        const { data: questions } = await supabase
          .from("questions")
          .select("*")
          .eq("type", mode)
          .in("category", selectedCategories);

        if (!questions || questions.length === 0) {
          console.log(
            "No questions found for mode:",
            mode,
            "and categories:",
            selectedCategories
          );
          // No questions for selected categories, finish game
          await supabase
            .from("rooms")
            .update({ game_state: "finished" })
            .eq("id", roomId);
        } else {
          // Filter out used questions
          const available = questions.filter((q) => !usedIds.includes(q.id));
          if (available.length === 0) {
            console.log(
              "No unique questions left for mode:",
              mode,
              "and categories:",
              selectedCategories
            );
            // No unique questions left, finish game
            await supabase
              .from("rooms")
              .update({ game_state: "finished" })
              .eq("id", roomId);
          } else {
            const question =
              available[Math.floor(Math.random() * available.length)];
            const newUsedIds = [...usedIds, question.id];
            console.log(
              "Creating new game round with question:",
              question.id,
              "from category:",
              question.category
            );

            // Create new game_round
            const { error: insertError } = await supabase
              .from("game_rounds")
              .insert({
                room_id: roomId,
                round_number: nextRoundNum,
                question_id: question.id,
                mode,
                dare_target_user_id: dareTargetUserId,
                answers: {},
                guesses: {},
                scores: {},
                status: "answering",
                reveal_index: mode === "guess_me" ? 0 : undefined,
              });

            if (insertError) {
              console.error("Error creating new game round:", insertError);
            }

            // Update room state
            const { error: updateRoomError } = await supabase
              .from("rooms")
              .update({
                game_state: "playing",
                current_round: nextRoundNum,
                used_question_ids: newUsedIds,
                dare_rotation_index: dareIndex,
              })
              .eq("id", roomId);

            if (updateRoomError) {
              console.error("Error updating room state:", updateRoomError);
            }
          }
        }
      }
    }
    // --- Broadcast to all clients in the room ---
    const serviceSupabase = createClient(
      "https://bacrwmjkatsugirpyrjk.supabase.co",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhY3J3bWprYXRzdWdpcnB5cmprIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjY2MTU0OSwiZXhwIjoyMDY4MjM3NTQ5fQ.IFyXt5ClGujHErS_Hz6mrfZmjqlVeA-MUUxm-y1u2o8"
    );
    await serviceSupabase.channel(`room-${roomId}`).send({
      type: "broadcast",
      event: "room_update",
      payload: { type, userId, roundId: round.id },
    });
    return NextResponse.json({ gameRound: updated });
  } catch (error) {
    console.error("Error in POST /api/game-round:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
