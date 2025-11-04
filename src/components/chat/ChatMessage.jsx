import React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bot, User } from "lucide-react";
import { motion } from "framer-motion";

export default function ChatMessage({ message, isUser, timestamp }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex gap-3 mb-4 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser
            ? "bg-gradient-to-br from-blue-500 to-indigo-600"
            : "bg-gradient-to-br from-purple-500 to-pink-600"
        }`}
      >
        {isUser ? (
          <User className="w-5 h-5 text-white" />
        ) : (
          <Bot className="w-5 h-5 text-white" />
        )}
      </div>

      {/* Message Bubble */}
      <div className={`flex flex-col max-w-[70%] ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`rounded-2xl px-4 py-3 shadow-md ${
            isUser
              ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-tr-sm"
              : "bg-white text-gray-800 rounded-tl-sm border border-gray-200"
          }`}
        >
          <p className="text-sm whitespace-pre-wrap break-words">{message}</p>
        </div>
        {timestamp && (
          <span className="text-xs text-gray-500 mt-1 px-2">
            {format(new Date(timestamp), "HH:mm", { locale: ptBR })}
          </span>
        )}
      </div>
    </motion.div>
  );
}