import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await context.params;
  try {
    const { userId } = await request.json();

    // Fetch room
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("*")
      .eq("id", roomId)
      .single();
    if (roomError || !room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Only admin can start
    if (room.admin_user_id !== userId) {
      return NextResponse.json(
        { error: "Only admin can start the game" },
        { status: 403 }
      );
    }

    // Get room settings to determine starting mode
    const selectedModes = room.game_settings?.gameModes || [
      "guess_me",
      "would_you_rather",
      "dare",
    ];
    const startingMode = selectedModes[0]; // Start with the first selected mode

    const { data: questions, error: qError } = await supabase
      .from("questions")
      .select("*")
      .eq("type", startingMode);
    if (qError || !questions || questions.length === 0) {
      return NextResponse.json(
        { error: `No '${startingMode}' questions found` },
        { status: 500 }
      );
    }
    const question = questions[Math.floor(Math.random() * questions.length)];

    // Increment round number
    const nextRound = (room.current_round || 0) + 1;

    // Create game_round
    const { data: gameRound, error: grError } = await supabase
      .from("game_rounds")
      .insert({
        room_id: roomId,
        round_number: nextRound,
        question_id: question.id,
        mode: startingMode,
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

    // Defensive: always initialize used_question_ids as array
    let usedIds = Array.isArray(room.used_question_ids)
      ? room.used_question_ids
      : [];
    usedIds = [...usedIds, question.id];

    // Update room state
    const { error: updateError } = await supabase
      .from("rooms")
      .update({
        game_state: "playing",
        current_round: nextRound,
        used_question_ids: usedIds,
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
      payload: { type: "game_started", round: nextRound },
    });

    return NextResponse.json({ success: true, gameRound });
  } catch (error) {
    console.error("Error in POST /api/rooms/[roomId]/start:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
