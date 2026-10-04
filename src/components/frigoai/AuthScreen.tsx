"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Leaf,
  Mail,
  Lock,
  User as UserIcon,
  Phone,
  Eye,
  EyeOff,
  Loader2,
  ArrowLeft,
  KeyRound,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { useFrigoStore } from "@/store/frigo-store";
import { cn } from "@/lib/utils";

type Mode = "login" | "register" | "forgot" | "reset";

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.05 },
  },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  },
};

/* ------------------------------------------------------------------ */
/*  Phone validation (client mirror of server isValidPhone)            */
/* ------------------------------------------------------------------ */

function isValidPhone(phone: string): boolean {
  const p = phone.trim();
  if (!p) return false;
  return /^\+33[67]\d{8}$/.test(p) || /^0[67]\d{8}$/.test(p);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* ------------------------------------------------------------------ */
/*  Field                                                              */
/* ------------------------------------------------------------------ */

function Field({
  icon,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
  rightSlot,
  inputMode,
}: {
  icon: React.ReactNode;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  rightSlot?: React.ReactNode;
  inputMode?: "text" | "email" | "tel" | "numeric";
}) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
        {icon}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        className="w-full h-12 rounded-2xl glass-pill pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-[#00C16E]/60 focus:ring-2 focus:ring-[#00C16E]/20 transition"
      />
      {rightSlot && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {rightSlot}
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function AuthScreen() {
  const login = useFrigoStore((s) => s.login);
  const register = useFrigoStore((s) => s.register);
  const forgotPassword = useFrigoStore((s) => s.forgotPassword);
  const resetPassword = useFrigoStore((s) => s.resetPassword);

  const [mode, setMode] = useState<Mode>("login");

  // shared fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // register
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+33");

  // forgot / reset
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  /* ---------------- Handlers ---------------- */

  const handleLogin = async () => {
    if (!isValidEmail(email)) {
      toast.error("Email invalide");
      return;
    }
    if (!password) {
      toast.error("Mot de passe requis");
      return;
    }
    setSubmitting(true);
    const ok = await login(email, password);
    setSubmitting(false);
    if (ok) {
      toast.success("✓ Connexion réussie", {
        description: "Bienvenue sur FrigoAi",
      });
    } else {
      toast.error("Email ou mot de passe incorrect");
    }
  };

  const handleRegister = async () => {
    if (!name.trim()) {
      toast.error("Veuillez saisir votre nom");
      return;
    }
    if (!isValidEmail(email)) {
      toast.error("Email invalide");
      return;
    }
    if (!isValidPhone(phone)) {
      toast.error(
        "Téléphone invalide (format : 06XXXXXXXX, 07XXXXXXXX ou +336/7XXXXXXXX)"
      );
      return;
    }
    if (password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    setSubmitting(true);
    const ok = await register(email, password, name, phone);
    setSubmitting(false);
    if (ok) {
      toast.success("✓ Compte créé", {
        description: "Bienvenue sur FrigoAi",
      });
    } else {
      toast.error("Échec de l'inscription (email déjà utilisé ?)");
    }
  };

  const handleForgot = async () => {
    if (!isValidEmail(email)) {
      toast.error("Email invalide");
      return;
    }
    setSubmitting(true);
    const res = await forgotPassword(email);
    setSubmitting(false);
    if (res.ok) {
      if (res.resetCode) {
        toast.success("Code envoyé", {
          description: `Code de réinitialisation (démo) : ${res.resetCode}`,
        });
      } else {
        toast.success(
          "Si un compte existe, un code a été envoyé"
        );
      }
      setMode("reset");
    } else {
      toast.error(res.error || "Échec de la demande");
    }
  };

  const handleReset = async () => {
    if (!isValidEmail(email)) {
      toast.error("Email invalide");
      return;
    }
    if (!/^\d{6}$/.test(resetCode.trim())) {
      toast.error("Le code doit comporter 6 chiffres");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    setSubmitting(true);
    const res = await resetPassword(email, resetCode, newPassword);
    setSubmitting(false);
    if (res.ok) {
      toast.success("✓ Mot de passe réinitialisé", {
        description: "Vous pouvez vous connecter",
      });
      // clear and switch back to login
      setResetCode("");
      setNewPassword("");
      setShowNewPassword(false);
      setPassword("");
      setMode("login");
    } else {
      toast.error(res.error || "Code invalide ou expiré");
    }
  };

  /* ---------------- Render ---------------- */

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Brand */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-6"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl glass-panel-emerald mb-3 shadow-lg shadow-[#00C16E]/30">
            <Leaf className="w-8 h-8 text-[#00C16E]" strokeWidth={2.5} />
          </div>
          <h1 className="font-display font-black text-3xl text-foreground tracking-tight">
            Frigo<span className="text-[#00C16E]">Ai</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1.5">
            IA au service de l&apos;anti-gaspillage alimentaire
          </p>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
          className="glass-panel rounded-3xl p-6 space-y-5"
        >
          {/* Header */}
          <div className="text-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                variants={containerVariants}
                initial="hidden"
                animate="show"
                exit="exit"
                className="space-y-1"
              >
                {mode === "login" && (
                  <motion.h2
                    variants={itemVariants}
                    className="font-display font-bold text-xl text-foreground"
                  >
                    Connexion
                  </motion.h2>
                )}
                {mode === "register" && (
                  <motion.h2
                    variants={itemVariants}
                    className="font-display font-bold text-xl text-foreground"
                  >
                    Créer un compte
                  </motion.h2>
                )}
                {mode === "forgot" && (
                  <motion.h2
                    variants={itemVariants}
                    className="font-display font-bold text-xl text-foreground"
                  >
                    Mot de passe oublié
                  </motion.h2>
                )}
                {mode === "reset" && (
                  <motion.h2
                    variants={itemVariants}
                    className="font-display font-bold text-xl text-foreground"
                  >
                    Réinitialiser
                  </motion.h2>
                )}
                <motion.p
                  variants={itemVariants}
                  className="text-xs text-muted-foreground"
                >
                  {mode === "login" &&
                    "Connectez-vous pour accéder à votre frigo intelligent."}
                  {mode === "register" &&
                    "Quelques informations pour commencer votre aventure anti-gaspi."}
                  {mode === "forgot" &&
                    "Saisissez votre email — nous vous enverrons un code de réinitialisation."}
                  {mode === "reset" &&
                    "Entrez le code reçu et votre nouveau mot de passe."}
                </motion.p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Mode toggle (login / register only) */}
          {(mode === "login" || mode === "register") && (
            <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl glass-pill">
              <button
                onClick={() => setMode("login")}
                className={cn(
                  "tap h-10 rounded-xl text-sm font-semibold transition",
                  mode === "login"
                    ? "bg-[#00C16E] text-black shadow-lg shadow-[#00C16E]/20"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Connexion
              </button>
              <button
                onClick={() => setMode("register")}
                className={cn(
                  "tap h-10 rounded-xl text-sm font-semibold transition",
                  mode === "register"
                    ? "bg-[#00C16E] text-black shadow-lg shadow-[#00C16E]/20"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Inscription
              </button>
            </div>
          )}

          {/* Form */}
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              variants={containerVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              className="space-y-3"
            >
              {/* Back button for forgot/reset */}
              {(mode === "forgot" || mode === "reset") && (
                <motion.button
                  variants={itemVariants}
                  onClick={() => setMode("login")}
                  className="tap inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition mb-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Retour à la connexion
                </motion.button>
              )}

              {/* Name (register only) */}
              {mode === "register" && (
                <motion.div variants={itemVariants}>
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground ml-1">
                    Nom
                  </label>
                  <div className="mt-1">
                    <Field
                      icon={<UserIcon className="w-4 h-4" />}
                      value={name}
                      onChange={setName}
                      placeholder="Votre nom"
                      autoComplete="name"
                    />
                  </div>
                </motion.div>
              )}

              {/* Email (always shown) */}
              <motion.div variants={itemVariants}>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground ml-1">
                  Email
                </label>
                <div className="mt-1">
                  <Field
                    icon={<Mail className="w-4 h-4" />}
                    type="email"
                    value={email}
                    onChange={setEmail}
                    placeholder="vous@exemple.fr"
                    autoComplete="email"
                    inputMode="email"
                  />
                </div>
              </motion.div>

              {/* Phone (register only) */}
              {mode === "register" && (
                <motion.div variants={itemVariants}>
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground ml-1 flex items-center gap-1">
                    <Phone className="w-3 h-3" /> Téléphone (requis)
                  </label>
                  <div className="mt-1">
                    <Field
                      icon={<Phone className="w-4 h-4" />}
                      type="tel"
                      value={phone}
                      onChange={setPhone}
                      placeholder="+33612345678"
                      autoComplete="tel"
                      inputMode="tel"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 ml-1">
                    Format : 06XXXXXXXX, 07XXXXXXXX ou +336/7XXXXXXXX
                  </p>
                </motion.div>
              )}

              {/* Password (login + register) */}
              {(mode === "login" || mode === "register") && (
                <motion.div variants={itemVariants}>
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground ml-1">
                      Mot de passe
                    </label>
                    {mode === "login" && (
                      <button
                        type="button"
                        onClick={() => {
                          setResetCode("");
                          setNewPassword("");
                          setMode("forgot");
                        }}
                        className="text-[10px] text-[#00C16E] hover:text-[#00E58A] transition mr-1"
                      >
                        Mot de passe oublié ?
                      </button>
                    )}
                  </div>
                  <div className="mt-1">
                    <Field
                      icon={<Lock className="w-4 h-4" />}
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={setPassword}
                      placeholder={
                        mode === "register"
                          ? "Au moins 6 caractères"
                          : "Votre mot de passe"
                      }
                      autoComplete={
                        mode === "register"
                          ? "new-password"
                          : "current-password"
                      }
                      rightSlot={
                        <button
                          type="button"
                          onClick={() => setShowPassword((s) => !s)}
                          className="tap p-1 -m-1 hover:text-foreground transition"
                          aria-label={
                            showPassword
                              ? "Masquer le mot de passe"
                              : "Afficher le mot de passe"
                          }
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      }
                    />
                  </div>
                </motion.div>
              )}

              {/* Reset code */}
              {mode === "reset" && (
                <motion.div variants={itemVariants}>
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground ml-1 flex items-center gap-1">
                    <KeyRound className="w-3 h-3" /> Code à 6 chiffres
                  </label>
                  <div className="mt-1">
                    <Field
                      icon={<KeyRound className="w-4 h-4" />}
                      value={resetCode}
                      onChange={(v) =>
                        setResetCode(v.replace(/\D/g, "").slice(0, 6))
                      }
                      placeholder="123456"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                    />
                  </div>
                </motion.div>
              )}

              {/* New password */}
              {mode === "reset" && (
                <motion.div variants={itemVariants}>
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground ml-1">
                    Nouveau mot de passe
                  </label>
                  <div className="mt-1">
                    <Field
                      icon={<Lock className="w-4 h-4" />}
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={setNewPassword}
                      placeholder="Au moins 6 caractères"
                      autoComplete="new-password"
                      rightSlot={
                        <button
                          type="button"
                          onClick={() => setShowNewPassword((s) => !s)}
                          className="tap p-1 -m-1 hover:text-foreground transition"
                          aria-label={
                            showNewPassword
                              ? "Masquer le mot de passe"
                              : "Afficher le mot de passe"
                          }
                        >
                          {showNewPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      }
                    />
                  </div>
                </motion.div>
              )}

              {/* Submit button */}
              <motion.div variants={itemVariants} className="pt-1">
                <button
                  onClick={
                    mode === "login"
                      ? handleLogin
                      : mode === "register"
                      ? handleRegister
                      : mode === "forgot"
                      ? handleForgot
                      : handleReset
                  }
                  disabled={submitting}
                  className="tap w-full h-12 rounded-2xl bg-[#00C16E] text-black font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#00C16E]/30 disabled:opacity-60 disabled:pointer-events-none"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : mode === "login" ? (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      Se connecter
                    </>
                  ) : mode === "register" ? (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Créer mon compte
                    </>
                  ) : mode === "forgot" ? (
                    <>
                      <Mail className="w-4 h-4" />
                      Envoyer le code
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      Réinitialiser
                    </>
                  )}
                </button>
              </motion.div>

              {/* No demo account on this app */}
            </motion.div>
          </AnimatePresence>
        </motion.div>

        <p className="text-center text-[10px] text-muted-foreground mt-4 leading-relaxed">
          En continuant, vous acceptez nos conditions d&apos;utilisation et
          notre politique de confidentialité.
        </p>
      </div>
    </div>
  );
}
