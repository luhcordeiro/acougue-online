# Guia Rápido - Sistema Açougue Online

## Início Rápido (5 minutos)

### 1. Instalar Docker

Se ainda não tem Docker instalado:

**Windows/Mac:**
- Baixe e instale o Docker Desktop: https://www.docker.com/products/docker-desktop

**Linux (Ubuntu/Debian):**
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Faça logout e login novamente
```

### 2. Obter o Projeto

```bash
# Clone ou extraia os arquivos do projeto
cd acougue_online
```

### 3. Configurar (IMPORTANTE!)

Edite o arquivo `docker-compose.yml` e altere:

```yaml
# Linha ~15: Altere a senha do banco
MYSQL_ROOT_PASSWORD: SUA_SENHA_SEGURA_AQUI
MYSQL_PASSWORD: SUA_SENHA_USUARIO_AQUI

# Linha ~35: Altere o JWT_SECRET
JWT_SECRET: GERE_UM_VALOR_ALEATORIO_AQUI
```

**Para gerar JWT_SECRET seguro:**
```bash
openssl rand -base64 32
```

### 4. Iniciar o Sistema

```bash
docker-compose up -d
```

Aguarde cerca de 1 minuto para o sistema inicializar completamente.

### 5. Acessar

Abra seu navegador em: **http://localhost:3000**

### 6. Popular com Dados de Exemplo (Opcional)

```bash
docker exec -i acougue_app node seed.mjs
```

Isso criará:
- 4 categorias (Carnes Bovinas, Suínas, Aves, Especiais)
- 12 produtos de exemplo com preços e estoques

### 7. Primeiro Login (Admin)

O primeiro usuário que fizer login será automaticamente o administrador. Para acessar o painel admin, clique em "Painel Admin" no menu superior.

---

## Comandos Úteis

### Ver logs
```bash
docker-compose logs -f
```

### Parar o sistema
```bash
docker-compose stop
```

### Reiniciar
```bash
docker-compose restart
```

### Parar e remover tudo
```bash
docker-compose down
```

### Backup do banco
```bash
docker exec acougue_db mysqldump -u acougue_user -pacougue_password acougue_online > backup.sql
```

---

## Estrutura do Sistema

### Interface do Cliente
- **Página Inicial**: Catálogo de produtos
- **Detalhes do Produto**: Visualização e seleção de quantidade em kg
- **Carrinho**: Revisão e finalização de pedidos
- **Meus Pedidos**: Histórico de compras

### Interface do Proprietário (Admin)
- **Dashboard**: Visão geral do sistema
- **Gerenciar Produtos**: Cadastro, edição e exclusão
- **Gerenciar Pedidos**: Visualização e atualização de status
- **Gerenciar Categorias**: Organização de produtos

---

## Fluxo de Uso

### Como Cliente:
1. Navegue pelos produtos
2. Clique em um produto para ver detalhes
3. Escolha a quantidade em kg
4. Adicione ao carrinho
5. Revise o carrinho e finalize o pedido
6. Acompanhe em "Meus Pedidos"

### Como Proprietário:
1. Acesse "Painel Admin"
2. Cadastre categorias
3. Cadastre produtos (nome, preço/kg, estoque, imagem)
4. Receba pedidos automaticamente
5. Atualize o status conforme prepara/entrega

---

## Próximos Passos

Após validar o sistema localmente:

1. **Configurar domínio próprio** (ex: acougue.com.br)
2. **Configurar SSL/HTTPS** com Certbot
3. **Ajustar senhas** para valores seguros
4. **Fazer backup** regular do banco de dados
5. **Personalizar** cores, logo e textos conforme sua marca

Para mais detalhes, consulte:
- `README.md` - Documentação completa
- `README_DOCKER.md` - Guia de implantação detalhado

---

## Suporte

Para dúvidas técnicas ou problemas, consulte a documentação completa ou entre em contato com o desenvolvedor.
