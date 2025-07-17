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

    // Only admin can restart
    if (room.admin_user_id !== userId) {
      return NextResponse.json(
        { error: "Only admin can restart the game" },
        { status: 403 }
      );
    }

    // Clear any existing game rounds first
    const { error: clearRoundsError } = await supabase
      .from("game_rounds")
      .delete()
      .eq("room_id", roomId);
    if (clearRoundsError) {
      console.error("Error clearing game rounds:", clearRoundsError);
      return NextResponse.json(
        { error: "Failed to clear previous game rounds" },
        { status: 500 }
      );
    }

    // Reset all player scores to 0
    const { error: resetScoresError } = await supabase
      .from("players")
      .update({ score: 0 })
      .eq("room_id", roomId);

    if (resetScoresError) {
      console.error("Error resetting scores:", resetScoresError);
      return NextResponse.json(
        { error: "Failed to reset scores" },
        { status: 500 }
      );
    }

    // Update room state - reset to waiting lobby state
    const { error: updateError } = await supabase
      .from("rooms")
      .update({
        game_state: "waiting",
        current_round: 0,
        used_question_ids: [], // Clear used questions for fresh start
        dare_rotation_index: 0, // Reset dare rotation
        winner_user_id: null, // Clear winner
        is_tie: false, // Clear tie status
        final_scores: null, // Clear final scores
      })
      .eq("id", roomId);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update room state" },
        { status: 500 }
      );
    }

    // Broadcast to all clients in the room
    const serviceSupabase = createClient(
      "https://bacrwmjkatsugirpyrjk.supabase.co",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhY3J3bWprYXRzdWdpcnB5cmprIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjY2MTU0OSwiZXhwIjoyMDY4MjM3NTQ5fQ.IFyXt5ClGujHErS_Hz6mrfZmjqlVeA-MUUxm-y1u2o8"
    );
    await serviceSupabase.channel(`room-${roomId}`).send({
      type: "broadcast",
      event: "room_update",
      payload: { type: "game_reset_to_lobby" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in POST /api/rooms/[roomId]/play-again:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
