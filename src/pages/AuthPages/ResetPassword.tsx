import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import { ChevronLeftIcon } from "../../icons";
import { AuthService } from "../../services/authService";
import { ApiError } from "../../lib/apiError";

type Step = "request" | "reset" | "done";

// ApiResponse::exceptionError() (backend) puts the raw \Throwable message
// into the `error` field for any unhandled server-side exception — useful in
// server logs, never safe to show an anonymous caller on a public route like
// this one. Neither requestReset() nor confirmReset() calls
// ApiResponse::serverError() directly, so within this flow a 500 can only
// come from that raw-message path; every other status (400/403/422/429)
// comes from ApiResponse::error()/validationError(), whose messages are
// always deliberately authored for display.
const safeErrorMessage = (err: ApiError): string =>
  err.status === 500 ? "Something went wrong on our end. Please try again later." : err.message;

/** "90" -> "2 minutes", "3700" -> "1 hour 2 minutes". Used to turn the 429's retryAfterSeconds into copy a user can act on instead of a generic failure message. */
const formatRetryAfter = (totalSeconds: number): string => {
  const seconds = Math.max(1, Math.ceil(totalSeconds));
  if (seconds < 60) {
    return `${seconds} second${seconds === 1 ? "" : "s"}`;
  }
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  const hoursPart = `${hours} hour${hours === 1 ? "" : "s"}`;
  return remainingMinutes === 0
    ? hoursPart
    : `${hoursPart} ${remainingMinutes} minute${remainingMinutes === 1 ? "" : "s"}`;
};

export default function ResetPassword() {
  // The emailed reset link lands here with ?token=... already set — jump
  // straight to the "set new password" step instead of showing the "enter
  // your email" form again (which would require the user to notice a
  // separate token field and copy-paste from the email manually).
  const [searchParams] = useSearchParams();
  const tokenFromLink = searchParams.get("token") ?? "";
  const [step, setStep] = useState<Step>(tokenFromLink ? "reset" : "request");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState(tokenFromLink);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await AuthService.requestPasswordReset(email);
      setStep("reset");
    } catch (err) {
      // ApiError.message already carries the server's real {error} string
      // (e.g. "CSRF validation failed", "Password change required before
      // continuing", "A valid email address is required") — showing a
      // hardcoded string here instead of that message is exactly why the UI
      // used to look "always broken" for every failure reason alike, with no
      // way to tell a rate limit apart from a validation error apart from a
      // genuine outage. Only a non-ApiError (network/timeout/parse failure,
      // where there's no server message to show) falls back to generic copy.
      if (err instanceof ApiError && err.status === 429) {
        const retryAfterSeconds = (err.details as { retryAfterSeconds?: number } | undefined)?.retryAfterSeconds;
        setError(
          typeof retryAfterSeconds === "number"
            ? `Too many reset requests. Please try again in ${formatRetryAfter(retryAfterSeconds)}.`
            : safeErrorMessage(err)
        );
      } else if (err instanceof ApiError) {
        setError(safeErrorMessage(err));
      } else {
        setError("Failed to send reset link. Please check your connection and try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
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

    setIsLoading(true);
    try {
      await AuthService.confirmPasswordReset(token, newPassword);
      setStep("done");
    } catch (err) {
      // Same reasoning as handleRequestReset: show the server's actual
      // reason (e.g. a password-policy validation message) instead of
      // always blaming the token.
      setError(err instanceof ApiError ? safeErrorMessage(err) : "Invalid or expired reset token.");
    } finally {
      setIsLoading(false);
    }
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
                    Enter the reset token from your email and choose a new password.
                  </p>
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
                      placeholder="Paste the token from your email"
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
                    disabled={isLoading}
                    className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white transition rounded-lg bg-brand-500 shadow-theme-xs hover:bg-brand-600 disabled:opacity-50"
                  >
                    {isLoading ? "Resetting..." : "Reset Password"}
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
