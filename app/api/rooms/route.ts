import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { setServerCookie } from "@/lib/server-cookies";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const { userId, name, avatar, roomName, isPermanent } =
      await request.json();

    if (!name || !roomName) {
      return NextResponse.json(
        { error: "Name and room name are required" },
        { status: 400 }
      );
    }

    // Generate a unique room ID
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Upsert user in Supabase
    let user;
    let userError;
    if (userId) {
      // Upsert with userId
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
      // Create new user
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

    // Create room in Supabase
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .insert({
        id: roomId,
        name: roomName,
        is_permanent: isPermanent,
        admin_user_id: user.id,
        current_round: 0,
        game_state: "waiting",
      })
      .select()
      .single();

    if (roomError) {
      console.error("Error creating room:", roomError);
      return NextResponse.json(
        { error: "Failed to create room" },
        { status: 500 }
      );
    }

    // Add player to room (prevent duplicate)
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
        role: "you",
        score: 0,
      });
      if (playerError) {
        console.error("Error adding player:", playerError);
        return NextResponse.json(
          { error: "Failed to add player to room" },
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
        adminRooms: [roomId],
        currentRoom: roomId,
      })
    );

    return NextResponse.json({
      roomId,
      user,
      room,
    });
  } catch (error) {
    console.error("Error in POST /api/rooms:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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

    // Get room details with correct join/alias
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select(
        `
        *,
        players (
          *,
          user:users!fk_players_user (name, avatar)
        )
      `
      )
      .eq("id", roomId)
      .single();

    if (roomError || !room) {
      console.error("Error fetching room:", roomError);
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    return NextResponse.json({ room });
  } catch (error) {
    console.error("Error in GET /api/rooms:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
