
import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Settings, Bot } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AnimatePresence } from "framer-motion";

import ChatMessage from "../components/chat/ChatMessage";
import ChatInput from "../components/chat/ChatInput";
import TypingIndicator from "../components/chat/TypingIndicator";

export default function Chat() {
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  // Buscar usuário atual
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        // Carregar webhook URL salva
        if (currentUser.webhook_url) {
          setWebhookUrl(currentUser.webhook_url);
        }
      } catch (error) {
        console.error("Erro ao buscar usuário:", error);
        base44.auth.redirectToLogin();
      }
    };
    fetchUser();
  }, []);

  // Buscar histórico de mensagens
  const { data: messages, isLoading } = useQuery({
    queryKey: ["messages", user?.id],
    queryFn: async () => {
      if (!user) return [];
      return await base44.entities.Message.filter(
        { user_id: user.id },
        "-created_date",
        100
      );
    },
    enabled: !!user,
    initialData: [],
  });

  // Scroll automático para o final
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Salvar mensagem no banco
  const createMessageMutation = useMutation({
    mutationFn: (messageData) => base44.entities.Message.create(messageData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", user?.id] });
    },
  });

  // Salvar webhook URL no usuário
  const saveWebhookUrl = async () => {
    try {
      await base44.auth.updateMe({ webhook_url: webhookUrl });
      setIsConfigOpen(false);
      setError(null);
    } catch (error) {
      setError("Erro ao salvar configuração. Tente novamente.");
    }
  };

  // Enviar mensagem para o n8n
  const handleSendMessage = async (userMessage) => {
    if (!webhookUrl) {
      setError("Configure o Webhook URL do n8n antes de enviar mensagens.");
      setIsConfigOpen(true);
      return;
    }

    setError(null);
    setIsTyping(true);

    // Adicionar mensagem do usuário temporariamente
    const tempUserMessage = {
      id: Date.now(),
      user_message: userMessage,
      agent_response: "",
      timestamp: new Date().toISOString(),
      user_id: user.id,
    };

    try {
      // Enviar para o n8n
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          userId: user.id,
          userEmail: user.email,
        }),
      });

      if (response.status === 401 || response.status === 403) {
        // Token inválido ou expirado
        setError("Sua sessão expirou. Por favor, faça login novamente.");
        setTimeout(() => {
          base44.auth.logout();
        }, 2000);
        return;
      }

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const agentResponse = data.response || data.message || "Desculpe, não consegui processar sua mensagem.";

      // Salvar conversa no banco
      await createMessageMutation.mutateAsync({
        user_message: userMessage,
        agent_response: agentResponse,
        timestamp: new Date().toISOString(),
        user_id: user.id,
      });
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      setError(
        "Desculpe, não consegui processar sua mensagem. Verifique se o Webhook URL está correto e tente novamente."
      );
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
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
        {/* Chat Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4 flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold text-lg">Assistente IA</h2>
            <p className="text-blue-100 text-sm">Online - Responde instantaneamente</p>
          </div>
          <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                <Settings className="w-5 h-5" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Configurações do n8n</DialogTitle>
                <DialogDescription>
                  Configure o Webhook URL do seu agente n8n para começar a conversar.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="webhook">Webhook URL do n8n</Label>
                  <Input
                    id="webhook"
                    placeholder="https://seu.n8n.url/webhook/id-do-agente"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                  />
                  <p className="text-xs text-gray-500">
                    Cole aqui a URL do webhook do seu workflow n8n
                  </p>
                </div>
                <Button onClick={saveWebhookUrl} className="w-full">
                  Salvar Configuração
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="m-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Messages Area */}
        <div className="h-[calc(100vh-350px)] overflow-y-auto p-6 bg-gradient-to-b from-gray-50 to-white">
          {messages.length === 0 && !isTyping ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
                <Bot className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Bem-vindo ao Chat AI!
              </h3>
              <p className="text-gray-600 max-w-md">
                Comece uma conversa enviando uma mensagem. O assistente está pronto para ajudar!
              </p>
            </div>
          ) : (
            <>
              {messages
                .slice()
                .reverse()
                .map((msg) => (
                  <React.Fragment key={msg.id}>
                    <ChatMessage
                      message={msg.user_message}
                      isUser={true}
                      timestamp={msg.timestamp}
                    />
                    <ChatMessage
                      message={msg.agent_response}
                      isUser={false}
                      timestamp={msg.timestamp}
                    />
                  </React.Fragment>
                ))}
              <AnimatePresence>
                {isTyping && <TypingIndicator />}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isTyping}
          disabled={!webhookUrl}
        />
      </div>
    </div>
  );
}
