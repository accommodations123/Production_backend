import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import { allowedOrigins } from "../config/origins.js";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";

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

  if (process.env.USE_REDIS === "true") {
    try {
      const host = process.env.REDIS_HOST || "127.0.0.1";
      const port = parseInt(process.env.REDIS_PORT, 10) || 6379;

      console.log(`🔌 Initializing Socket.IO Redis Adapter on ${host}:${port}...`);

      const pubClient = new Redis({ host, port });
      const subClient = pubClient.duplicate();

      pubClient.on("error", (err) => {
        console.error("❌ Socket.IO Pub Redis client error:", err.message);
      });
      subClient.on("error", (err) => {
        console.error("❌ Socket.IO Sub Redis client error:", err.message);
      });

      io.adapter(createAdapter(pubClient, subClient));
      console.log("✅ Socket.IO Redis horizontal scaling adapter activated.");
    } catch (adapterErr) {
      console.error("❌ Failed to activate Socket.IO Redis adapter:", adapterErr.message);
    }
  } else {
    console.log("🔌 Socket.IO running directly (No Redis horizontal scaling adapter configured)");
  }

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
