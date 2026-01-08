import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import cookie from "cookie";

let io;

export const initSocket = (server) => {
  const socketAllowedOrigins = [
    "https://accomodation.test.nextkinlife.live",
    "https://accomodation.admin.test.nextkinlife.live",
    "https://admin.test.nextkinlife.live",
    "http://localhost:5173"
  ];

  io = new Server(server, {
    cors: {
      origin: socketAllowedOrigins,
      credentials: true  // Important: Allow credentials
    }
  });

  // Authenticate socket using HttpOnly cookie
  io.use(async (socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie;
      if (!cookieHeader) {
        return next(new Error("Authentication required"));
      }

      const cookies = cookie.parse(cookieHeader);
      const token = cookies.access_token;

      if (!token) {
        return next(new Error("Authentication required"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Add user info to socket
      socket.user = {
        id: decoded.id,
        role: decoded.role
      };

      next();
    } catch (err) {
      console.error("SOCKET AUTH ERROR:", err.message);
      next(new Error("Invalid or expired session"));
    }
  });

  io.on("connection", (socket) => {
    console.log("📡 Socket connected:", socket.user.id);
    
    // Join user-specific room for notifications
    socket.join(`user:${socket.user.id}`);

    socket.on("disconnect", () => {
      console.log("🔌 Socket disconnected:", socket.user.id);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
};