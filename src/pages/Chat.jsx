import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Bot, Ban } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

import ChatMessage from "../components/chat/ChatMessage";
import ChatInput from "../components/chat/ChatInput";
import TypingIndicator from "../components/chat/TypingIndicator";

function normalizeAIMessage(raw) {
  let text = raw;

  // 1. Remove headings Markdown
  text = text.replace(/^#{1,6}\s*/gm, "");

  // 2. Corrige bullets soltos: 
  // "- \n\n**Título:**" => "\u200B- **Título:**"
  text = text.replace(/\n[-•*]\s*\n+(\*\*.+)/g, "\n\u200B- $1");

  // 3. Converte bullets markdown em invisíveis
  text = text.replace(/^\s*[-•*]\s+(?=\*\*)/gm, "\u200B- ");

  // 4. Remove bullets vazios sozinhos (•, -, etc.)
  text = text.replace(/^\s*[•\-*]\s*$/gm, "");

  // 5. Remove linhas vazias duplicadas
  text = text.replace(/\n{3,}/g, "\n\n");

  // 6. Remove `<p>` artificiais vindos de quebra irregular
  text = text.replace(/\n\s*\n\s*\n/g, "\n\n");

  return text.trim();
}

export default function Chat() {
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [tempMessages, setTempMessages] = useState([]);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  // Buscar usuário atual
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Erro ao buscar usuário:", error);
        base44.auth.redirectToLogin();
      }
    };
    fetchUser();
  }, []);

  // Buscar configuração da webhook (global)
  const { data: configs } = useQuery({
    queryKey: ['appConfig'],
    queryFn: async () => {
      const allConfigs = await base44.entities.AppConfig.list();
      return allConfigs;
    },
    enabled: !!user,
    initialData: []
  });

  // Atualizar webhook URL quando configs carregarem
  useEffect(() => {
    const webhookConfig = configs.find((c) => c.config_key === 'n8n_webhook_url');
    if (webhookConfig) {
      setWebhookUrl(webhookConfig.config_value);
    }
  }, [configs]);

  // Buscar histórico de mensagens
  const { data: messages, isLoading } = useQuery({
    queryKey: ["messages", user?.id],
    queryFn: async () => {
      if (!user) return [];
      return await base44.entities.Message.filter(
        { user_id: user.id },
        "created_date",
        100
      );
    },
    enabled: !!user,
    initialData: []
  });

  // Combinar mensagens do banco com mensagens temporárias
  const allMessages = [...messages, ...tempMessages];

  // Scroll automático para o final
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages, isTyping]);

  // Salvar mensagem no banco
  const createMessageMutation = useMutation({
    mutationFn: (messageData) => base44.entities.Message.create(messageData),
    onSuccess: (newMessage) => {
      // Atualizar o cache diretamente sem invalidar (evita recarregar)
      queryClient.setQueryData(["messages", user?.id], (oldMessages) => {
        return [...(oldMessages || []), newMessage];
      });
      setTempMessages([]);
    }
  });

  // Verificar se usuário está bloqueado
  const isUserBlocked = user?.status === 'blocked';

  // Enviar mensagem para o n8n
  const handleSendMessage = async (userMessage) => {
    if (isUserBlocked) {
      setError("Seu acesso ao chat foi bloqueado. Entre em contato com o administrador.");
      return;
    }

    if (!webhookUrl) {
      setError("O webhook do n8n não foi configurado. Entre em contato com o administrador.");
      return;
    }

    setError(null);

    // Adicionar mensagem do usuário imediatamente na tela
    const tempMessage = {
      id: `temp-${Date.now()}`,
      user_message: userMessage,
      agent_response: "",
      timestamp: new Date().toISOString(),
      user_id: user.id,
      isTemp: true
    };

    setTempMessages([tempMessage]);
    setIsTyping(true);

    try {
      console.log("Enviando para n8n:", webhookUrl);

      // Enviar para o n8n
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: userMessage,
          userId: user.id,
          userEmail: user.email
        })
      });

      console.log("Status da resposta:", response.status);

      if (response.status === 401 || response.status === 403) {
        setError("Sua sessão expirou. Por favor, faça login novamente.");
        setTimeout(() => {
          base44.auth.logout();
        }, 2000);
        setIsTyping(false);
        setTempMessages([]);
        return;
      }

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const responseText = await response.text();
      console.log("Resposta do n8n (raw):", responseText);

      let agentResponse = "Desculpe, não consegui processar sua mensagem.";
      
      if (responseText && responseText.trim()) {
        try {
          const data = JSON.parse(responseText);
          console.log("Resposta do n8n (parsed):", data);
          
          // Tentar extrair a resposta de diferentes formatos possíveis
          if (typeof data === 'string') {
            agentResponse = data;
          } else if (data.response) {
            // Verificar se response é um array com objetos contendo text
            if (Array.isArray(data.response)) {
              const textItems = data.response
                .filter(item => item.type === 'text' && item.text)
                .map(item => {
                  // Se text for um JSON string, tentar extrair pageContent
                  try {
                    const parsed = JSON.parse(item.text);
                    return parsed.pageContent || item.text;
                  } catch {
                    return item.text;
                  }
                });
              agentResponse = textItems.join('\n\n') || data.response;
            } else {
              agentResponse = data.response;
            }
          } else if (data.message) {
            agentResponse = data.message;
          } else if (data.output) {
            agentResponse = data.output;
          } else if (data.text) {
            agentResponse = data.text;
          } else if (data.pageContent) {
            agentResponse = data.pageContent;
          }
        } catch (parseError) {
          console.log("Resposta não é JSON, usando como texto:", responseText);
          agentResponse = responseText;
        }
      }

      // Salvar conversa no banco
      await createMessageMutation.mutateAsync({
        user_message: userMessage,
        agent_response: agentResponse,
        timestamp: new Date().toISOString(),
        user_id: user.id
      });
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      setError(
        `Erro: ${error.message}. Entre em contato com o administrador.`
      );
      setTempMessages([]);
    } finally {
      setIsTyping(false);
    }
  };

  // Exibir loading enquanto busca dados
  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-180px)]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Carregando conversa...</p>
        </div>
      </div>);

  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
        {/* Chat Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4 flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold text-lg">Assistente Estratégico de Aprendizado</h2>
            <p className="text-blue-100 text-sm">
              {isUserBlocked ? "Acesso bloqueado" : webhookUrl ? "Online - Responde instantaneamente" : "Aguardando configuração"}
            </p>
          </div>
        </div>

        {/* Usuário Bloqueado Alert */}
        {isUserBlocked &&
        <Alert variant="destructive" className="m-4">
            <Ban className="h-4 w-4" />
            <AlertDescription>
              Seu acesso ao chat foi bloqueado pelo administrador. Entre em contato para mais informações.
            </AlertDescription>
          </Alert>
        }

        {/* Error Alert */}
        {error && !isUserBlocked &&
        <Alert variant="destructive" className="m-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        }

        {/* Webhook não configurada Alert */}
        {!webhookUrl && !isUserBlocked &&
        <Alert className="m-4 bg-yellow-50 border-yellow-200">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              O chatbot ainda não foi configurado.
              {user.role === 'admin' ?
            <>
                  {' '}<Link to={createPageUrl("Users")} className="font-medium underline">
                    Clique aqui para configurar o webhook
                  </Link>
                </> :

            ' Entre em contato com o administrador.'
            }
            </AlertDescription>
          </Alert>
        }

        {/* Messages Area */}
        <div className="h-[calc(100vh-350px)] overflow-y-auto p-6 bg-gradient-to-b from-gray-50 to-white">
          {allMessages.length === 0 && !isTyping ?
          <div className="flex flex-col items-center justify-center h-full text-center">
              <div className={`w-20 h-20 ${isUserBlocked ? 'bg-gradient-to-br from-red-500 to-red-600' : 'bg-gradient-to-br from-blue-500 to-indigo-600'} rounded-full flex items-center justify-center mb-4 shadow-lg`}>
                {isUserBlocked ?
              <Ban className="w-10 h-10 text-white" /> :

              <Bot className="w-10 h-10 text-white" />
              }
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                {isUserBlocked ? "Acesso Bloqueado" : "Bem-vindo ao Chat AI!"}
              </h3>
              <p className="text-gray-600 max-w-md">
                {isUserBlocked ?
              "Você não pode enviar mensagens no momento. Entre em contato com o administrador." :
              webhookUrl ?
              "Comece uma conversa enviando uma mensagem. O assistente está pronto para ajudar!" :
              "Aguarde a configuração do webhook para começar a conversar."}
              </p>
            </div> :

          <>
              {allMessages.map((msg) =>
            <React.Fragment key={msg.id}>
                    <ChatMessage
                message={msg.user_message}
                isUser={true}
                timestamp={msg.timestamp} />

                    {msg.agent_response &&
              <ChatMessage
                message={msg.agent_response}
                isUser={false}
                timestamp={msg.timestamp} />

              }
                  </React.Fragment>
            )}
              <AnimatePresence>
                {isTyping && <TypingIndicator />}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </>
          }
        </div>

        {/* Input Area */}
        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isTyping}
          disabled={!webhookUrl || isUserBlocked} />

      </div>
    </div>);

}