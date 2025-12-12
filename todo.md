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
