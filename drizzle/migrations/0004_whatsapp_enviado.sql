-- Marca quando o operador abriu o WhatsApp do cliente para confirmar o pedido.
--
-- Fica no banco, e nao no navegador, porque a resposta muda conforme quem
-- olha: o balcao confirma pelo computador e a lojista acompanha pelo celular.
-- Guardado no localStorage, cada aparelho mostraria uma lista diferente de
-- "ja confirmados", que e pior que nao marcar nada.
--
-- E um horario, nao um sim/nao: saber QUANDO o cliente foi avisado responde
-- "ele ja sabe que o pedido saiu?" quando ele liga cobrando.
ALTER TABLE `orders` ADD `whatsappSentAt` integer;
