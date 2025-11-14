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
  Calendar
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Users() {
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
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

  // Buscar todos os usuários
  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list('-created_date'),
    enabled: currentUser?.role === 'admin',
    initialData: [],
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

  // Gerar código de acesso aleatório
  const generateAccessCode = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  };

  // Bloquear/desbloquear usuário
  const handleToggleUserStatus = async (user) => {
    const newStatus = user.status === 'blocked' ? 'active' : 'blocked';
    await updateUserMutation.mutateAsync({
      id: user.id,
      data: { status: newStatus }
    });
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
            Controle de acessos e usuários temporários
          </p>
        </div>
        <Button className="bg-gradient-to-r from-blue-500 to-indigo-600">
          <UserPlus className="w-4 h-4 mr-2" />
          Convidar Usuário
        </Button>
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
                          {user.is_temporary && (
                            <>
                              <DropdownMenuItem onClick={() => handleExtendAccess(user, 7)}>
                                Estender por 7 dias
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleExtendAccess(user, 30)}>
                                Estender por 30 dias
                              </DropdownMenuItem>
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

              <div className="pt-4 flex gap-3">
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
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}