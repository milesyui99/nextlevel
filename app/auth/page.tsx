"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  async function handleSignUp() {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      alert(error.message);
    } else {
      alert("Check your email to confirm signup.");
    }
  }

  async function handleLogin() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
    } else {
      router.push("/");
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white">
      <h1 className="text-2xl mb-4">NextLevel</h1>

      <input
  className="p-2 mb-2 w-72 rounded bg-white text-black"
  placeholder="Email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
/>


      <input
  className="p-2 mb-4 w-72 rounded bg-white text-black"
  placeholder="Password"
  type="password"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
/>


      <button
        onClick={handleSignUp}
        className="bg-blue-500 px-4 py-2 mb-2"
      >
        Sign Up
      </button>

      <button
        onClick={handleLogin}
        className="bg-gray-600 px-4 py-2"
      >
        Login
      </button>
    </div>
  );
}
