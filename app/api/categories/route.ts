import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    // Fetch unique categories from the questions table
    const { data: categories, error } = await supabase
      .from("questions")
      .select("category")
      .not("category", "is", null)
      .not("category", "eq", "");

    if (error) {
      console.error("Error fetching categories:", error);
      return NextResponse.json(
        { error: "Failed to fetch categories" },
        { status: 500 }
      );
    }

    // Extract unique categories and sort them
    const uniqueCategories = [
      ...new Set(categories.map((c) => c.category)),
    ].sort();

    return NextResponse.json({ categories: uniqueCategories });
  } catch (error) {
    console.error("Error in GET /api/categories:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
