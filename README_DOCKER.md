# Guia de Implantação com Docker

Este guia fornece instruções detalhadas para implantar o Sistema Açougue Online usando Docker e Docker Compose.

## Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- **Docker** (versão 20.10 ou superior)
  - Linux: `curl -fsSL https://get.docker.com | sh`
  - Windows/Mac: Baixe o Docker Desktop em https://www.docker.com/products/docker-desktop

- **Docker Compose** (versão 2.0 ou superior)
  - Geralmente incluído no Docker Desktop
  - Linux: `sudo apt-get install docker-compose-plugin`

## Configuração Inicial

### Passo 1: Obter o Código

Clone o repositório ou extraia os arquivos do projeto:

```bash
git clone <url-do-repositorio>
cd acougue_online
```

### Passo 2: Configurar Variáveis de Ambiente

O sistema já está configurado com valores padrão no `docker-compose.yml`, mas você **deve** configurar as seguintes variáveis para produção:

#### Opção A: Editar docker-compose.yml diretamente

Abra o arquivo `docker-compose.yml` e edite a seção `environment` do serviço `app`:

```yaml
environment:
  # IMPORTANTE: Altere o JWT_SECRET para um valor aleatório seguro
  JWT_SECRET: "GERE-UM-VALOR-ALEATORIO-AQUI"
  
  # Configure com suas credenciais Manus OAuth
  VITE_APP_ID: "seu-app-id-manus"
  OWNER_OPEN_ID: "seu-openid-manus"
  OWNER_NAME: "Nome do Administrador"
```

#### Opção B: Usar arquivo .env (recomendado)

Crie um arquivo `.env` na raiz do projeto:

```env
# JWT Secret - GERE UM VALOR SEGURO!
# Exemplo: openssl rand -base64 32
JWT_SECRET=sua-chave-secreta-muito-segura-aqui

# Manus OAuth
VITE_APP_ID=seu-app-id-aqui
OWNER_OPEN_ID=seu-openid-aqui
OWNER_NAME=Nome do Administrador

# Opcional: URLs customizadas
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://login.manus.im
```

### Passo 3: Gerar JWT Secret Seguro

Execute um dos comandos abaixo para gerar uma chave segura:

```bash
# Linux/Mac
openssl rand -base64 32

# Ou usando Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Copie o resultado e use como valor de `JWT_SECRET`.

## Executando a Aplicação

### Iniciar os Containers

```bash
docker-compose up -d
```

Este comando irá:
1. Baixar a imagem do MySQL 8.0
2. Construir a imagem da aplicação
3. Criar e iniciar os containers
4. Configurar a rede entre os containers
5. Aplicar as migrações do banco de dados

### Verificar Status

```bash
docker-compose ps
```

Você deve ver dois containers rodando:
- `acougue_db` (MySQL)
- `acougue_app` (Aplicação Node.js)

### Popular com Dados de Exemplo (Opcional)

Para adicionar produtos de exemplo ao banco:

```bash
docker exec -i acougue_app node seed.mjs
```

### Acessar a Aplicação

Abra seu navegador e acesse:

```
http://localhost:3000
```

## Gerenciamento dos Containers

### Ver Logs em Tempo Real

```bash
# Todos os serviços
docker-compose logs -f

# Apenas a aplicação
docker-compose logs -f app

