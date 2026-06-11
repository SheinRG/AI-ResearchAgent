"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { useAuth } from "@/hooks/useAuth";
import ThemeToggle from "@/components/ThemeToggle";
import { LogoMark } from "@/components/Icons";

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

    let result;
    if (isLogin) {
      result = await login(email, password);
    } else {
      result = await register(email, password, name);
    }

    if (result.success) {
      router.push("/");
    } else {
      setError(result.error);
    }
  };

  if (isLoading && isAuthenticated) return null; // Wait for redirect

  return (
    <>
      <nav className="navbar">
        <a href="/" className="navbar-brand">
          <span className="navbar-brand-icon">
            <LogoMark size={24} />
          </span>
          <span className="brand-text">
            aura<span className="wordmark-accent">.ai</span>
          </span>
        </a>
        <div className="navbar-actions">
          <ThemeToggle />
        </div>
      </nav>

      <main className="main-content login-page">
        <motion.div 
          className="login-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="login-logo">
            <LogoMark size={40} />
          </div>
          <h1 className="login-title">{isLogin ? "Welcome back" : "Create account"}</h1>
          <p className="login-subtitle">
            {isLogin ? "Log in to view your research history." : "Sign up to start researching."}
          </p>

          <div id="google-signin-btn" className="login-button-google-wrapper"></div>
          
          <div className="login-divider">
            <span>or continue with email</span>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            {error && <div className="login-error">{error}</div>}
            
            {!isLogin && (
              <div className="login-field">
                <label className="login-label" htmlFor="name">Name</label>
                <input 
                  className="login-input" 
                  type="text" 
                  id="name" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe" 
                />
              </div>
            )}
            
            <div className="login-field">
              <label className="login-label" htmlFor="email">Email</label>
              <input 
                className="login-input" 
                type="email" 
                id="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com" 
              />
            </div>
            
            <div className="login-field">
              <label className="login-label" htmlFor="password">Password</label>
              <input 
                className="login-input" 
                type="password" 
                id="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" 
              />
            </div>
            
            <button className="login-button" type="submit" disabled={isLoading}>
              {isLoading ? "Please wait..." : (isLogin ? "Sign In" : "Sign Up")}
            </button>
          </form>

          <div className="login-toggle">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button type="button" onClick={() => { setIsLogin(!isLogin); setError(""); }}>
              {isLogin ? "Sign up" : "Log in"}
            </button>
          </div>
        </motion.div>
      </main>
    </>
  );
}
