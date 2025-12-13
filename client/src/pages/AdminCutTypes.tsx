import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

export default function AdminCutTypes() {
  const [, setLocation] = useLocation();
  
  // Verificar autenticação com senha
  const isAdminAuthenticated = sessionStorage.getItem("adminAuthenticated") === "true";
  
  // Redirecionar para login do admin se não estiver autenticado com senha
  if (!isAdminAuthenticated) {
    setLocation("/admin/login");
    return null;
  }
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCutType, setEditingCutType] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const { data: cutTypes, refetch } = trpc.cutTypes.list.useQuery();
  
  const createMutation = trpc.cutTypes.create.useMutation({
    onSuccess: () => {
      toast.success("Tipo de corte criado com sucesso!");
      refetch();
      closeDialog();
    },
    onError: (error) => {
      toast.error(`Erro ao criar tipo de corte: ${error.message}`);
    },
  });

  const updateMutation = trpc.cutTypes.update.useMutation({
    onSuccess: () => {
      toast.success("Tipo de corte atualizado com sucesso!");
      refetch();
      closeDialog();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar tipo de corte: ${error.message}`);
    },
  });

  const deleteMutation = trpc.cutTypes.delete.useMutation({
    onSuccess: () => {
      toast.success("Tipo de corte excluído com sucesso!");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao excluir tipo de corte: ${error.message}`);
    },
  });

  const openCreateDialog = () => {
    setEditingCutType(null);
    setFormData({ name: "", description: "" });
    setIsDialogOpen(true);
  };

  const openEditDialog = (cutType: any) => {
    setEditingCutType(cutType);
    setFormData({
      name: cutType.name,
      description: cutType.description || "",
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingCutType(null);
    setFormData({ name: "", description: "" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    if (editingCutType) {
      updateMutation.mutate({
        id: editingCutType.id,
        ...formData,
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este tipo de corte?")) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-white">
      <div className="container py-8">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Tipos de Corte</CardTitle>
                <CardDescription>
                  Gerencie os tipos de corte disponíveis (Moído, Em Cubos, Peça Inteira, etc.)
                </CardDescription>
              </div>
              <Button onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Tipo de Corte
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!cutTypes || cutTypes.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum tipo de corte cadastrado
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cutTypes.map((cutType) => (
                    <TableRow key={cutType.id}>
                      <TableCell className="font-medium">{cutType.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {cutType.description || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(cutType)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(cutType.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog de Criar/Editar */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCutType ? "Editar Tipo de Corte" : "Novo Tipo de Corte"}
            </DialogTitle>
            <DialogDescription>
              {editingCutType
                ? "Atualize as informações do tipo de corte"
                : "Adicione um novo tipo de corte ao sistema"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Moído, Em Cubos, Peça Inteira"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  placeholder="Descrição opcional do tipo de corte"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingCutType ? "Atualizar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
