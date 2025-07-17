import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { setServerCookie } from "@/lib/server-cookies";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const { userId, name, avatar, roomId } = await request.json();

    if (!name || !roomId) {
      return NextResponse.json(
        { error: "Name and room ID are required" },
        { status: 400 }
      );
    }

    // Check if room exists
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("*")
      .eq("id", roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Check if room is full (max 3 players)
    const { data: players, error: playersError } = await supabase
      .from("players")
      .select("*")
      .eq("room_id", roomId);

    if (playersError) {
      console.error("Error fetching players:", playersError);
      return NextResponse.json(
        { error: "Failed to check room capacity" },
        { status: 500 }
      );
    }

    if (players && players.length >= 3) {
      return NextResponse.json({ error: "Room is full" }, { status: 400 });
    }

    // Upsert or create user
    let user;
    let userError;
    if (userId) {
      const result = await supabase
        .from("users")
        .upsert({
          id: userId,
          name,
          avatar: avatar || name.charAt(0).toUpperCase(),
        })
        .select()
        .single();
      user = result.data;
      userError = result.error;
    } else {
      const result = await supabase
        .from("users")
        .insert({
          name,
          avatar: avatar || name.charAt(0).toUpperCase(),
        })
        .select()
        .single();
      user = result.data;
      userError = result.error;
    }

    if (userError) {
      console.error("Error creating user:", userError);
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 }
      );
    }

    // Determine available role
    const existingRoles = players?.map((p) => p.role) || [];
    let availableRole: "you" | "girlfriend" | "potential_partner";

    if (!existingRoles.includes("you")) {
      availableRole = "you";
    } else if (!existingRoles.includes("girlfriend")) {
      availableRole = "girlfriend";
    } else if (!existingRoles.includes("potential_partner")) {
      availableRole = "potential_partner";
    } else {
      return NextResponse.json(
        { error: "No available roles in room" },
        { status: 400 }
      );
    }

    // Prevent duplicate player entry
    const { data: existingPlayer } = await supabase
      .from("players")
      .select("*")
      .eq("user_id", user.id)
      .eq("room_id", roomId)
      .maybeSingle();

    if (!existingPlayer) {
      const { error: playerError } = await supabase.from("players").insert({
        user_id: user.id,
        room_id: roomId,
        role: availableRole,
        score: 0,
      });
      if (playerError) {
        console.error("Error adding player:", playerError);
        return NextResponse.json(
          { error: "Failed to join room" },
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
        payload: { type: "player_joined", userId: user.id },
      });
    }

    // Set user session in cookies
    await setServerCookie(
      "user_session",
      JSON.stringify({
        userId: user.id,
        name,
        avatar: avatar || name.charAt(0).toUpperCase(),
        adminRooms: [],
        currentRoom: roomId,
      })
    );

    return NextResponse.json({
      roomId,
      user,
      room,
      role: availableRole,
    });
  } catch (error) {
    console.error("Error in POST /api/rooms/join:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
