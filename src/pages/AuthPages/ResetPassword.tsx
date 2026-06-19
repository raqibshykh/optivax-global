import React, { useState } from "react";
import { Link } from "react-router-dom";
import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import { ChevronLeftIcon } from "../../icons";
import { mockUsers } from "../../mock/users";

type Step = "request" | "reset" | "done";

export default function ResetPassword() {
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRequestReset = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    setTimeout(() => {
      const user = mockUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (!user) {
        setError("No account found with that email address.");
        setIsLoading(false);
        return;
      }
      // Store mock reset token in localStorage
      const mockToken = `RESET-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      localStorage.setItem("mock_reset_token", JSON.stringify({ token: mockToken, email, expires: Date.now() + 15 * 60 * 1000 }));
      setToken(mockToken);
      setStep("reset");
      setIsLoading(false);
    }, 800);
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const stored = localStorage.getItem("mock_reset_token");
    if (!stored) {
      setError("Reset token expired. Please request a new one.");
      return;
    }

    const parsed = JSON.parse(stored);
    if (parsed.token !== token || parsed.email !== email || Date.now() > parsed.expires) {
      setError("Invalid or expired reset token.");
      return;
    }

    // In mock mode, just update the password in localStorage profiles
    const profiles = JSON.parse(localStorage.getItem("mock_profiles") || "[]");
    const updated = profiles.map((p: { email: string }) =>
      p.email === email ? { ...p, password: newPassword } : p
    );
    localStorage.setItem("mock_profiles", JSON.stringify(updated));
    localStorage.removeItem("mock_reset_token");

    setStep("done");
  };

  return (
    <>
      <PageMeta title="Reset Password | Optivax Global" description="Reset your Optivax Global account password" />
      <AuthLayout>
        <div className="flex flex-col flex-1 w-full overflow-y-auto lg:w-1/2 no-scrollbar">
          <div className="w-full max-w-md mx-auto mb-5 sm:pt-10">
            <Link
              to="/login"
              className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <ChevronLeftIcon className="size-5" />
              Back to Sign In
            </Link>
          </div>

          <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
            {step === "request" && (
              <div>
                <div className="mb-5 sm:mb-8">
                  <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
                    Forgot Password?
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Enter your email address and we'll send you a reset link.
                  </p>
                </div>
                <form onSubmit={handleRequestReset} className="space-y-5">
                  {error && (
                    <div className="p-3 text-sm text-red-500 bg-red-50 rounded-lg dark:bg-red-500/10 dark:text-red-400">
                      {error}
                    </div>
                  )}
                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white transition rounded-lg bg-brand-500 shadow-theme-xs hover:bg-brand-600 disabled:opacity-50"
                  >
                    {isLoading ? "Sending..." : "Send Reset Link"}
                  </button>
                </form>
              </div>
            )}

            {step === "reset" && (
              <div>
                <div className="mb-5 sm:mb-8">
                  <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
                    Set New Password
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Enter your reset token and choose a new password.
                  </p>
                  <div className="mt-3 p-3 bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-lg">
                    <p className="text-xs text-brand-700 dark:text-brand-300 font-medium">Mock Reset Token:</p>
                    <p className="text-xs font-mono text-brand-600 dark:text-brand-400 mt-0.5 break-all">{token}</p>
                  </div>
                </div>
                <form onSubmit={handleResetPassword} className="space-y-5">
                  {error && (
                    <div className="p-3 text-sm text-red-500 bg-red-50 rounded-lg dark:bg-red-500/10 dark:text-red-400">
                      {error}
                    </div>
                  )}
                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Reset Token
                    </label>
                    <input
                      type="text"
                      required
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-mono text-gray-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                      New Password
                    </label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat your new password"
                      className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    />
                  </div>
                  <button
                    type="submit"
                    className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white transition rounded-lg bg-brand-500 shadow-theme-xs hover:bg-brand-600"
                  >
                    Reset Password
                  </button>
                </form>
              </div>
            )}

            {step === "done" && (
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90">
                  Password Reset!
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  Your password has been updated successfully. You can now sign in.
                </p>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-white transition rounded-lg bg-brand-500 hover:bg-brand-600"
                >
                  Go to Sign In
                </Link>
              </div>
            )}
          </div>
        </div>
      </AuthLayout>
    </>
  );
}
