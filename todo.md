# TODO - Sistema Açougue Online

## Funcionalidades Principais
- [x] Criar tabela de categorias de produtos
- [x] Criar tabela de produtos
- [x] Criar tabela de pedidos
- [x] Criar tabela de itens de pedido
- [x] Sistema de autenticação de usuários
- [x] Controle de permissões (admin/cliente)

## Interface do Proprietário (Admin)
- [x] Página de login do admin com senha
- [x] Dashboard administrativo
- [x] CRUD de categorias
- [x] CRUD de produtos (nome, descrição, preço por kg, imagem, categoria)
- [x] Visualização de todos os pedidos
- [x] Filtro de pedidos por categoria
- [x] Atualização de status do pedido
- [x] Visualização de detalhes do pedido (itens, quantidades, total)

## Interface do Cliente
- [x] Catálogo de produtos com filtro por categoria
- [x] Visualização de detalhes do produto
- [x] Adicionar produtos ao carrinho (seleção por kg)
- [x] Carrinho de compras
- [x] Checkout simplificado (sem cadastro)
- [x] Histórico de pedidos do cliente

## Sistema de Agendamento e Entrega
- [x] Criar tabela de endereços de entrega
- [x] Adicionar campos de agendamento na tabela de pedidos (data/hora de entrega)
- [x] Criar interface de cadastro de endereços para o cliente
- [x] Permitir múltiplos endereços por cliente
- [x] Adicionar seleção de endereço no checkout
- [x] Adicionar seleção de data e hora de entrega no checkout
- [x] Validar horários de entrega disponíveis
- [x] Exibir informações de entrega no painel admin
- [x] Exibir endereço e agendamento nos detalhes do pedido
- [x] Atualizar testes unitários para cobrir novas funcionalidades

## Alterações Solicitadas
- [x] Simplificar checkout - remover sistema de cadastro de endereços
- [x] Permitir informar endereço diretamente no checkout (sem salvar)
- [x] Adicionar autenticação com senha para acesso ao painel admin
- [x] Criar filtro de pedidos por categoria no painel admin
- [x] Atualizar testes para refletir as mudanças
- [x] Remover rotas e componentes de endereços não utilizados

## Otimizações Mobile e Simplificação
- [x] Remover necessidade de cadastro/login para clientes
- [x] Adicionar campos de nome e telefone no checkout
- [x] Atualizar schema do banco para permitir pedidos sem userId
- [x] Tornar checkout totalmente anônimo (nome, telefone, endereço)
- [x] Otimizar interface mobile com design responsivo
- [x] Melhorar botões e campos para touch (tamanhos maiores)
- [x] Otimizar catálogo de produtos para visualização mobile
- [x] Melhorar navegação mobile (header sticky e responsivo)
- [x] Testar fluxo completo de compra no mobile
- [x] Atualizar testes unitários

## Infraestrutura
- [x] Configurar Git para versionamento
- [x] Criar Dockerfile
- [x] Criar docker-compose.yml
- [x] Documentação de instalação (README.md)
- [x] Script de seed para dados iniciais
- [x] Testes unitários (13 testes)
- [x] Subir projeto para GitHub

## Remover Opções de Login para Cliente
- [x] Remover página MyOrders (histórico de pedidos do cliente)
- [x] Remover rota /my-orders do App.tsx
- [x] Verificar e remover qualquer referência a login/cadastro na interface
- [x] Sistema totalmente anônimo - sem login/cadastro para clientes

## Correção na Página de Produto
- [x] Remover botão "Fazer Login para Comprar" da página ProductDetail
- [x] Adicionar botão "Adicionar ao Carrinho" diretamente na página de produto

## Simplificar Login Admin
- [x] Remover botão "Fazer Login" da página AdminDashboard que redireciona para OAuth
- [x] Usar apenas a senha simples do AdminLogin para acesso ao painel
- [x] Garantir que AdminDashboard aceite acesso direto após login com senha

