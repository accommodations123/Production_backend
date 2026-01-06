// In your server's initSocket.js file - REPLACE EVERYTHING WITH THIS

import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import cookie from "cookie";

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: ["https://accomodation.test.nextkinlife.live", "http://localhost:5173"],
      credentials: true
    }
  });

  // 🔐 Authenticate socket using token from auth object OR cookie
  io.use((socket, next) => {
    try {
      let token = null;

      // 1. First, try to get the token from the `auth` object sent by the client
      if (socket.handshake.auth && socket.handshake.auth.token) {
        token = socket.handshake.auth.token;
      }

      // 2. If no token in auth, fallback to checking for a cookie (for other requests)
      const cookieHeader = socket.handshake.headers.cookie;
      if (!token && cookieHeader) {
        const cookies = cookie.parse(cookieHeader);
        token = cookies.access_token;
      }

      // 3. If no token was found in either place, reject the connection
      if (!token) {
        return next(new Error("Auth token missing from auth and cookie"));
      }

      // 4. Verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      socket.user = {
        id: decoded.id,
        role: decoded.role
      };

      return next();
    } catch (err) {
      console.error("❌ Socket middleware: Error verifying token:", err.message);
      return next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    console.log("✅ Socket connected:", socket.id, "User:", socket.user.id);

    // ✅ auto-join user room securely
    socket.join(`user:${socket.user.id}`);

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
};