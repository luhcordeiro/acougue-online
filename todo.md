# TODO - Sistema Açougue Online

## Configuração Inicial
- [x] Definir modelo de dados (produtos, pedidos, usuários, carrinho)
- [x] Configurar schema do banco de dados
- [x] Criar seeds iniciais para testes

## Interface do Proprietário (Admin)
- [x] Tela de login/autenticação
- [x] Dashboard administrativo
- [x] Cadastro de produtos (nome, descrição, preço por kg, imagem, estoque)
- [x] Listagem de produtos com edição e exclusão
- [x] Visualização de pedidos recebidos
- [x] Atualização de status dos pedidos
- [x] Gestão de categorias de produtos

## Interface do Cliente
- [x] Tela inicial com catálogo de produtos
- [x] Visualização de detalhes do produto
- [x] Seleção de quantidade em kg (com input numérico)
- [x] Carrinho de compras
- [x] Cálculo automático de preço (preço/kg × quantidade)
- [x] Finalização de pedido
- [x] Histórico de pedidos do cliente
- [x] Sistema de autenticação para clientes

## Funcionalidades Adicionais
- [x] Upload de imagens para produtos
- [x] Sistema de notificações para novos pedidos
- [x] Validação de estoque
- [x] Testes unitários com Vitest

## Infraestrutura
- [x] Configurar repositório Git
- [x] Criar Dockerfile para containerização
- [x] Criar docker-compose.yml
- [x] Documentação de instalação e uso
- [x] Checkpoint final

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
