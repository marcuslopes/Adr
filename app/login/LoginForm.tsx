"use client";

import { signIn } from "next-auth/react";
import { Github } from "lucide-react";
import { useState } from "react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleGithub() {
    setLoading(true);
    await signIn("github", { callbackUrl: "/projects" });
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await signIn("email", { email, callbackUrl: "/projects", redirect: false });
    setEmailSent(true);
    setLoading(false);
  }

  if (emailSent) {
    return (
      <div className="text-center py-6">
        <div className="text-2xl mb-2">📬</div>
        <p className="font-medium text-gray-800">Check your inbox</p>
        <p className="text-sm text-gray-500 mt-1">
          We sent a magic link to <strong>{email}</strong>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        onClick={handleGithub}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors disabled:opacity-60"
      >
        <Github className="w-5 h-5" />
        Continue with GitHub
      </button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-3 text-gray-400">or</span>
        </div>
      </div>

      <form onSubmit={handleEmail} className="space-y-3">
        <input
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
        <button
          type="submit"
          disabled={loading || !email}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
        >
          Send magic link
        </button>
      </form>
    </div>
  );
}