# Apenas o banco de dados
docker-compose logs -f db
```

### Parar os Containers

```bash
docker-compose stop
```

### Reiniciar os Containers

```bash
docker-compose restart
```

### Parar e Remover Containers

```bash
docker-compose down
```

**ATENÇÃO**: Para remover também os dados do banco de dados:

```bash
docker-compose down -v
```

### Reconstruir Após Mudanças no Código

```bash
docker-compose up -d --build app
```

## Acesso ao Banco de Dados

### Via Linha de Comando

```bash
docker exec -it acougue_db mysql -u acougue_user -p
# Senha: acougue_password
```

Depois, selecione o banco:

```sql
USE acougue_online;
SHOW TABLES;
```

### Via Cliente MySQL Externo

Configure seu cliente MySQL favorito (MySQL Workbench, DBeaver, etc.) com:

- **Host**: localhost
- **Porta**: 3306
- **Usuário**: acougue_user
- **Senha**: acougue_password
- **Banco**: acougue_online

## Backup e Restauração

### Criar Backup do Banco de Dados

```bash
docker exec acougue_db mysqldump -u acougue_user -pacougue_password acougue_online > backup_$(date +%Y%m%d).sql
```

### Restaurar Backup

```bash
docker exec -i acougue_db mysql -u acougue_user -pacougue_password acougue_online < backup_20250125.sql
```

## Implantação em Servidor de Produção

### Passo 1: Preparar o Servidor

Instale Docker e Docker Compose no servidor:

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

### Passo 2: Transferir os Arquivos

Use Git, SCP ou FTP para transferir o projeto para o servidor:

```bash
# Via Git (recomendado)
git clone <url-do-repositorio>

# Ou via SCP
scp -r acougue_online/ usuario@servidor:/caminho/destino/
```

### Passo 3: Configurar Variáveis de Ambiente

Edite o `docker-compose.yml` ou crie um arquivo `.env` com as configurações de produção.

**IMPORTANTE**: Altere as senhas padrão do banco de dados!

```yaml
environment:
  MYSQL_ROOT_PASSWORD: senha-root-segura-aqui
  MYSQL_PASSWORD: senha-usuario-segura-aqui
```

### Passo 4: Configurar Proxy Reverso (Opcional)

Para usar um domínio próprio com HTTPS, configure um proxy reverso (Nginx ou Traefik):

**Exemplo com Nginx:**

```nginx
server {
    listen 80;
    server_name seudominio.com.br;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Passo 5: Iniciar em Produção

```bash
docker-compose up -d
```

### Passo 6: Configurar SSL/HTTPS (Recomendado)

Use Certbot para obter certificados gratuitos:

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d seudominio.com.br
```

## Monitoramento

### Verificar Uso de Recursos

```bash
docker stats
```

### Verificar Saúde dos Containers

```bash
docker-compose ps
```

## Solução de Problemas

### Container não inicia

Verifique os logs:
```bash
docker-compose logs app
```

### Erro de conexão com banco de dados

1. Verifique se o container do banco está rodando:
   ```bash
   docker-compose ps db
   ```

2. Verifique a saúde do banco:
   ```bash
   docker exec acougue_db mysqladmin -u root -p ping
   ```

### Aplicação não responde

Reinicie os containers:
```bash
docker-compose restart
```

### Limpar tudo e recomeçar

```bash
docker-compose down -v
docker-compose up -d --build
```

## Atualizações

Para atualizar o sistema após mudanças no código:

```bash
# Parar containers
docker-compose down

# Puxar atualizações (se usando Git)
git pull

# Reconstruir e iniciar
docker-compose up -d --build
```

## Segurança em Produção

### Checklist de Segurança

- [ ] Alterar `JWT_SECRET` para um valor aleatório seguro
- [ ] Alterar senhas do MySQL (`MYSQL_ROOT_PASSWORD` e `MYSQL_PASSWORD`)
- [ ] Configurar firewall para bloquear porta 3306 (MySQL) externamente
- [ ] Usar HTTPS com certificado SSL válido
- [ ] Configurar backup automático do banco de dados
- [ ] Limitar acesso SSH ao servidor
- [ ] Manter Docker e sistema operacional atualizados
- [ ] Configurar logs e monitoramento

## Recursos Adicionais

- Documentação do Docker: https://docs.docker.com
- Documentação do Docker Compose: https://docs.docker.com/compose
- Documentação do MySQL: https://dev.mysql.com/doc

## Suporte

Para problemas ou dúvidas sobre a implantação, consulte a documentação ou entre em contato com o desenvolvedor.
