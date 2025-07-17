import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await context.params;

  try {
    const { userId, settings } = await request.json();

    // Fetch room to verify admin
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("*")
      .eq("id", roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Only admin can update settings
    if (room.admin_user_id !== userId) {
      return NextResponse.json(
        { error: "Only admin can update settings" },
        { status: 403 }
      );
    }

    // Validate settings
    if (
      !settings.totalRounds ||
      settings.totalRounds < 3 ||
      settings.totalRounds > 15
    ) {
      return NextResponse.json(
        { error: "Total rounds must be between 3 and 15" },
        { status: 400 }
      );
    }

    if (
      !settings.questionCategories ||
      settings.questionCategories.length === 0
    ) {
      return NextResponse.json(
        { error: "At least one question category must be selected" },
        { status: 400 }
      );
    }

    // Update room settings
    const { error: updateError } = await supabase
      .from("rooms")
      .update({ game_settings: settings })
      .eq("id", roomId);

    if (updateError) {
      console.error("Error updating room settings:", updateError);
      return NextResponse.json(
        { error: "Failed to update settings" },
        { status: 500 }
      );
    }

    // Broadcast settings update
    const serviceSupabase = createClient(
      "https://bacrwmjkatsugirpyrjk.supabase.co",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhY3J3bWprYXRzdWdpcnB5cmprIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjY2MTU0OSwiZXhwIjoyMDY4MjM3NTQ5fQ.IFyXt5ClGujHErS_Hz6mrfZmjqlVeA-MUUxm-y1u2o8"
    );
    await serviceSupabase.channel(`room-${roomId}`).send({
      type: "broadcast",
      event: "room_update",
      payload: { type: "settings_updated", settings },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in PUT /api/rooms/[roomId]/settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
