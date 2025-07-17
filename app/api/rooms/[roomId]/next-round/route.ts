import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

const MODES = ["guess_me", "would_you_rather", "dare"];

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await context.params;
  try {
    const { userId } = await request.json();

    // Fetch room and players
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("*, players:players(*)")
      .eq("id", roomId)
      .single();
    if (roomError || !room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }
    if (room.admin_user_id !== userId) {
      return NextResponse.json(
        { error: "Only admin can advance the round" },
        { status: 403 }
      );
    }
    const usedIds: string[] = room.used_question_ids || [];
    const dareIndex: number = room.dare_rotation_index || 0;
    const roundNum = (room.current_round || 0) + 1;
    if (roundNum > 9) {
      return NextResponse.json({ error: "Game is finished" }, { status: 400 });
    }
    // Determine mode
    const mode = MODES[(roundNum - 1) % 3];
    // For dare, determine target player
    let dareTargetUserId = null;
    if (mode === "dare") {
      const players = room.players || [];
      if (players.length !== 3) {
        return NextResponse.json(
          { error: "Dare requires 3 players" },
          { status: 400 }
        );
      }
      // Rotate dare target
      dareTargetUserId = players[dareIndex % 3].user_id;
    }
    // Select a unique question for this mode
    const { data: questions, error: qError } = await supabase
      .from("questions")
      .select("*")
      .eq("type", mode);
    if (qError || !questions || questions.length === 0) {
      return NextResponse.json(
        { error: "No questions found for mode" },
        { status: 500 }
      );
    }
    const available = questions.filter((q) => !usedIds.includes(q.id));
    if (available.length === 0) {
      return NextResponse.json(
        { error: "No unique questions left for mode" },
        { status: 500 }
      );
    }
    const question = available[Math.floor(Math.random() * available.length)];
    // Update used_question_ids and dare_rotation_index
    const newUsedIds = [...usedIds, question.id];
    const newDareIndex = mode === "dare" ? (dareIndex + 1) % 3 : dareIndex;
    // Create game_round
    const { data: gameRound, error: grError } = await supabase
      .from("game_rounds")
      .insert({
        room_id: roomId,
        round_number: roundNum,
        question_id: question.id,
        mode,
        dare_target_user_id: dareTargetUserId,
        answers: {},
        guesses: {},
        scores: {},
        status: "answering",
      })
      .select()
      .single();
    if (grError) {
      return NextResponse.json(
        { error: "Failed to create game round" },
        { status: 500 }
      );
    }
    // Update room state
    const { error: updateError } = await supabase
      .from("rooms")
      .update({
        game_state: "playing",
        current_round: roundNum,
        used_question_ids: newUsedIds,
        dare_rotation_index: newDareIndex,
      })
      .eq("id", roomId);
    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update room state" },
        { status: 500 }
      );
    }
    // --- Broadcast to all clients in the room ---
    const serviceSupabase = createClient(
      "https://bacrwmjkatsugirpyrjk.supabase.co",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhY3J3bWprYXRzdWdpcnB5cmprIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjY2MTU0OSwiZXhwIjoyMDY4MjM3NTQ5fQ.IFyXt5ClGujHErS_Hz6mrfZmjqlVeA-MUUxm-y1u2o8"
    );
    await serviceSupabase.channel(`room-${roomId}`).send({
      type: "broadcast",
      event: "room_update",
      payload: { type: "next_round", round: roundNum },
    });
    return NextResponse.json({ success: true, gameRound });
  } catch (error) {
    console.error("Error in POST /api/rooms/[roomId]/next-round:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
