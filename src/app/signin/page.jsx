import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, KeyRound, ArrowRight, Loader2 } from "lucide-react";
import TextInput from "@/components/auth/TextInput";
import Button from "@/components/auth/Button";
import {
  useSendOtpMutation,
  useVerifyOtpMutation,
  useLazyGetMeQuery,
} from "@/store/api/authApi";

/* API BASE for Google OAuth redirect - Hardcoded below */

const Signin = () => {
  const navigate = useNavigate();

  const [sendOtp, { isLoading: sendingOtp }] = useSendOtpMutation();
  const [verifyOtp, { isLoading: verifyingOtp }] = useVerifyOtpMutation();
  const [triggerGetMe] = useLazyGetMeQuery();

  const [step, setStep] = useState("email"); // email | otp
  const [formData, setFormData] = useState({
    email: "",
    otp: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  /* ---------- SEND OTP ---------- */
  const handleSendOtp = async (e) => {
    e.preventDefault();
    try {
      await sendOtp({ email: formData.email }).unwrap();
      alert("OTP sent to your email");
      setStep("otp");
    } catch (error) {
      alert(error?.data?.message || "Failed to send OTP");
    }
  };

  /* ---------- VERIFY OTP ---------- */
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    try {
      await verifyOtp(formData).unwrap();

      // Now confirm login via cookie
      const me = await triggerGetMe().unwrap();

      localStorage.setItem("user", JSON.stringify(me.user || me));

      navigate("/");
    } catch (error) {
      alert("Login failed");
    }
  };

  /* ---------- GOOGLE LOGIN ---------- */
  const loginWithGoogle = () => {
    console.log("Initiating Google Login...");
    window.location.href = "https://accomodation.api.test.nextkinlife.live/auth/google";
  };

  return (
    <div className="min-h-screen w-full bg-white overflow-hidden">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full h-full min-h-screen grid grid-cols-1 lg:grid-cols-2"
      >
        {/* Left Side */}
        <div className="hidden lg:flex flex-col justify-center items-center p-12 bg-primary relative overflow-hidden h-full">
          <div className="relative z-10 flex flex-col items-center text-center max-w-lg">
            <div className="w-70 h-50 rounded-3xl overflow-hidden shadow-2xl mb-8">
              <img
                src="/logo2.png"
                alt="NextKinLife Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-gray-300 text-xl leading-relaxed">
              Access your personalized dashboard and stay connected.
            </p>
          </div>
        </div>

        {/* Right Side */}
        <div className="w-full bg-gray-50 flex flex-col justify-center items-center px-4 py-8 md:p-12 min-h-full overflow-y-auto">
          <div className="w-full max-w-sm mx-auto py-8">
            <div className="text-center mb-8 lg:hidden">
              <div className="w-16 h-16 rounded-xl overflow-hidden shadow-lg mx-auto mb-4">
                <img
                  src="/logo.jpeg"
                  alt="NextKinLife Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                {step === "email" ? "Sign In" : "Verify OTP"}
              </h2>
            </div>

            <div className="hidden lg:block mb-8 text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {step === "email" ? "Sign In" : "Verify OTP"}
              </h2>
              <p className="text-gray-500">
                {step === "email"
                  ? "Enter your email to receive OTP"
                  : "Enter the OTP sent to your email"}
              </p>
            </div>

            {/* Google Login Button - Anchor Tag Fallback */}
            <a
              href="https://accomodation.api.test.nextkinlife.live/auth/google"
              className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-lg py-3 bg-white hover:bg-gray-100 transition mb-6 cursor-pointer"
            >
              {/* Using inline SVG for Google icon instead of external file */}
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              <span className="font-medium text-gray-700">
                Continue with Google
              </span>
            </a>

            <div className="flex items-center gap-2 mb-6">
              <div className="flex-1 h-px bg-gray-300" />
              <span className="text-sm text-gray-400">OR</span>
              <div className="flex-1 h-px bg-gray-300" />
            </div>

            {/* EMAIL STEP */}
            {step === "email" && (
              <form onSubmit={handleSendOtp} className="space-y-6">
                <TextInput
                  label="Email Address"
                  name="email"
                  type="email"
                  placeholder="john@example.com"
                  icon={Mail}
                  value={formData.email}
                  onChange={handleChange}
                  className="bg-white"
                  required
                />

                <Button
                  type="submit"
                  disabled={sendingOtp}
                  className="mt-4 w-full py-3 text-base"
                >
                  {sendingOtp ? (
                    <>
                      <Loader2 className="animate-spin h-5 w-5" />
                      Sending OTP...
                    </>
                  ) : (
                    <>
                      Send OTP <ArrowRight size={20} />
                    </>
                  )}
                </Button>
              </form>
            )}

            {/* OTP STEP */}
            {step === "otp" && (
              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <TextInput
                  label="OTP"
                  name="otp"
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  icon={KeyRound}
                  value={formData.otp}
                  onChange={handleChange}
                  className="bg-white"
                  required
                />

                <Button
                  type="submit"
                  disabled={verifyingOtp}
                  className="mt-4 w-full py-3 text-base"
                >
                  {verifyingOtp ? (
                    <>
                      <Loader2 className="animate-spin h-5 w-5" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      Verify & Sign In <ArrowRight size={20} />
                    </>
                  )}
                </Button>

                <button
                  type="button"
                  onClick={() => setStep("email")}
                  className="text-sm text-blue-600 hover:underline w-full text-center"
                >
                  Change Email
                </button>
              </form>
            )}

            <div className="text-center mt-8">
              <p className="text-sm text-gray-500">
                Don&apos;t have an account?{" "}
                <Link
                  to="/signup"
                  className="font-semibold text-blue-600 hover:underline"
                >
                  Create an account
                </Link>
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Signin;