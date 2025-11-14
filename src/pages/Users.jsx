import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  UserPlus, 
  Clock, 
  Shield, 
  Search, 
  MoreVertical,
  AlertCircle,
  CheckCircle,
  XCircle,
  Calendar,
  Settings,
  Save,
  Trash2,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Users() {
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  
  const queryClient = useQueryClient();

  // Verificar se usuário atual é admin
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        
        if (user.role !== 'admin') {
          setError("Apenas administradores podem acessar esta página.");
        }
      } catch (error) {
        console.error("Erro ao buscar usuário:", error);
        base44.auth.redirectToLogin();
      }
    };
    fetchCurrentUser();
  }, []);

  // Buscar configuração da webhook
  const { data: configs } = useQuery({
    queryKey: ['appConfig'],
    queryFn: async () => {
      const allConfigs = await base44.entities.AppConfig.list();
      return allConfigs;
    },
    enabled: currentUser?.role === 'admin',
    initialData: [],
  });

  // Atualizar webhook URL quando configs carregarem
  useEffect(() => {
    const webhookConfig = configs.find(c => c.config_key === 'n8n_webhook_url');
    if (webhookConfig) {
      setWebhookUrl(webhookConfig.config_value);
    }
  }, [configs]);

  // Buscar todos os usuários
  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list('-created_date'),
    enabled: currentUser?.role === 'admin',
    initialData: [],
  });

  // Salvar configuração da webhook
  const saveWebhookMutation = useMutation({
    mutationFn: async (url) => {
      const existingConfig = configs.find(c => c.config_key === 'n8n_webhook_url');
      
      if (existingConfig) {
        return await base44.entities.AppConfig.update(existingConfig.id, {
          config_value: url,
          updated_by: currentUser.email
        });
      } else {
        return await base44.entities.AppConfig.create({
          config_key: 'n8n_webhook_url',
          config_value: url,
          description: 'URL do webhook do n8n para o chatbot',
          updated_by: currentUser.email
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appConfig'] });
      setSuccess("Webhook configurada com sucesso!");
      setIsConfigDialogOpen(false);
      setTimeout(() => setSuccess(null), 3000);
    },
    onError: (error) => {
      setError("Erro ao salvar webhook: " + error.message);
      setTimeout(() => setError(null), 5000);
    }
  });

  // Atualizar usuário
  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setSuccess("Usuário atualizado com sucesso!");
      setTimeout(() => setSuccess(null), 3000);
    },
    onError: (error) => {
      setError("Erro ao atualizar usuário: " + error.message);
      setTimeout(() => setError(null), 5000);
    }
  });

  // Remover usuário
  const deleteUserMutation = useMutation({
    mutationFn: (userId) => base44.entities.User.delete(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setSuccess("Usuário removido com sucesso!");
      setUserToDelete(null);
      setTimeout(() => setSuccess(null), 3000);
    },
    onError: (error) => {
      setError("Erro ao remover usuário: " + error.message);
      setTimeout(() => setError(null), 5000);
    }
  });

  // Filtrar usuários
  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.full_name?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower)
    );
  });

  // Verificar se acesso expirou
  const isAccessExpired = (user) => {
    if (!user.is_temporary || !user.access_expires_at) return false;
    return new Date(user.access_expires_at) < new Date();
  };

  // Bloquear/desbloquear usuário
  const handleToggleUserStatus = async (user) => {
    const newStatus = user.status === 'blocked' ? 'active' : 'blocked';
    await updateUserMutation.mutateAsync({
      id: user.id,
      data: { status: newStatus }
    });
  };

  // Alternar tipo de acesso (temporário/permanente)
  const handleToggleAccessType = async (user) => {
    if (user.is_temporary) {
      // Tornar permanente: remover data de expiração e código
      await updateUserMutation.mutateAsync({
        id: user.id,
        data: { 
          is_temporary: false,
          access_expires_at: null,
          access_code: null,
          status: 'active'
        }
      });
    } else {
      // Tornar temporário: definir expiração para 30 dias
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);
      
      await updateUserMutation.mutateAsync({
        id: user.id,
        data: { 
          is_temporary: true,
          access_expires_at: expiryDate.toISOString(),
          status: 'active'
        }
      });
    }
  };

  // Estender acesso temporário
  const handleExtendAccess = async (user, days) => {
    const newExpiryDate = new Date();
    newExpiryDate.setDate(newExpiryDate.getDate() + days);
    
    await updateUserMutation.mutateAsync({
      id: user.id,
      data: { 
        access_expires_at: newExpiryDate.toISOString(),
        status: 'active'
      }
    });
  };

  // Remover usuário
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    // Evitar que o admin se remova
    if (userToDelete.id === currentUser.id) {
      setError("Você não pode remover sua própria conta!");
      setUserToDelete(null);
      setTimeout(() => setError(null), 3000);
      return;
    }

    await deleteUserMutation.mutateAsync(userToDelete.id);
  };

  // Salvar webhook
  const handleSaveWebhook = async () => {
    if (!webhookUrl.trim()) {
      setError("Por favor, insira uma URL válida.");
      return;
    }
    await saveWebhookMutation.mutateAsync(webhookUrl);
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-180px)]">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Apenas administradores podem acessar esta página.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-180px)]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Carregando usuários...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gerenciar Usuários</h1>
          <p className="text-gray-500 mt-1">
            Apenas administradores podem adicionar e remover usuários
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline"
            onClick={() => setIsConfigDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Configurar Webhook
          </Button>
          <Button className="bg-gradient-to-r from-blue-500 to-indigo-600">
            <UserPlus className="w-4 h-4 mr-2" />
            Convidar Usuário
          </Button>
        </div>
      </div>

      {/* Alertas */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Configuração Webhook Card */}
      <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Configuração do Webhook N8N
              </CardTitle>
              <CardDescription className="mt-1">
                {webhookUrl ? (
                  <span className="text-green-700 font-medium">✓ Webhook configurada</span>
                ) : (
                  <span className="text-orange-700 font-medium">⚠ Webhook não configurada</span>
                )}
              </CardDescription>
            </div>
            <Button 
              variant="outline"
              size="sm"
              onClick={() => setIsConfigDialogOpen(true)}
            >
              Editar
            </Button>
          </div>
        </CardHeader>
        {webhookUrl && (
          <CardContent>
            <p className="text-sm text-gray-600 font-mono bg-white/50 p-3 rounded-lg truncate">
              {webhookUrl}
            </p>
          </CardContent>
        )}
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total de Usuários</CardDescription>
            <CardTitle className="text-3xl">{users.length}</CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Usuários Permanentes</CardDescription>
            <CardTitle className="text-3xl">
              {users.filter(u => !u.is_temporary).length}
            </CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Acessos Temporários</CardDescription>
            <CardTitle className="text-3xl">
              {users.filter(u => u.is_temporary).length}
            </CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Acessos Expirados</CardDescription>
            <CardTitle className="text-3xl text-red-600">
              {users.filter(u => isAccessExpired(u)).length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expira em</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.full_name || 'Sem nome'}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.is_temporary ? (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                          <Clock className="w-3 h-3 mr-1" />
                          Temporário
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          <Shield className="w-3 h-3 mr-1" />
                          {user.role === 'admin' ? 'Admin' : 'Permanente'}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {isAccessExpired(user) ? (
                        <Badge variant="destructive">
                          <XCircle className="w-3 h-3 mr-1" />
                          Expirado
                        </Badge>
                      ) : user.status === 'blocked' ? (
                        <Badge variant="secondary">
                          Bloqueado
                        </Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-800 border-green-200">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Ativo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.access_expires_at ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(user.access_expires_at), "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {format(new Date(user.created_date), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleToggleAccessType(user)}>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            {user.is_temporary ? 'Tornar Permanente' : 'Tornar Temporário'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {user.is_temporary && (
                            <>
                              <DropdownMenuItem onClick={() => handleExtendAccess(user, 7)}>
                                Estender por 7 dias
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleExtendAccess(user, 30)}>
                                Estender por 30 dias
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          <DropdownMenuItem onClick={() => handleToggleUserStatus(user)}>
                            {user.status === 'blocked' ? 'Desbloquear' : 'Bloquear'} Usuário
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => setSelectedUser(user)}
                            className="text-blue-600"
                          >
                            Ver Detalhes
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => setUserToDelete(user)}
                            className="text-red-600"
                            disabled={user.id === currentUser.id}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remover Usuário
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Confirmação de Remoção */}
      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O usuário{" "}
              <span className="font-bold">{userToDelete?.full_name || userToDelete?.email}</span>{" "}
              será permanentemente removido do sistema, incluindo todo seu histórico de conversas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-red-600 hover:bg-red-700"
            >
              Remover Usuário
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Configuração da Webhook */}
      <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar Webhook do N8N</DialogTitle>
            <DialogDescription>
              Configure a URL do webhook que todos os usuários usarão para conversar com o agente.
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
                Esta URL será usada por todos os usuários do sistema
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800 font-medium mb-1">
                ℹ️ Formato esperado da resposta:
              </p>
              <code className="text-xs text-blue-700 block">
                {`{ "response": "texto da resposta" }`}
              </code>
            </div>
            <Button 
              onClick={handleSaveWebhook} 
              className="w-full"
              disabled={saveWebhookMutation.isLoading}
            >
              <Save className="w-4 h-4 mr-2" />
              {saveWebhookMutation.isLoading ? 'Salvando...' : 'Salvar Configuração'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Detalhes do Usuário */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Usuário</DialogTitle>
            <DialogDescription>
              Informações completas sobre o usuário
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500">Nome Completo</Label>
                  <p className="font-medium">{selectedUser.full_name || 'Não informado'}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Email</Label>
                  <p className="font-medium">{selectedUser.email}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Tipo de Acesso</Label>
                  <p className="font-medium">
                    {selectedUser.is_temporary ? 'Temporário' : 'Permanente'}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-500">Função</Label>
                  <p className="font-medium capitalize">{selectedUser.role}</p>
                </div>
                {selectedUser.access_code && (
                  <div>
                    <Label className="text-gray-500">Código de Acesso</Label>
                    <p className="font-mono font-bold text-lg">{selectedUser.access_code}</p>
                  </div>
                )}
                {selectedUser.access_expires_at && (
                  <div>
                    <Label className="text-gray-500">Expira em</Label>
                    <p className="font-medium">
                      {format(new Date(selectedUser.access_expires_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                )}
              </div>
              
              {selectedUser.notes && (
                <div>
                  <Label className="text-gray-500">Observações</Label>
                  <p className="text-sm bg-gray-50 p-3 rounded-lg mt-1">
                    {selectedUser.notes}
                  </p>
                </div>
              )}

              <div className="pt-4 flex gap-3 flex-wrap">
                <Button 
                  onClick={() => {
                    handleToggleAccessType(selectedUser);
                    setSelectedUser(null);
                  }}
                  variant="outline"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {selectedUser.is_temporary ? 'Tornar Permanente' : 'Tornar Temporário'}
                </Button>
                {selectedUser.is_temporary && !isAccessExpired(selectedUser) && (
                  <>
                    <Button 
                      onClick={() => {
                        handleExtendAccess(selectedUser, 7);
                        setSelectedUser(null);
                      }}
                      variant="outline"
                    >
                      Estender 7 dias
                    </Button>
                    <Button 
                      onClick={() => {
                        handleExtendAccess(selectedUser, 30);
                        setSelectedUser(null);
                      }}
                      variant="outline"
                    >
                      Estender 30 dias
                    </Button>
                  </>
                )}
                <Button 
                  onClick={() => {
                    handleToggleUserStatus(selectedUser);
                    setSelectedUser(null);
                  }}
                  variant={selectedUser.status === 'blocked' ? 'default' : 'destructive'}
                  className="ml-auto"
                >
                  {selectedUser.status === 'blocked' ? 'Desbloquear' : 'Bloquear'} Usuário
                </Button>
                {selectedUser.id !== currentUser.id && (
                  <Button 
                    onClick={() => {
                      setUserToDelete(selectedUser);
                      setSelectedUser(null);
                    }}
                    variant="outline"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remover
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}