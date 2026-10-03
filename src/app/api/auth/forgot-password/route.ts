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
 *
 * Sends a real email with a 6-digit reset code via Resend.
 * Falls back to returning the code in the response (dev mode) if
 * RESEND_API_KEY is not set.
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
      // Security: don't leak which emails exist
      return NextResponse.json({
        ok: true,
        message: "Si ce compte existe, un email a été envoyé.",
      });
    }

    const resetCode = generateResetToken();
    storeResetToken(user.email, resetCode);

    const apiKey = process.env.RESEND_API_KEY;

    if (apiKey && apiKey.startsWith("re_")) {
      // PRODUCTION: send real email via Resend
      try {
        const { Resend } = await import("resend");
        const resend = new Resend(apiKey);

        const { data, error } = await resend.emails.send({
          from: "FrigoAi <onboarding@resend.dev>",
          to: email,
          subject: "🔐 Réinitialisation de votre mot de passe FrigoAi",
          html: `
            <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0a0f0d; border-radius: 24px; color: #fff;">
              <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #00C16E; font-size: 28px; margin: 0;">FrigoAi</h1>
                <p style="color: #888; font-size: 14px; margin: 4px 0 0 0;">Planificateur de repas anti-gaspillage</p>
              </div>
              <div style="background: #141917; border-radius: 16px; padding: 24px; border: 1px solid #1a1f1d;">
                <h2 style="color: #fff; font-size: 18px; margin: 0 0 12px 0;">Réinitialisation de mot de passe</h2>
                <p style="color: #ccc; font-size: 14px; line-height: 1.6;">
                  Bonjour ${user.name || ""},
                </p>
                <p style="color: #ccc; font-size: 14px; line-height: 1.6;">
                  Vous avez demandé à réinitialiser votre mot de passe FrigoAi.
                  Voici votre code de vérification :
                </p>
                <div style="text-align: center; margin: 24px 0;">
                  <div style="display: inline-block; background: #00C16E; color: #000; font-size: 36px; font-weight: 900; letter-spacing: 8px; padding: 16px 32px; border-radius: 12px;">
                    ${resetCode}
                  </div>
                </div>
                <p style="color: #999; font-size: 12px; text-align: center;">
                  Ce code expire dans 15 minutes. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
                </p>
              </div>
              <p style="color: #555; font-size: 11px; text-align: center; margin-top: 24px;">
                FrigoAi · IA au service de l'anti-gaspillage alimentaire
              </p>
            </div>
          `,
        });

        if (error) {
          console.error("[forgot-password] Resend error:", error);
          // Fall back to returning code in response
          return NextResponse.json({
            ok: true,
            resetCode,
            message: "Email non envoyé (erreur Resend). Voici votre code :",
          });
        }

        return NextResponse.json({
          ok: true,
          message: "Un email avec votre code a été envoyé à " + email,
          emailId: data?.id,
        });
      } catch (emailErr) {
        console.error("[forgot-password] Email send failed:", emailErr);
        // Fall back to returning code in response
        return NextResponse.json({
          ok: true,
          resetCode,
          message: "Email non envoyé. Voici votre code (mode démo) :",
        });
      }
    }

    // DEV MODE: no RESEND_API_KEY — return code in response
    return NextResponse.json({
      ok: true,
      resetCode,
      message: "Mode démo — aucun email envoyé. Voici votre code :",
    });
  } catch (err) {
    console.error("[POST /api/auth/forgot-password]", err);
    return NextResponse.json(
      { error: "Erreur lors de la demande de réinitialisation" },
      { status: 500 }
    );
  }
}
