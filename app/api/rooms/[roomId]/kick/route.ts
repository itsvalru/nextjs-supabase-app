import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await context.params;
  try {
    const { userId, targetUserId } = await request.json();

    // Fetch room
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("*")
      .eq("id", roomId)
      .single();
    if (roomError || !room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Only admin can kick players
    if (room.admin_user_id !== userId) {
      return NextResponse.json(
        { error: "Only admin can kick players" },
        { status: 403 }
      );
    }

    // Cannot kick yourself
    if (userId === targetUserId) {
      return NextResponse.json(
        { error: "Cannot kick yourself" },
        { status: 400 }
      );
    }

    // Check if target player exists in the room
    const { data: targetPlayer, error: playerError } = await supabase
      .from("players")
      .select("*")
      .eq("room_id", roomId)
      .eq("user_id", targetUserId)
      .single();

    if (playerError || !targetPlayer) {
      return NextResponse.json(
        { error: "Player not found in room" },
        { status: 404 }
      );
    }

    // Remove player from room
    const { error: kickError } = await supabase
      .from("players")
      .delete()
      .eq("room_id", roomId)
      .eq("user_id", targetUserId);

    if (kickError) {
      console.error("Error kicking player:", kickError);
      return NextResponse.json(
        { error: "Failed to kick player" },
        { status: 500 }
      );
    }

    // If game is in progress, check if we need to end it
    if (room.game_state === "playing") {
      // Get remaining players
      const { data: remainingPlayers } = await supabase
        .from("players")
        .select("*")
        .eq("room_id", roomId);

      // If less than 3 players, end the game
      if (!remainingPlayers || remainingPlayers.length < 3) {
        await supabase
          .from("rooms")
          .update({
            game_state: "waiting",
            current_round: 0,
            winner_user_id: null,
            is_tie: false,
            final_scores: null,
          })
          .eq("id", roomId);
      }
    }

    // Broadcast to all clients in the room
    const serviceSupabase = createClient(
      "https://bacrwmjkatsugirpyrjk.supabase.co",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhY3J3bWprYXRzdWdpcnB5cmprIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjY2MTU0OSwiZXhwIjoyMDY4MjM3NTQ5fQ.IFyXt5ClGujHErS_Hz6mrfZmjqlVeA-MUUxm-y1u2o8"
    );
    await serviceSupabase.channel(`room-${roomId}`).send({
      type: "broadcast",
      event: "room_update",
      payload: { type: "player_kicked", targetUserId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in POST /api/rooms/[roomId]/kick:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
