import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import { allowedOrigins } from "../config/origins.js";

let io;

/* =========================================================
   INITIALIZE SOCKET.IO
========================================================= */
export const initSocket = async (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true
    },

    // ✅ Production-safe transport strategy
    transports: ["websocket", "polling"],
    upgrade: true,

    // Avoid long-hanging dead connections
    pingInterval: 25000,
    pingTimeout: 20000
  });
  console.log("🔌 Socket.IO running directly (Redis horizontal scaling adapter removed)");

  /* =========================================================
     SOCKET AUTH MIDDLEWARE
  ========================================================= */
  io.use((socket, next) => {
    try {
      let token = socket.handshake.auth?.token;

      // 🔐 Cookie fallback (browser clients)
      if (!token && socket.handshake.headers.cookie) {
        const cookies = cookie.parse(socket.handshake.headers.cookie);
        token = cookies.access_token;
      }

      if (!token) {
        return next(new Error("Authentication token missing"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 🔒 Hard role validation
      if (!["user", "admin"].includes(decoded.role)) {
        return next(new Error("Invalid role"));
      }

      socket.user = {
        id: decoded.id,
        role: decoded.role
      };

      next();
    } catch (err) {
      console.error("❌ Socket auth error:", err.message);
      next(new Error("Authentication failed"));
    }
  });

  /* =========================================================
     CONNECTION HANDLER
  ========================================================= */
  io.on("connection", (socket) => {
    const userId = socket.user?.id;

    if (userId) {
      const room = `user:${userId}`;
      socket.join(room);

      console.log(
        `📡 Socket connected | user:${userId} | socket:${socket.id}`
      );
    }

    socket.on("disconnect", (reason) => {
      console.log(
        `🔌 Socket disconnected | socket:${socket.id} | reason:${reason}`
      );
    });
  });

  return io;
};

/* =========================================================
   SAFE ACCESSOR
========================================================= */
export const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO not initialized");
  }
  return io;
};
