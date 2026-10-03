import { NextRequest, NextResponse } from "next/server";
import { emojiFor } from "@/lib/fridge-utils";

export const dynamic = "force-dynamic";

// GET /api/suggest-name?prefix=... — returns an emoji suggestion
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const prefix = url.searchParams.get("prefix") || "";
  const category = url.searchParams.get("category") || "Autre";
  const emoji = emojiFor(prefix, category);
  return NextResponse.json({ emoji, prefix, category });
}
