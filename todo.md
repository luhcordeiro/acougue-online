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
