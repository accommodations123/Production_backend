import { Server } from "socket.io";
import cookie from "cookie";

let io;

export const initSocket = (server) => {
  const socketAllowedOrigins = [
    "https://accomodation.test.nextkinlife.live",
    "https://accomodation.admin.test.nextkinlife.live",
    "https://admin.test.nextkinlife.live",
    "http://localhost:5173",
    "http://localhost:5000"
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
    const sessionId = cookies.session_id;

    if (!sessionId) {
      return next(new Error("Authentication required"));
    }

    const session = await redis.get(`session:${sessionId}`);
    if (!session) {
      return next(new Error("Session expired"));
    }

    const data = JSON.parse(session);

    socket.user = {
      id: data.userId,
      role: data.role
    };

    next();
  } catch (err) {
    console.error("SOCKET SESSION ERROR:", err);
    next(new Error("Invalid session"));
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