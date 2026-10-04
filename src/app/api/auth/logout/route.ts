import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await clearSessionCookie();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/auth/logout]", err);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}
