import React from "react";
import PageMeta from "../../components/common/PageMeta";

export default function ResetPassword() {
  return (
    <div className="max-w-md mx-auto p-6">
      <PageMeta title="Reset Password" description="Reset your account password" />
      <h2 className="text-xl font-semibold mb-4">Reset Password</h2>
      <p className="text-sm text-gray-600 mb-4">Enter your email to receive a password reset link.</p>
      <form onSubmit={(e) => { e.preventDefault(); alert('Password reset link sent (mock)'); }} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input type="email" required className="w-full rounded-lg border border-gray-300 p-2 text-sm" />
        </div>
        <button type="submit" className="w-full bg-brand-500 hover:bg-brand-600 text-white font-medium py-2 px-4 rounded-lg">Send Reset Link</button>
      </form>
    </div>
  );
}
