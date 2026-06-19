"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { useAuth } from "@/hooks/useAuth";
import ThemeToggle from "@/components/ThemeToggle";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const { login, register, loginWithGoogle, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    // Load Google Identity Services script
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    window.handleGoogleCredentialResponse = async (response) => {
      setError("");
      const result = await loginWithGoogle(response.credential);
      if (result.success) {
        router.push("/");
      } else {
        setError(result.error);
      }
    };

    script.onload = () => {
      if (window.google && process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
        window.google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
          callback: window.handleGoogleCredentialResponse,
          context: "signin",
          ux_mode: "popup",
        });
        window.google.accounts.id.renderButton(
          document.getElementById("google-signin-btn"),
          { type: "standard", theme: "outline", size: "large", width: "100%" }
        );
      }
    };

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
      delete window.handleGoogleCredentialResponse;
    };
  }, [loginWithGoogle, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password || (!isLogin && !name)) {
      setError("Please fill in all fields.");
      return;
    }

    const result = isLogin
      ? await login(email, password)
      : await register(email, password, name);

    if (result.success) {
      router.push("/");
    } else {
      setError(result.error);
    }
  };

  if (isLoading && isAuthenticated) return null; // Wait for redirect

  const hasGoogle = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

  return (
    <main className="login-page">
      <div className="login-theme-toggle">
        <ThemeToggle showLabel />
      </div>

      <motion.div
        className="login-card"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55 }}
      >
        <div className="login-brand">
          goon<span className="wordmark-accent">.ai</span>
        </div>

        <h1 className="login-title">
          {isLogin ? "Ask better" : "Start asking"}
          <br />
          <span className="login-title-em">
            {isLogin ? "questions." : "better."}
          </span>
        </h1>
        <p className="login-subtitle">
          A research agent that plans, searches the web, reads the sources, and
          writes you a cited answer.
        </p>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && <div className="login-error">{error}</div>}

          {!isLogin && (
            <input
              className="login-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              aria-label="Name"
            />
          )}

          <input
            className="login-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@work.com"
            aria-label="Email"
          />
          <input
            className="login-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            aria-label="Password"
          />
          <button className="login-button" type="submit" disabled={isLoading}>
            {isLoading ? "Please wait…" : "Continue"}
          </button>
        </form>

        <div className="login-divider">
          <span>or</span>
        </div>

        {/* Real Google button mounts here when configured; the static fallback
            keeps the layout intact (and triggers email/password) otherwise. */}
        <div id="google-signin-btn" className="login-google-wrapper" />
        {!hasGoogle && (
          <button
            type="button"
            className="login-google-fallback"
            onClick={() => setError("Configure Google sign-in or use email above.")}
          >
            <span className="g-mark">G</span>
            Continue with Google
          </button>
        )}

        <div className="login-toggle">
          {isLogin ? "New here? " : "Already have an account? "}
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
            }}
          >
            {isLogin ? "Create an account" : "Log in"}
          </button>
        </div>

        <p className="login-fineprint">
          By continuing you agree to the terms. This is a research prototype.
        </p>
      </motion.div>
    </main>
  );
}
