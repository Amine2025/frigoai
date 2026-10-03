import { NextRequest, NextResponse } from "next/server";
import {
  hashPassword,
  setSessionCookie,
  isValidEmail,
  isValidPhone,
  findUserByEmail,
  createUser,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body?.email || "").trim();
    const password = String(body?.password || "");
    const name = body?.name ? String(body.name).trim() : "";
    const phone = String(body?.phone || "").trim();

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Email invalide" }, { status: 400 });
    }
    if (!isValidPhone(phone)) {
      return NextResponse.json(
        {
          error:
            "Téléphone invalide (format attendu : 06XXXXXXXX, 07XXXXXXXX ou +336XXXXXXXX / +337XXXXXXXX)",
        },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Le mot de passe doit contenir au moins 6 caractères" },
        { status: 400 }
      );
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return NextResponse.json(
        { error: "Un compte existe déjà avec cet email" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await createUser({ email, name, phone, passwordHash });

    await setSessionCookie({
      userId: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
    });

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/auth/register]", err);
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Erreur lors de l'inscription", detail },
      { status: 500 }
    );
  }
}
