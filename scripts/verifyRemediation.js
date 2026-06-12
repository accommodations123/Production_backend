import dotenv from "dotenv";
dotenv.config();

import dynamoose from "../config/db.js";
import User from "../model/User.js";
import Admin from "../model/Admin.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// Mock Math.random so that generateOTP() returns a predictable code "550000"
const originalRandom = Math.random;
Math.random = () => 0.5;

// Mock req and res objects for Express-like environment
function createMockRes() {
  const res = {
    statusCod: 200,
    headers: {},
    cookies: {},
    body: null,
    status(code) {
      this.statusCod = code;
      return this;
    },
    json(obj) {
      this.body = obj;
      return this;
    },
    cookie(name, value, options) {
      this.cookies[name] = { value, options };
      return this;
    },
    clearCookie(name, options) {
      delete this.cookies[name];
      return this;
    }
  };
  return res;
}

async function runTests() {
  console.log("=== NEXTKINLIFE SECURITY REMEDIATION VERIFICATION ===\n");

  const testEmail = "test_verification_user@nextkinlife.com";

  // Clean up any existing user
  console.log("Cleaning up existing test user if any...");
  const existingUsers = await User.query("email").eq(testEmail).exec();
  for (const u of existingUsers) {
    await User.delete(u.id);
  }

  // 1. Create a verified user
  console.log("1. Creating verified user...");
  let user = await User.create({
    email: testEmail,
    verified: true,
    token_version: 0
  });
  console.log(`User created: ID=${user.id}, email=${user.email}, verified=${user.verified}, token_version=${user.token_version}`);

  // Import controller methods dynamically
  const { sendOTP, verifyOTP, logout } = await import("../controllers/otp.controller.js");

  // 2. Test OTP Send Cycle
  console.log("\n2. Testing Send OTP to already-verified user...");
  const sendReq = {
    body: { email: testEmail },
    headers: {},
    ip: "127.0.0.1"
  };
  const sendRes = createMockRes();
  await sendOTP(sendReq, sendRes);
  console.log("Send OTP response status:", sendRes.statusCod);
  console.log("Send OTP response body:", sendRes.body);

  // Refetch user to get the hashed OTP
  user = await User.get(user.id);
  console.log(`Hashed OTP in DB: ${user.otp}`);
  console.log(`OTP Expires: ${user.otp_expires}`);
  console.log(`OTP Attempts: ${user.otp_attempts}`);

  if (!user.otp || user.otp_attempts !== 0) {
    throw new Error("Failed to initialize OTP or reset otp_attempts on send!");
  }
  console.log("✅ Send OTP initialized correctly.");

  // 3. Test OTP lockout (5 failed attempts)
  console.log("\n3. Testing OTP failed attempt tracking and lockout...");
  for (let i = 1; i <= 5; i++) {
    const verifyReq = {
      body: { email: testEmail, otp: "999999" }, // wrong OTP
      headers: {},
      ip: "127.0.0.1"
    };
    const verifyRes = createMockRes();
    await verifyOTP(verifyReq, verifyRes);

    user = await User.get(user.id);
    console.log(`Attempt ${i} -> Response Status: ${verifyRes.statusCod}, Msg: "${verifyRes.body.message}"`);
    console.log(`Current DB otp_attempts: ${user.otp_attempts}`);

    if (i < 5) {
      if (user.otp_attempts !== i) {
        throw new Error(`Expected otp_attempts to be ${i}, got ${user.otp_attempts}`);
      }
    } else {
      // 5th attempt must clear OTP and block
      if (user.otp) {
        throw new Error("OTP should have been deleted/invalidated in DB upon 5th failure!");
      }
      console.log("✅ DB verified: OTP destroyed after 5 failures.");
    }
  }

  // Verify that another check yields lockout immediately
  const lockedReq = {
    body: { email: testEmail, otp: "123456" },
    headers: {},
    ip: "127.0.0.1"
  };
  const lockedRes = createMockRes();
  await verifyOTP(lockedReq, lockedRes);
  console.log(`Subsequent check status: ${lockedRes.statusCod}, Msg: "${lockedRes.body.message}"`);
  if (lockedRes.statusCod !== 429) {
    throw new Error("Expected 429 response status after account lock.");
  }
  console.log("✅ Verify OTP lockout 429 response is active.");

  // 4. Test normal send-otp -> verify-otp cycle (no dead-end)
  console.log("\n4. Testing fresh OTP cycle for user...");
  const sendReq2 = {
    body: { email: testEmail },
    headers: {},
    ip: "127.0.0.1"
  };
  const sendRes2 = createMockRes();
  await sendOTP(sendReq2, sendRes2);

  // Since we stubbed Math.random, the generated OTP is exactly "550000"
  const correctOtp = "550000";
  console.log(`Using predictable generated OTP: ${correctOtp}`);

  // Call verifyOTP with the correct OTP
  const successReq = {
    body: { email: testEmail, otp: correctOtp },
    headers: {},
    ip: "127.0.0.1"
  };
  const successRes = createMockRes();
  await verifyOTP(successReq, successRes);
  console.log(`Verification Response Status: ${successRes.statusCod}, Msg: "${successRes.body.message}"`);
  if (successRes.statusCod !== 200) {
    throw new Error(`Expected successful verification, got status ${successRes.statusCod}`);
  }

  user = await User.get(user.id);
  console.log(`User state after verification: verified=${user.verified}, otp_attempts=${user.otp_attempts}, otp=${user.otp}`);
  if (user.otp_attempts !== 0 || user.otp !== undefined) {
    throw new Error("Verification did not reset otp_attempts or clear otp from DB!");
  }
  console.log("✅ Success verify cycle tested.");

  // Get cookie token and test session version check
  const tokenCookie = successRes.cookies["access_token"];
  if (!tokenCookie) {
    throw new Error("No access_token cookie was set on successful verification!");
  }
  const token = tokenCookie.value;
  console.log(`Issued Access Token: ${token.slice(0, 30)}...`);

  // Decode and check token payload
  const decoded = jwt.decode(token);
  console.log("Decoded JWT payload:", decoded);
  if (decoded.token_version !== 0) {
    throw new Error(`Expected token_version to be 0, got ${decoded.token_version}`);
  }

  // 5. Test JWT Logout/Revocation
  console.log("\n5. Testing logout session invalidation...");
  const userAuth = await import("../middleware/userAuth.js");
  
  // Test authentication middleware with valid token
  const authReq = {
    cookies: { access_token: token },
    headers: {}
  };
  let isAuthorized = false;
  const authNext = () => { isAuthorized = true; };
  const authRes = createMockRes();
  
  await userAuth.default(authReq, authRes, authNext);
  console.log(`Initial auth validation: ${isAuthorized ? "✅ AUTHORIZED (PASS)" : "❌ REJECTED"}`);
  if (!isAuthorized) throw new Error("Auth middleware rejected valid token!");

  // Call logout to increment version
  console.log("Logging out user...");
  const logoutReq = {
    cookies: { access_token: token },
    headers: {},
    auditActor: { id: user.id, role: "user" },
    user: { id: user.id }
  };
  const logoutRes = createMockRes();
  await logout(logoutReq, logoutRes);
  console.log(`Logout Response status: ${logoutRes.statusCod}`);

  // Refetch user to verify token_version incremented
  user = await User.get(user.id);
  console.log(`New DB token_version: ${user.token_version}`);
  if (user.token_version !== 1) {
    throw new Error(`Expected token_version to increment to 1, got ${user.token_version}`);
  }

  // Re-run authentication middleware with the stale token
  isAuthorized = false;
  const reauthReq = {
    cookies: { access_token: token },
    headers: {}
  };
  const reauthRes = createMockRes();
  await userAuth.default(reauthReq, reauthRes, authNext);
  console.log(`Post-logout re-auth status response: ${reauthRes.statusCod}, body:`, reauthRes.body);
  if (isAuthorized) {
    throw new Error("Stale token was accepted after user logout!");
  }
  console.log("✅ Stale token successfully rejected by userAuth middleware.");

  // Clean up
  console.log("\nCleaning up test user...");
  await User.delete(user.id);
  console.log("Cleanup complete.");

  console.log("\n=================== ALL TESTS PASSED! ===================");
  process.exit(0);
}

runTests().catch(err => {
  console.error("\n❌ VERIFICATION TEST FAILED:");
  console.error(err);
  process.exit(1);
});
