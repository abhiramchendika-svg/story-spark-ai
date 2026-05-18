import { io } from "socket.io-client";
import { getFromLocalStorage } from "../utils/local-storage";
import { AUTH_KEY } from "../constants/storage-key";

const socketUrl =
  import.meta.env.VITE_SOCKET_URL ||
  "https://notification-socket-io.onrender.com";

export const socketIo = io(socketUrl, {
  transports: ["websocket", "polling"],
  autoConnect: false,
  auth: { token: getFromLocalStorage(AUTH_KEY) },
  withCredentials: true,
});