## Otimizar Checkout para Mobile
- [x] Tornar tabela do carrinho totalmente responsiva (não cortar na horizontal)
- [x] Usar layout de cards ao invés de tabela em telas pequenas
- [x] Melhorar espaçamento e tamanhos de fonte para mobile
- [x] Garantir que todos os campos do formulário sejam visíveis e acessíveis

## Sistema de Tipos de Corte e Quantidades Pré-definidas
- [x] Criar tabela de tipos de corte no banco de dados
- [x] Criar relação muitos-para-muitos entre produtos e tipos de corte
- [x] Implementar CRUD de tipos de corte no painel admin
- [x] Todos os cortes disponíveis para todos os produtos (simplificado)
- [x] Adicionar seleção de tipo de corte na página de produto
- [x] Implementar botões de quantidades pré-definidas (0,5kg, 1kg, 1,5kg, 2kg)
- [x] Atualizar carrinho para exibir o tipo de corte selecionado
- [x] Atualizar pedidos para armazenar o tipo de corte de cada item
- [x] Exibir tipo de corte nos detalhes do pedido no painel admin
- [x] Atualizar testes unitários (16 testes passando)
- [x] Remover campo de quantidade editável do checkout (apenas exibição)

## Melhorias de UX
- [ ] Atualizar título do sistema para "Texas Bife Açougue - Pedidos Online" (requer alteração via Management UI → Settings → General)
- [x] Adicionar exibição de categoria na página de produtos (catálogo) para facilitar busca no mobile (já implementado com badges)
- [x] Adicionar filtro por categoria na página inicial com botões acima da grade de produtos
- [x] Implementar busca por nome de produto na página inicial
- [x] Remover autenticação OAuth da tela de admin (manter apenas login com senha simples)
- [x] Implementar página de confirmação de pedido com resumo detalhado e botão para compartilhar via WhatsApp

## Notificações
- [x] Implementar notificação automática ao proprietário quando novo pedido com status 'Pendente' for criado

## Sistema de Status de Pedidos
- [x] Implementar sistema de cores por status (Pendente=amarelo, Confirmado=azul, Preparando=roxo, Pronto=verde, Entregue=cinza, Cancelado=vermelho)
- [x] Adicionar filtros por status no painel admin
- [x] Implementar atualização visual de status em tempo real

## Tipos de Corte por Produto
- [x] Criar tabela de relacionamento produto-tipo de corte no schema (já existia)
- [x] Implementar funções de banco de dados para gerenciar associações (já existiam)
- [x] Criar rotas tRPC para gerenciar tipos de corte por produto (já existiam)
- [x] Atualizar interface de cadastro de produto com seleção de tipos de corte
- [x] Atualizar página de detalhes do produto para mostrar apenas cortes disponíveis
- [x] Testar funcionalidade completa de tipos de corte por produto

## Sistema de Quantidades Rápidas por Produto
- [x] Criar tabela de quantidades rápidas no schema (id, valor em kg, label)
- [x] Criar tabela de relacionamento produto-quantidade no schema
- [x] Implementar funções de banco de dados para gerenciar quantidades
- [x] Criar rotas tRPC para CRUD de quantidades e associação com produtos
- [x] Criar interface de CRUD de quantidades no painel admin
- [x] Atualizar cadastro de produtos com seleção de quantidades disponíveis
- [x] Atualizar página de detalhes do produto para usar quantidades personalizadas
- [x] Testar funcionalidade completa

## Taxa de Entrega e Simplificação do Checkout
- [x] Criar tabela de configurações no banco de dados para armazenar taxa de entrega
- [x] Criar interface no admin para configurar valor da taxa de entrega
- [x] Atualizar checkout para exibir e somar taxa de entrega ao total
- [x] Remover campo de data/hora de entrega do checkout
- [x] Atualizar página de confirmação para exibir taxa de entrega
- [x] Atualizar painel admin para exibir taxa de entrega nos pedidos
- [x] Testar fluxo completo de checkout com taxa de entrega

## Melhorias na Gestão de Pedidos
- [x] Exibir nome do cliente na tela de pedidos do admin
