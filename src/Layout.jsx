import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { LogOut, User, MessageSquare, Users as UsersIcon, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger } from
"@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle } from
"@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useMutation } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle } from "lucide-react";

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [newFullName, setNewFullName] = useState("");
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setNewFullName(currentUser.full_name || '');
      } catch (error) {
        console.error("Erro ao buscar usuário:", error);
      }
    };
    fetchUser();
  }, []);

  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.auth.updateMe(data);
    },
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      setSuccess("Nome atualizado com sucesso!");
      setTimeout(() => {
        setSuccess(null);
        setIsProfileOpen(false);
      }, 2000);
    },
    onError: (error) => {
      setError("Erro ao atualizar nome: " + error.message);
      setTimeout(() => setError(null), 3000);
    }
  });

  const handleLogout = () => {
    base44.auth.logout();
  };

  const handleSaveName = () => {
    if (!newFullName.trim()) {
      setError("Por favor, insira um nome válido.");
      setTimeout(() => setError(null), 3000);
      return;
    }
    updateProfileMutation.mutate({ full_name: newFullName.trim() });
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name.
    split(" ").
    map((n) => n[0]).
    join("").
    toUpperCase().
    slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-2 md:px-4 py-2 md:py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-xl overflow-hidden shadow-lg">
                  <img 
                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694445da3190cc9520b31aa3/086017e6b_image.png" 
                    alt="Sofia"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h1 className="text-lg md:text-xl font-bold text-gray-900">Sofia</h1>
                  <p className="text-gray-500 text-sm hidden md:block">Treinamento Eu Sou Estoquista</p>
                </div>
              </div>

              {/* Navigation */}
              <nav className="hidden md:flex items-center gap-2">
                <Link to={createPageUrl("Chat")}>
                  <Button
                    variant={currentPageName === "Chat" ? "default" : "ghost"}
                    className="flex items-center gap-2">

                    <MessageSquare className="w-4 h-4" />
                    Chat
                  </Button>
                </Link>
                {user?.role === 'admin' &&
                <Link to={createPageUrl("Users")}>
                    <Button
                    variant={currentPageName === "Users" ? "default" : "ghost"}
                    className="flex items-center gap-2">

                      <UsersIcon className="w-4 h-4" />
                      Usuários
                    </Button>
                  </Link>
                }
              </nav>
            </div>

            {/* User Menu */}
            {user &&
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 hover:bg-gray-100">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-sm">
                        {getInitials(user.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden md:inline-block font-medium text-gray-700">
                      {user.full_name || user.email}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled>
                    <User className="w-4 h-4 mr-2" />
                    {user.email}
                  </DropdownMenuItem>
                  {user.role === 'admin' &&
                <DropdownMenuItem disabled>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        Administrador
                      </span>
                    </DropdownMenuItem>
                }
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setIsProfileOpen(true)} className="cursor-pointer">
                    <Edit className="w-4 h-4 mr-2" />
                    Editar Perfil
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            }
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-2 md:px-4 py-3 md:py-6">
        {children}
      </main>

      {/* Dialog de Edição de Perfil */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Perfil</DialogTitle>
            <DialogDescription>
              Atualize suas informações pessoais
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            {success &&
            <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">{success}</AlertDescription>
              </Alert>
            }
            
            {error &&
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            }

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={user?.email || ''}
                disabled
                className="bg-gray-50" />

            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">Nome Completo</Label>
              <Input
                id="fullName"
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                placeholder="Digite seu nome completo" />

            </div>

            <Button
              onClick={handleSaveName}
              className="w-full"
              disabled={updateProfileMutation.isLoading}>

              {updateProfileMutation.isLoading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>);

}