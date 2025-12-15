import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

export default function AdminQuickQuantities() {
  const [, setLocation] = useLocation();
  
  // Verificar autenticação com senha
  const isAdminAuthenticated = sessionStorage.getItem("adminAuthenticated") === "true";
  
  // Redirecionar para login do admin se não estiver autenticado com senha
  if (!isAdminAuthenticated) {
    setLocation("/admin/login");
    return null;
  }
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQuantity, setEditingQuantity] = useState<any>(null);
  const [formData, setFormData] = useState({
    valueGrams: 500,
    label: "",
    sortOrder: 0,
  });

  const { data: quickQuantities, refetch } = trpc.quickQuantities.list.useQuery();
  
  const createMutation = trpc.quickQuantities.create.useMutation({
    onSuccess: () => {
      toast.success("Quantidade rápida criada com sucesso!");
      refetch();
      closeDialog();
    },
    onError: (error) => {
      toast.error(`Erro ao criar quantidade rápida: ${error.message}`);
    },
  });

  const updateMutation = trpc.quickQuantities.update.useMutation({
    onSuccess: () => {
      toast.success("Quantidade rápida atualizada com sucesso!");
      refetch();
      closeDialog();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar quantidade rápida: ${error.message}`);
    },
  });

  const deleteMutation = trpc.quickQuantities.delete.useMutation({
    onSuccess: () => {
      toast.success("Quantidade rápida excluída com sucesso!");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao excluir quantidade rápida: ${error.message}`);
    },
  });

  const openCreateDialog = () => {
    setEditingQuantity(null);
    setFormData({ valueGrams: 500, label: "0.5kg", sortOrder: 0 });
    setIsDialogOpen(true);
  };

  const openEditDialog = (quantity: any) => {
    setEditingQuantity(quantity);
    setFormData({
      valueGrams: quantity.valueGrams,
      label: quantity.label,
      sortOrder: quantity.sortOrder || 0,
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingQuantity(null);
    setFormData({ valueGrams: 500, label: "0.5kg", sortOrder: 0 });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.label.trim()) {
      toast.error("Label é obrigatório");
      return;
    }

    if (formData.valueGrams <= 0) {
      toast.error("Valor em gramas deve ser maior que zero");
      return;
    }

    if (editingQuantity) {
      updateMutation.mutate({
        id: editingQuantity.id,
        ...formData,
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir esta quantidade rápida?")) {
      deleteMutation.mutate({ id });
    }
  };

  // Formatar gramas para exibição
  const formatGrams = (grams: number) => {
    if (grams >= 1000) {
      return `${(grams / 1000).toFixed(1)}kg`;
    }
    return `${grams}g`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-white">
      <div className="container py-8">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Quantidades Rápidas</CardTitle>
                <CardDescription>
                  Gerencie as opções de quantidade rápida disponíveis (0.5kg, 1kg, 2kg, etc.)
                </CardDescription>
              </div>
              <Button onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Nova Quantidade
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!quickQuantities || quickQuantities.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma quantidade rápida cadastrada
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Label</TableHead>
                    <TableHead>Valor (gramas)</TableHead>
                    <TableHead>Ordem</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quickQuantities.map((quantity) => (
                    <TableRow key={quantity.id}>
                      <TableCell className="font-medium">{quantity.label}</TableCell>
                      <TableCell>{formatGrams(quantity.valueGrams)}</TableCell>
                      <TableCell>{quantity.sortOrder}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(quantity)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(quantity.id)}
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
              {editingQuantity ? "Editar Quantidade Rápida" : "Nova Quantidade Rápida"}
            </DialogTitle>
            <DialogDescription>
              {editingQuantity
                ? "Atualize as informações da quantidade rápida"
                : "Adicione uma nova opção de quantidade rápida ao sistema"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="label">Label de Exibição *</Label>
                <Input
                  id="label"
                  placeholder="Ex: 0.5kg, 1kg, 500g"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="valueGrams">Valor em Gramas *</Label>
                <Input
                  id="valueGrams"
                  type="number"
                  min="1"
                  placeholder="Ex: 500 (para 0.5kg)"
                  value={formData.valueGrams}
                  onChange={(e) => setFormData({ ...formData, valueGrams: parseInt(e.target.value) || 0 })}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  1000g = 1kg. Ex: 500 para 0.5kg, 1500 para 1.5kg
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sortOrder">Ordem de Exibição</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  min="0"
                  placeholder="Ex: 1, 2, 3..."
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                />
                <p className="text-sm text-muted-foreground">
                  Menor número aparece primeiro
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingQuantity ? "Atualizar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
