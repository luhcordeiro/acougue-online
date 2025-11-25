# Açougue Online - Sistema de Pedidos

Sistema completo de gerenciamento de pedidos para açougue, com interface administrativa para cadastro de produtos e interface de cliente para realização de pedidos com seleção de quantidade em kg.

## Funcionalidades

### Interface do Proprietário (Admin)
- Dashboard administrativo com estatísticas
- Cadastro e gerenciamento de categorias de produtos
- Cadastro e gerenciamento de produtos (nome, descrição, preço/kg, imagem, estoque)
- Visualização e gerenciamento de pedidos
- Atualização de status dos pedidos
- Upload de imagens para produtos

### Interface do Cliente
- Catálogo de produtos disponíveis
- Visualização detalhada de produtos
- Seleção de quantidade em kg
- Carrinho de compras com cálculo automático de preços
- Finalização de pedidos
- Histórico de pedidos
- Sistema de autenticação

## Tecnologias Utilizadas

- **Frontend**: React 19 + TypeScript + Tailwind CSS 4
- **Backend**: Node.js + Express + tRPC 11
- **Banco de Dados**: MySQL 8.0
- **Autenticação**: Manus OAuth
- **ORM**: Drizzle ORM
- **Containerização**: Docker + Docker Compose

## Pré-requisitos

- Docker (versão 20.10 ou superior)
- Docker Compose (versão 2.0 ou superior)

## Instalação e Execução com Docker

### 1. Clone o repositório

```bash
git clone <url-do-repositorio>
cd acougue_online
```

### 2. Configure as variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
# Database
DATABASE_URL=mysql://acougue_user:acougue_password@db:3306/acougue_online

# JWT Secret (GERE UM VALOR ALEATÓRIO SEGURO!)
JWT_SECRET=sua-chave-secreta-muito-segura-aqui

# OAuth (obtenha em https://manus.im)
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://login.manus.im
VITE_APP_ID=seu-app-id-aqui

# Owner (primeiro admin do sistema)
OWNER_OPEN_ID=seu-openid-aqui
OWNER_NAME=Nome do Administrador

# App Config
VITE_APP_TITLE=Açougue Online - Sistema de Pedidos
VITE_APP_LOGO=
```

### 3. Inicie os containers

```bash
docker-compose up -d
```

Este comando irá:
- Baixar as imagens necessárias
- Criar o container do banco de dados MySQL
- Construir e iniciar o container da aplicação
- Aplicar as migrações do banco de dados automaticamente

### 4. Acesse a aplicação

Abra seu navegador e acesse: `http://localhost:3000`

### 5. Primeiro acesso (Admin)

O primeiro usuário que fizer login com o `OWNER_OPEN_ID` configurado será automaticamente promovido a administrador e terá acesso ao painel administrativo.

## Comandos Úteis

### Ver logs da aplicação
```bash
docker-compose logs -f app
```

### Ver logs do banco de dados
```bash
docker-compose logs -f db
```

### Parar os containers
```bash
docker-compose down
```

### Parar e remover volumes (CUIDADO: apaga o banco de dados)
```bash
docker-compose down -v
```

### Reconstruir a aplicação após mudanças no código
```bash
docker-compose up -d --build app
```

### Acessar o shell do container da aplicação
```bash
docker exec -it acougue_app sh
```

### Acessar o MySQL diretamente
```bash
docker exec -it acougue_db mysql -u acougue_user -p acougue_online
# Senha: acougue_password
```

## Desenvolvimento Local (sem Docker)

Se preferir executar localmente para desenvolvimento:

### 1. Instale as dependências
```bash
pnpm install
```

### 2. Configure o banco de dados MySQL local

Crie um banco de dados MySQL e configure a `DATABASE_URL` no arquivo `.env`:

```env
DATABASE_URL=mysql://usuario:senha@localhost:3306/acougue_online
```

### 3. Execute as migrações
```bash
pnpm db:push
```

### 4. Inicie o servidor de desenvolvimento
```bash
pnpm dev
```

A aplicação estará disponível em `http://localhost:3000`

## Estrutura do Projeto

```
acougue_online/
├── client/                 # Frontend React
│   ├── public/            # Arquivos estáticos
│   └── src/
│       ├── pages/         # Páginas da aplicação
│       ├── components/    # Componentes reutilizáveis
│       └── lib/           # Configurações (tRPC, etc)
├── server/                # Backend Express + tRPC
│   ├── routers.ts         # Definição das rotas tRPC
│   ├── db.ts              # Funções de banco de dados
│   └── storage.ts         # Gerenciamento de arquivos S3
├── drizzle/               # Schema e migrações do banco
│   └── schema.ts          # Definição das tabelas
├── Dockerfile             # Configuração Docker
├── docker-compose.yml     # Orquestração de containers
└── README.md              # Este arquivo
```

## Fluxo de Uso

### Para o Proprietário (Admin)

1. Faça login com a conta de administrador
2. Acesse o "Painel Admin" no menu superior
3. Cadastre categorias em "Gerenciar Categorias"
4. Cadastre produtos em "Gerenciar Produtos" (nome, preço/kg, estoque, imagem)
5. Acompanhe os pedidos em "Gerenciar Pedidos"
6. Atualize o status dos pedidos conforme o andamento

### Para o Cliente

1. Acesse a loja e navegue pelos produtos disponíveis
2. Clique em um produto para ver detalhes
3. Selecione a quantidade desejada em kg
4. Adicione ao carrinho
5. Revise o carrinho e finalize o pedido
6. Acompanhe seus pedidos em "Meus Pedidos"

## Modelo de Dados

### Tabelas Principais

- **users**: Usuários do sistema (clientes e admins)
- **categories**: Categorias de produtos
- **products**: Produtos do açougue (preço em centavos/kg, estoque em gramas)
- **orders**: Pedidos realizados (total em centavos)
- **orderItems**: Itens de cada pedido (quantidade em gramas)

### Observações sobre Armazenamento

- **Preços**: Armazenados em centavos para evitar problemas de precisão decimal
- **Quantidades**: Armazenadas em gramas (1 kg = 1000 gramas)
- **Imagens**: Armazenadas em S3 (URLs e chaves salvas no banco)

## Segurança

- Autenticação via Manus OAuth
- Senhas e tokens gerenciados de forma segura
- Controle de acesso baseado em roles (admin/user)
- Validação de dados no backend
- Proteção contra SQL injection (via ORM)

## Suporte

Para dúvidas ou problemas, entre em contato com o desenvolvedor.

## Licença

Todos os direitos reservados © 2025
