import { NextRequest, NextResponse } from "next/server";
import {
  isValidEmail,
  findUserByEmail,
  generateResetToken,
  storeResetToken,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/forgot-password
 * Body: { email }
 * Behaviour:
 *   - If a user exists with this email, generate a 6-digit reset code,
 *     store it (in-memory, 15-min TTL), and return the code in the
 *     response so the demo user can see it. In production, you'd send
 *     an email/SMS instead and NEVER return the code in the response.
 *   - If the user doesn't exist, return success anyway (do not leak
 *     which emails are registered).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "").trim();

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Email invalide" }, { status: 400 });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      // security: don't leak which emails exist
      return NextResponse.json({ ok: true });
    }

    const resetCode = generateResetToken();
    storeResetToken(user.email, resetCode);

    // DEV/DEMO ONLY: return the code so the user can see it.
    return NextResponse.json({ ok: true, resetCode });
  } catch (err) {
    console.error("[POST /api/auth/forgot-password]", err);
    return NextResponse.json(
      { error: "Erreur lors de la demande de réinitialisation" },
      { status: 500 }
    );
  }
}
