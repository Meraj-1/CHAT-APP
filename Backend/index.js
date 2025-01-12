// Backend Code: Express with Socket.io and Redis
const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const Redis = require("ioredis");

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow requests from any origin
  },
});

// Redis setup
const redis = new Redis({
  host: '127.0.0.1',  // Localhost IP
  port: 6379,         // Redis default port
});

redis.on('connect', () => {
  console.log('Connected to Redis');
});

redis.on('error', (err) => {
  console.error('Redis error:', err);
});
const pub = new Redis(); // Publisher
const sub = new Redis(); // Subscriber

// const redis = new Redis({
//   host: process.env.REDIS_HOST, // Set this in environment variables
//   port: process.env.REDIS_PORT || 6379,
//   password: process.env.REDIS_PASSWORD  // Optional
// });

// Monitor Redis connections
redis.on("connect", () => console.log("Connected to Redis!"));
redis.on("error", (err) => console.error("Redis connection error:", err));

// Subscribe to Redis channel
sub.subscribe("chat_channel", (err) => {
  if (err) console.error("Failed to subscribe to Redis channel:", err);
  else console.log("Subscribed to Redis channel: chat_channel");
});

// Handle published messages from Redis
sub.on("message", (channel, message) => {
  console.log(`Received message on ${channel}:`, message);
  const { event, data } = JSON.parse(message);

  if (event === "chat") {
    io.to(data.room).emit("chat-message", data.message);
  }
});

// Socket.io setup
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Handle room joining
  socket.on("join-room", async () => {
    try {
      const waitingUser = await redis.lpop("waiting_users");
      if (waitingUser) {
        // Pair users
        const room = `${socket.id}-${waitingUser}`;
        socket.join(room);
        io.to(waitingUser).emit("paired", room);
        io.to(socket.id).emit("paired", room);
        console.log(`Paired ${socket.id} with ${waitingUser} in room ${room}`);
      } else {
        // Add to waiting queue
        await redis.rpush("waiting_users", socket.id);
        console.log(`${socket.id} added to waiting queue`);
      }
    } catch (err) {
      console.error("Error joining room:", err);
    }
  });

  // Handle chat messages
  socket.on("send-message", ({ room, message }) => {
    pub.publish(
      "chat_channel",
      JSON.stringify({
        event: "chat",
        data: { room, message },
      })
    );
  });

  // Handle disconnect
  socket.on("disconnect", async () => {
    console.log(`User disconnected: ${socket.id}`);
    try {
      await redis.lrem("waiting_users", 1, socket.id);
    } catch (err) {
      console.error("Error handling disconnect:", err);
    }
  });
});

// Default route for testing
app.get("/", (req, res) => {
  res.send("Backend is running!");
});

// Export for Vercel compatibility
module.exports = server;
