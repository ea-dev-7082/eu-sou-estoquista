import React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bot, User } from "lucide-react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";

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
          <div className="text-base whitespace-pre-wrap break-words prose prose-base max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_ul]:my-0 [&_ol]:my-0 [&_li]:my-0 [&_p+ul]:mt-0 [&_p+ol]:mt-0">
            <ReactMarkdown
                                components={{
                p: ({node, ...props}) => (
  <p
    className={`${isUser ? 'text-white' : 'text-gray-800'} mb-0 leading-snug`}
    style={{ marginTop: 0, marginBottom: 0 }}
    {...props}
  />
),

ul: ({node, ...props}) => (
  <ul
    className={`${isUser ? 'text-white' : 'text-gray-800'} list-disc pl-4`}
    style={{ marginTop: 0, marginBottom: 0, paddingLeft: '1rem' }}
    {...props}
  />
),

ol: ({node, ...props}) => (
  <ol
    className={`${isUser ? 'text-white' : 'text-gray-800'} list-decimal pl-4`}
    style={{ marginTop: 0, marginBottom: 0, paddingLeft: '1rem' }}
    {...props}
  />
),

li: ({node, ...props}) => (
  <li
    className={`${isUser ? 'text-white' : 'text-gray-800'} leading-snug`}
    style={{ marginTop: 0, marginBottom: 0 }}
    {...props}
  />
),
                                    }}
            >
              {message}
            </ReactMarkdown>
          </div>
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