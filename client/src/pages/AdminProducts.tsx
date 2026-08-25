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
import { Pencil, Trash2, Plus, Upload, Scissors, Scale, X, ArrowLeft, Package, Search, CheckSquare, Power, PowerOff } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { useLocation } from "wouter";

export default function AdminProducts() {
  const [, setLocation] = useLocation();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    categoryId: "",
    pricePerKg: "",
    available: true,
    imageUrl: "",
    imageKey: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [selectedCutTypes, setSelectedCutTypes] = useState<number[]>([]);
  const [selectedQuickQuantities, setSelectedQuickQuantities] = useState<number[]>([]);
  
  // Estados para seleção múltipla e filtro
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const utils = trpc.useUtils();
  const { data: products = [], isLoading } = trpc.products.list.useQuery();
  const { data: categories = [] } = trpc.categories.list.useQuery();
  const { data: cutTypes = [] } = trpc.cutTypes.list.useQuery();
  const { data: quickQuantities = [] } = trpc.quickQuantities.list.useQuery();
  
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
  
  // Mutations para quantidades rápidas
  const addQuickQuantityMutation = trpc.quickQuantities.addToProduct.useMutation({
    onSuccess: () => {
      utils.quickQuantities.getByProduct.invalidate();
    },
  });
  
  const removeQuickQuantityMutation = trpc.quickQuantities.removeFromProduct.useMutation({
    onSuccess: () => {
      utils.quickQuantities.getByProduct.invalidate();
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
      // Salvar quantidades rápidas para o novo produto
      if (result.id && selectedQuickQuantities.length > 0) {
        for (const quickQuantityId of selectedQuickQuantities) {
          await addQuickQuantityMutation.mutateAsync({ productId: result.id, quickQuantityId });
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
        
        // Atualizar quantidades rápidas do produto
        const currentQuickQuantities = await utils.quickQuantities.getByProduct.fetch({ productId: editingProduct });
        const currentQQIds = currentQuickQuantities.map((qq: any) => qq.id);
        
        // Remover quantidades que foram desmarcadas
        for (const id of currentQQIds) {
          if (!selectedQuickQuantities.includes(id)) {
            await removeQuickQuantityMutation.mutateAsync({ productId: editingProduct, quickQuantityId: id });
          }
        }
        
        // Adicionar novas quantidades
        for (const id of selectedQuickQuantities) {
          if (!currentQQIds.includes(id)) {
            await addQuickQuantityMutation.mutateAsync({ productId: editingProduct, quickQuantityId: id });
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

  const bulkUpdateMutation = trpc.products.bulkUpdateAvailability.useMutation({
    onSuccess: (result) => {
      toast.success(`${result.count} produto(s) atualizado(s) com sucesso!`);
      utils.products.list.invalidate();
      setSelectedProducts([]);
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar produtos: ${error.message}`);
    },
  });

  // Filtrar produtos pela busca
  const filteredProducts = products.filter((product) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const category = categories.find(c => c.id === product.categoryId);
    return (
      product.name.toLowerCase().includes(query) ||
      (category?.name || "").toLowerCase().includes(query) ||
      (product.description || "").toLowerCase().includes(query)
    );
  });

  // Funções para seleção múltipla
  const handleSelectAll = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts.map(p => p.id));
    }
  };

  const handleSelectProduct = (productId: number) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleBulkActivate = () => {
    if (selectedProducts.length === 0) {
      toast.error("Selecione pelo menos um produto");
      return;
    }
    bulkUpdateMutation.mutate({ productIds: selectedProducts, available: true });
  };

  const handleBulkDeactivate = () => {
    if (selectedProducts.length === 0) {
      toast.error("Selecione pelo menos um produto");
      return;
    }
    bulkUpdateMutation.mutate({ productIds: selectedProducts, available: false });
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      categoryId: "",
      pricePerKg: "",
      available: true,
      imageUrl: "",
      imageKey: "",
    });
    setImageFile(null);
    setSelectedCutTypes([]);
    setSelectedQuickQuantities([]);
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
      available: product.available,
      imageUrl: product.imageUrl || "",
      imageKey: product.imageKey || "",
    });
    // Carregar tipos de corte do produto
    const productCutTypes = await utils.cutTypes.getByProduct.fetch({ productId: product.id });
    setSelectedCutTypes(productCutTypes.map((ct: any) => ct.id));
    // Carregar quantidades rápidas do produto
    const productQuickQuantities = await utils.quickQuantities.getByProduct.fetch({ productId: product.id });
    setSelectedQuickQuantities(productQuickQuantities.map((qq: any) => qq.id));
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-red-600 text-white shadow-lg">
        <div className="container py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setLocation("/admin")}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div className="flex items-center gap-2">
              <Package className="h-6 w-6" />
              <h1 className="text-xl font-bold">Gerenciar Produtos</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <div className="flex justify-between items-center mb-6">
        <div>
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
                <Label className="flex items-center gap-2">
                  <Scale className="h-4 w-4" />
                  Quantidades Rápidas Disponíveis
                </Label>
                <div className="grid grid-cols-2 gap-2 mt-2 p-3 border rounded-md bg-muted/30">
                  {quickQuantities.length === 0 ? (
                    <p className="text-sm text-muted-foreground col-span-2">Nenhuma quantidade rápida cadastrada</p>
                  ) : (
                    quickQuantities.map((qq) => (
                      <div key={qq.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`quickQuantity-${qq.id}`}
                          checked={selectedQuickQuantities.includes(qq.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedQuickQuantities([...selectedQuickQuantities, qq.id]);
                            } else {
                              setSelectedQuickQuantities(selectedQuickQuantities.filter(id => id !== qq.id));
                            }
                          }}
                        />
                        <label
                          htmlFor={`quickQuantity-${qq.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {qq.label}
                        </label>
                      </div>
                    ))
                  )}
                </div>
                {selectedQuickQuantities.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedQuickQuantities.length} quantidade(s) rápida(s) selecionada(s)
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
            {filteredProducts.length} de {products.length} produto(s)
            {selectedProducts.length > 0 && ` • ${selectedProducts.length} selecionado(s)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Barra de busca e ações em massa */}
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, categoria ou descrição..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {selectedProducts.length > 0 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkActivate}
                  disabled={bulkUpdateMutation.isPending}
                  className="text-green-600 border-green-600 hover:bg-green-50"
                >
                  <Power className="h-4 w-4 mr-2" />
                  Ativar ({selectedProducts.length})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkDeactivate}
                  disabled={bulkUpdateMutation.isPending}
                  className="text-red-600 border-red-600 hover:bg-red-50"
                >
                  <PowerOff className="h-4 w-4 mr-2" />
                  Desativar ({selectedProducts.length})
                </Button>
              </div>
            )}
          </div>

          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Carregando produtos...</p>
          ) : filteredProducts.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              {products.length === 0 
                ? 'Nenhum produto cadastrado. Clique em "Novo Produto" para começar.'
                : 'Nenhum produto encontrado com os filtros aplicados.'}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Imagem</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Preço/Kg</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => {
                  const category = categories.find(c => c.id === product.categoryId);
                  return (
                    <TableRow key={product.id} className={selectedProducts.includes(product.id) ? "bg-muted/50" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={selectedProducts.includes(product.id)}
                          onCheckedChange={() => handleSelectProduct(product.id)}
                        />
                      </TableCell>
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
      </main>
    </div>
  );
}
