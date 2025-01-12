import React, { useState, useEffect } from "react";
import io from "socket.io-client";

// Connect to the backend
const socket = io("http://localhost:5000");

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [room, setRoom] = useState(null);
  const [isTyping, setIsTyping] = useState(false);

  // Join room on page load
  useEffect(() => {
    socket.emit("join-room");

    // Listen for pairing confirmation
    socket.on("paired", (room) => {
      console.log(`Paired in room: ${room}`);
      setRoom(room);
    });

    // Listen for incoming messages
    socket.on("chat-message", (message) => {
      setMessages((prev) => [...prev, message]);
    });

    // Listen for typing indicator
    socket.on("user-typing", () => {
      setIsTyping(true);
      setTimeout(() => setIsTyping(false), 1500);
    });
  }, []);

  // Handle sending messages
  const sendMessage = () => {
    if (room && input.trim()) {
      socket.emit("send-message", { room, message: input });
      setMessages((prev) => [...prev, `Me: ${input}`]);
      setInput("");
    }
  };

  // Notify others when typing
  const handleTyping = () => {
    socket.emit("typing", { room });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white flex flex-col items-center justify-center p-6">
      <h1 className="text-3xl font-extrabold mb-6">Redis Chat App</h1>

      <div className="w-full max-w-lg bg-gray-700 rounded-lg shadow-lg p-6">
        {/* Chat Header */}
        <div className="mb-4">
          <h2 className="text-xl font-semibold">
            {room ? `Room: ${room}` : "Connecting to a room..."}
          </h2>
        </div>

        {/* Messages Section */}
        <div className="h-64 overflow-y-auto bg-gray-800 rounded-lg p-4 mb-4">
          {messages.length > 0 ? (
            messages.map((msg, index) => (
              <div
                key={index}
                className={`${
                  msg.startsWith("Me:")
                    ? "text-right text-blue-400"
                    : "text-left text-green-400"
                } mb-2`}
              >
                {msg}
              </div>
            ))
          ) : (
            <div className="text-center text-gray-400">
              No messages yet. Start the conversation!
            </div>
          )}
        </div>

        {/* Typing Indicator */}
        {isTyping && (
          <div className="text-sm text-gray-400 mb-2">Someone is typing...</div>
        )}

        {/* Input and Send Button */}
        <div className="flex items-center">
          <input
            className="flex-1 bg-gray-600 p-3 rounded-l-lg focus:outline-none"
            type="text"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleTyping}
          />
          <button
            className="bg-blue-500 hover:bg-blue-600 px-4 py-3 rounded-r-lg font-bold transition duration-200"
            onClick={sendMessage}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
