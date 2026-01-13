// import { io } from "socket.io-client";

// export const socket = io(import.meta.env.VITE_SOCKET_URL, {
//     withCredentials: true,
//     transports: ["polling", "websocket"],
//     reconnectionAttempts: 10,
//     reconnectionDelay: 2000,
//     timeout: 20000,
//     autoConnect: false, // 🔥 important
// });


import { io } from "socket.io-client";

let socket = null;

export const getSocket = () => {
    if (!socket) {
        const socketUrl = import.meta.env.PROD
            ? "https://accomodation.api.test.nextkinlife.live"
            : "/";
        socket = io(socketUrl, {
            withCredentials: true,
            // 🔒 polling fails on Prod due to missing sticky sessions. Force websocket.
            transports: ["websocket"],

            // Allow auto-connect for singleton pattern
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 2000,
        });
    }
    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};
