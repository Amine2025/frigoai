import { NextRequest, NextResponse } from "next/server";
import {
  isValidEmail,
  verifyResetToken,
  findUserByEmail,
  hashPassword,
  updateUserPassword,
  clearResetToken,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/reset-password
 * Body: { email, resetCode, newPassword }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "").trim();
    const resetCode = String(body?.resetCode || "").trim();
    const newPassword = String(body?.newPassword || "");

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Email invalide" }, { status: 400 });
    }
    if (!/^\d{6}$/.test(resetCode)) {
      return NextResponse.json(
        { error: "Le code doit être composé de 6 chiffres" },
        { status: 400 }
      );
    }
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Le mot de passe doit contenir au moins 6 caractères" },
        { status: 400 }
      );
    }

    const user = await findUserByEmail(email);
    if (!user) {
      // do not leak existence
      return NextResponse.json(
        { error: "Code invalide ou expiré" },
        { status: 400 }
      );
    }

    const ok = verifyResetToken(user.email, resetCode);
    if (!ok) {
      return NextResponse.json(
        { error: "Code invalide ou expiré" },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(newPassword);
    await updateUserPassword(user.id, passwordHash);
    clearResetToken(user.email);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/auth/reset-password]", err);
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Erreur lors de la réinitialisation", detail },
      { status: 500 }
    );
  }
}
