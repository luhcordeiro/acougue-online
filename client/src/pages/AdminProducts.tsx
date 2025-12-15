import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Trash2, Plus, Upload, Scissors, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { useLocation } from "wouter";

export default function AdminProducts() {
  const [, setLocation] = useLocation();
  
  // Verificar autenticação com senha
  const isAdminAuthenticated = sessionStorage.getItem("adminAuthenticated") === "true";
  
  // Redirecionar para login do admin se não estiver autenticado com senha
  if (!isAdminAuthenticated) {
    setLocation("/admin/login");
    return null;
  }
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    categoryId: "",
    pricePerKg: "",
    stockKg: "",
    available: true,
    imageUrl: "",
    imageKey: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [selectedCutTypes, setSelectedCutTypes] = useState<number[]>([]);

  const utils = trpc.useUtils();
  const { data: products = [], isLoading } = trpc.products.list.useQuery();
  const { data: categories = [] } = trpc.categories.list.useQuery();
  const { data: cutTypes = [] } = trpc.cutTypes.list.useQuery();
  
  // Mutations para tipos de corte
  const addCutTypeMutation = trpc.cutTypes.addToProduct.useMutation({
    onSuccess: () => {
      utils.cutTypes.getByProduct.invalidate();
    },
  });
  
  const removeCutTypeMutation = trpc.cutTypes.removeFromProduct.useMutation({
    onSuccess: () => {
      utils.cutTypes.getByProduct.invalidate();
    },
  });
  
  const createMutation = trpc.products.create.useMutation({
    onSuccess: async (result) => {
      // Salvar tipos de corte para o novo produto
      if (result.id && selectedCutTypes.length > 0) {
        for (const cutTypeId of selectedCutTypes) {
          await addCutTypeMutation.mutateAsync({ productId: result.id, cutTypeId });
        }
      }
      toast.success("Produto criado com sucesso!");
      utils.products.list.invalidate();
      resetForm();
    },
    onError: (error) => {
      toast.error(`Erro ao criar produto: ${error.message}`);
    },
  });

  const updateMutation = trpc.products.update.useMutation({
    onSuccess: async () => {
      // Atualizar tipos de corte do produto
      if (editingProduct) {
        // Buscar tipos de corte atuais
        const currentCutTypes = await utils.cutTypes.getByProduct.fetch({ productId: editingProduct });
        const currentIds = currentCutTypes.map((ct: any) => ct.id);
        
        // Remover tipos de corte que foram desmarcados
        for (const id of currentIds) {
          if (!selectedCutTypes.includes(id)) {
            await removeCutTypeMutation.mutateAsync({ productId: editingProduct, cutTypeId: id });
          }
        }
        
        // Adicionar novos tipos de corte
        for (const id of selectedCutTypes) {
          if (!currentIds.includes(id)) {
            await addCutTypeMutation.mutateAsync({ productId: editingProduct, cutTypeId: id });
          }
        }
      }
      toast.success("Produto atualizado com sucesso!");
      utils.products.list.invalidate();
      resetForm();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar produto: ${error.message}`);
    },
  });

  const deleteMutation = trpc.products.delete.useMutation({
    onSuccess: () => {
      toast.success("Produto excluído com sucesso!");
      utils.products.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao excluir produto: ${error.message}`);
    },
  });

  const uploadImageMutation = trpc.products.uploadImage.useMutation({
    onError: (error) => {
      toast.error(`Erro ao fazer upload da imagem: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      categoryId: "",
      pricePerKg: "",
      stockKg: "",
      available: true,
      imageUrl: "",
      imageKey: "",
    });
    setImageFile(null);
    setSelectedCutTypes([]);
    setEditingProduct(null);
    setIsDialogOpen(false);
  };

  const handleEdit = async (product: any) => {
    setEditingProduct(product.id);
    setFormData({
      name: product.name,
      description: product.description || "",
      categoryId: product.categoryId?.toString() || "",
      pricePerKg: (product.pricePerKg / 100).toString(),
      stockKg: (product.stockKg / 1000).toString(),
      available: product.available,
      imageUrl: product.imageUrl || "",
      imageKey: product.imageKey || "",
    });
    // Carregar tipos de corte do produto
    const productCutTypes = await utils.cutTypes.getByProduct.fetch({ productId: product.id });
    setSelectedCutTypes(productCutTypes.map((ct: any) => ct.id));
    setIsDialogOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let imageUrl = formData.imageUrl;
    let imageKey = formData.imageKey;
    
    // Upload da imagem se houver
    if (imageFile) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result?.toString().split(',')[1];
        if (base64) {
          const uploadResult = await uploadImageMutation.mutateAsync({
            fileName: imageFile.name,
            fileData: base64,
            mimeType: imageFile.type,
          });
          imageUrl = uploadResult.url;
          imageKey = uploadResult.key;
          
          submitProduct(imageUrl, imageKey);
        }
      };
      reader.readAsDataURL(imageFile);
    } else {
      submitProduct(imageUrl, imageKey);
    }
  };

  const submitProduct = (imageUrl: string, imageKey: string) => {
    const data = {
      name: formData.name,
      description: formData.description || undefined,
      categoryId: formData.categoryId ? parseInt(formData.categoryId) : undefined,
      pricePerKg: Math.round(parseFloat(formData.pricePerKg) * 100), // Converter para centavos
      stockKg: Math.round(parseFloat(formData.stockKg) * 1000), // Converter para gramas
      available: formData.available,
      imageUrl: imageUrl || undefined,
      imageKey: imageKey || undefined,
    };

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este produto?")) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Produtos</h1>
          <p className="text-muted-foreground">Cadastre e gerencie os produtos do açougue</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Produto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? "Editar Produto" : "Novo Produto"}</DialogTitle>
              <DialogDescription>
                Preencha os dados do produto. O preço é por kg.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome do Produto *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Ex: Picanha, Alcatra, Frango"
                />
              </div>
              
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descreva o produto..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="category">Categoria</Label>
                <Select
                  value={formData.categoryId}
                  onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem categoria</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Preço por Kg (R$) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.pricePerKg}
                    onChange={(e) => setFormData({ ...formData, pricePerKg: e.target.value })}
                    required
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <Label htmlFor="stock">Estoque (Kg)</Label>
                  <Input
                    id="stock"
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.stockKg}
                    onChange={(e) => setFormData({ ...formData, stockKg: e.target.value })}
                    placeholder="0.0"
                  />
                </div>
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <Scissors className="h-4 w-4" />
                  Tipos de Corte Disponíveis
                </Label>
                <div className="grid grid-cols-2 gap-2 mt-2 p-3 border rounded-md bg-muted/30">
                  {cutTypes.length === 0 ? (
                    <p className="text-sm text-muted-foreground col-span-2">Nenhum tipo de corte cadastrado</p>
                  ) : (
                    cutTypes.map((cutType) => (
                      <div key={cutType.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`cutType-${cutType.id}`}
                          checked={selectedCutTypes.includes(cutType.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedCutTypes([...selectedCutTypes, cutType.id]);
                            } else {
                              setSelectedCutTypes(selectedCutTypes.filter(id => id !== cutType.id));
                            }
                          }}
                        />
                        <label
                          htmlFor={`cutType-${cutType.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {cutType.name}
                        </label>
                      </div>
                    ))
                  )}
                </div>
                {selectedCutTypes.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedCutTypes.length} tipo(s) de corte selecionado(s)
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="image">Imagem do Produto</Label>
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                />
                {formData.imageUrl && (
                  <img src={formData.imageUrl} alt="Preview" className="mt-2 h-32 w-32 object-cover rounded" />
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="available"
                  checked={formData.available}
                  onCheckedChange={(checked) => setFormData({ ...formData, available: checked })}
                />
                <Label htmlFor="available">Produto disponível para venda</Label>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingProduct ? "Atualizar" : "Criar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Produtos Cadastrados</CardTitle>
          <CardDescription>
            {products.length} produto(s) no total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Carregando produtos...</p>
          ) : products.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              Nenhum produto cadastrado. Clique em "Novo Produto" para começar.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Imagem</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Preço/Kg</TableHead>
                  <TableHead>Estoque</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => {
                  const category = categories.find(c => c.id === product.categoryId);
                  return (
                    <TableRow key={product.id}>
                      <TableCell>
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name} className="h-12 w-12 object-cover rounded" />
                        ) : (
                          <div className="h-12 w-12 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                            Sem imagem
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{category?.name || "—"}</TableCell>
                      <TableCell>R$ {(product.pricePerKg / 100).toFixed(2)}</TableCell>
                      <TableCell>{(product.stockKg / 1000).toFixed(1)} kg</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          product.available 
                            ? "bg-green-100 text-green-800" 
                            : "bg-gray-100 text-gray-800"
                        }`}>
                          {product.available ? "Disponível" : "Indisponível"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(product)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(product.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
