import { io, Socket } from "socket.io-client";
import { API_URL } from "./api";

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  const token = localStorage.getItem("accessToken");
  if (!token) return null;

  if (!socket || socket.disconnected) {
    socket = io(API_URL, { auth: { token }, transports: ["websocket"] });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
