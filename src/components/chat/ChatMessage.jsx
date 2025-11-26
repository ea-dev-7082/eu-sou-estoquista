import React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bot, User } from "lucide-react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
                                remarkPlugins={[remarkGfm]}
                                components={{
                h1: ({node, ...props}) => <h1 className={`text-2xl font-bold mb-1 mt-1 first:mt-0 ${isUser ? 'text-white' : 'text-gray-900'}`} {...props} />,
                h2: ({node, ...props}) => <h2 className={`text-xl font-bold mb-1 mt-1 first:mt-0 ${isUser ? 'text-white' : 'text-gray-900'}`} {...props} />,
                h3: ({node, ...props}) => <h3 className={`text-lg font-bold mb-0.5 mt-1 first:mt-0 ${isUser ? 'text-white' : 'text-gray-900'}`} {...props} />,
                p: ({node, ...props}) => <p className={`mb-0 ${isUser ? 'text-white' : 'text-gray-800'}`} {...props} />,
                strong: ({node, ...props}) => <strong className={`font-bold ${isUser ? 'text-white' : 'text-gray-900'}`} {...props} />,
                em: ({node, ...props}) => <em className={`italic ${isUser ? 'text-white' : 'text-gray-700'}`} {...props} />,
                ul: ({node, ...props}) => <ul className={`list-disc pl-5 my-0 space-y-0 ${isUser ? 'text-white' : 'text-gray-800'}`} style={{marginTop: 0, marginBottom: 0}} {...props} />,
                ol: ({node, ...props}) => <ol className={`list-decimal pl-5 my-0 space-y-0 ${isUser ? 'text-white' : 'text-gray-800'}`} style={{marginTop: 0, marginBottom: 0}} {...props} />,
                li: ({node, ...props}) => <li className={`my-0 ml-0 leading-tight ${isUser ? 'text-white' : 'text-gray-800'}`} style={{marginTop: 0, marginBottom: 0}} {...props}>{props.children}</li>,
                code: ({node, inline, ...props}) => 
                  inline ? (
                    <code className={`${isUser ? 'bg-blue-600/30 text-white' : 'bg-gray-100 text-gray-800'} px-1 py-0.5 rounded text-sm`} {...props} />
                  ) : (
                    <code className={`block ${isUser ? 'bg-blue-600/30 text-white' : 'bg-gray-100 text-gray-800'} p-2 rounded text-sm my-2 overflow-x-auto`} {...props} />
                  ),
                blockquote: ({node, ...props}) => <blockquote className={`border-l-4 ${isUser ? 'border-blue-300 text-white' : 'border-gray-300 text-gray-700'} pl-4 italic my-2`} {...props} />,
                a: ({node, ...props}) => <a className={`${isUser ? 'text-blue-200 underline' : 'text-blue-600 underline'} hover:opacity-80`} {...props} target="_blank" rel="noopener noreferrer" />,
                                      table: ({node, ...props}) => <table className={`border-collapse my-2 w-full text-sm ${isUser ? 'text-white' : 'text-gray-800'}`} {...props} />,
                                      thead: ({node, ...props}) => <thead className={`${isUser ? 'bg-blue-600/30' : 'bg-gray-100'}`} {...props} />,
                                      tbody: ({node, ...props}) => <tbody {...props} />,
                                      tr: ({node, ...props}) => <tr className={`${isUser ? 'border-blue-400/30' : 'border-gray-200'} border-b`} {...props} />,
                                      th: ({node, ...props}) => <th className={`${isUser ? 'border-blue-400/30' : 'border-gray-300'} border px-2 py-1 text-left font-semibold`} {...props} />,
                                      td: ({node, ...props}) => <td className={`${isUser ? 'border-blue-400/30' : 'border-gray-300'} border px-2 py-1`} {...props} />,
                                      input: ({node, ...props}) => {
                                        if (props.type === 'checkbox') {
                                          return <input type="checkbox" checked={props.checked} readOnly className="mr-2 accent-blue-500" />;
                                        }
                                        return <input {...props} />;
                                      },
                                      sup: ({node, ...props}) => <sup className={`text-xs ${isUser ? 'text-blue-200' : 'text-blue-600'}`} {...props} />,
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