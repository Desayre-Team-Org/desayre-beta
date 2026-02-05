# 🚀 Guia de Deploy - DESAYRE Platform

## ✅ Checklist de Verificação das Chaves

### ⚠️ Problemas Encontrados no seu .env.example:

| Variável | Status | Ação Necessária |
|----------|--------|-----------------|
| `DATABASE_URL` | ✅ OK | Neon configurado corretamente |
| `UPSTASH_REDIS_REST_URL` | ✅ OK | URL válida |
| `UPSTASH_REDIS_REST_TOKEN` | ✅ OK | Token válido |
| `R2_ACCOUNT_ID` | ✅ OK | ID da Cloudflare |
| `R2_ACCESS_KEY_ID` | ✅ OK | Chave de acesso |
| `R2_SECRET_ACCESS_KEY` | ✅ OK | Secret key |
| `R2_BUCKET_NAME` | ✅ OK | `desayre-media` |
| `MODELS_LABS_API_KEY` | ✅ OK | Chave ModelsLabs |
| `XAI_API_KEY` | ✅ OK | Chave xAI |
| `JWT_SECRET` | ⚠️ **PRECISA MUDAR** | Está com valor padrão |
| `ADMIN_PASSWORD_HASH` | ⚠️ **PRECISA GERAR** | Está vazio |
| `NEXT_PUBLIC_APP_URL` | ✅ OK | Localhost configurado |

---

## 🔧 PASSO 1: Corrigir JWT_SECRET

O `JWT_SECRET` está com valor padrão. Você precisa gerar um segredo único:

### Opção A - Online (Mais Fácil):
1. Acesse: https://jwtsecret.com/generate
2. Copie o segredo gerado
3. Substitua no `.env.local`:
```env
JWT_SECRET="segundo-que-voc-copiou-do-site"
```

### Opção B - Terminal:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## 🔐 PASSO 2: Gerar ADMIN_PASSWORD_HASH

Você precisa criar o hash da senha do administrador:

### Execute no terminal:
```bash
# Usando o script que criamos
node scripts/setup-admin.mjs "sua-senha-segura-aqui"
```

### Exemplo de saída:
```
========================================
Password: sua-senha-segura-aqui
Hash: $2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G
========================================

Adicione este hash ao seu .env.local:
ADMIN_PASSWORD_HASH="$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G"
```

**⚠️ Importante:** Guarde a senha original! Você precisará dela para fazer login.

---

## 📁 PASSO 3: Criar arquivo .env.local

Copie o `.env.example` para `.env.local`:

```bash
cp .env.example .env.local
```

Depois edite o `.env.local` com os valores corrigidos.

---

## 📦 PASSO 4: Commit no GitHub

### 4.1 - Inicializar Git (se ainda não fez):
```bash
git init
git add .
git commit -m "Initial commit - DESAYRE Platform v1.0"
```

### 4.2 - Criar repositório no GitHub:
1. Acesse: https://github.com/new
2. Nome do repositório: `desayre-beta`
3. Deixe como **Private** (Privado)
4. **NÃO** marque "Initialize with README"
5. Clique em "Create repository"

### 4.3 - Conectar e enviar:
```bash
# Adicionar remote (substitua SEU-USUARIO)
git remote add origin https://github.com/SEU-USUARIO/desayre-beta.git

# Enviar para o GitHub
git branch -M main
git push -u origin main
```

---

## 🚀 PASSO 5: Deploy na Vercel

### 5.1 - Importar Projeto:
1. Acesse: https://vercel.com/dashboard
2. Clique em **"Add New Project"**
3. Clique em **"Import Git Repository"**
4. Selecione: `SEU-USUARIO/desayre-beta`
5. Clique em **"Import"**

### 5.2 - Configurar Build:
- **Framework Preset**: `Next.js` (detecta automaticamente)
- **Root Directory**: `./` (deixe como está)
- **Build Command**: `npm run build` (padrão)
- **Output Directory**: `.next` (padrão)

### 5.3 - Configurar Variáveis de Ambiente:

Clique em **"Environment Variables"** e adicione TODAS estas:

```
DATABASE_URL=postgresql://neondb_owner:... (copie do .env.local)
UPSTASH_REDIS_REST_URL=https://expert-ghost-... (copie do .env.local)
UPSTASH_REDIS_REST_TOKEN=AbcbAAIncD... (copie do .env.local)
R2_ACCOUNT_ID=4a6b597e96b59b2f9a34c0cde6009912
R2_ACCESS_KEY_ID=fcf2405e544c4246256acdf2e0de93a1
R2_SECRET_ACCESS_KEY=5424aca4d76c9f9995ab85d77460c1497ed9a9bcc9bbdaf219dcb4309c2b5936
R2_BUCKET_NAME=desayre-media
R2_PUBLIC_URL=
JWT_SECRET=(cole o segredo que gerou no Passo 1)
ADMIN_PASSWORD_HASH=(cole o hash gerado no Passo 2)
MODELS_LABS_API_KEY=4fkjLpn6ZO9zCDytPbIumu1ObrddJQ4Auntl6lOcaDCaiZ300WmJ2erOjayb
XAI_API_KEY=xai-n5aRYfAtxjQcsiL3DmrLUYaMQVFnilQPOEvAkFmdzadKutzidXhnsvy8bxXhvr8DKy5z47aJU2vrVQOH
NEXT_PUBLIC_APP_URL=https://seudominio.vercel.app (depois do deploy)
```

### 5.4 - Deploy:
Clique em **"Deploy"**

Aguarde ~2-3 minutos...

---

## 🗄️ PASSO 6: Configurar Banco de Dados

### 6.1 - Rodar Migrations:
Na Vercel, vá em:
1. **"Storage"** (no menu lateral)
2. Conecte seu PostgreSQL (Neon)
3. Ou rode localmente:

```bash
# Instalar dependências
npm install

# Rodar migrations
npm run db:migrate
```

### 6.2 - Criar Usuário Admin:
```bash
# Usando Drizzle Studio
npm run db:studio
```

Ou execute SQL direto no Neon:
```sql
INSERT INTO users (email, password_hash, role, created_at)
VALUES (
  'admin@desayre.app',
  '$2a$12$... (seu hash aqui)',
  'admin',
  NOW()
);
```

---

## ✅ PASSO 7: Testar

### 7.1 - Acessar:
Abra: `https://seudominio.vercel.app`

### 7.2 - Login:
- Email: `admin@desayre.app` (ou o que você definiu)
- Senha: (a senha que você usou no Passo 2)

### 7.3 - Testar Geração:
1. Vá para **Studio**
2. Digite um prompt: "um gato astronauta colorido"
3. Clique em **Generate**
4. Verifique se aparece na fila/processing

---

## 🔧 Solução de Problemas

### Erro: "Database connection failed"
- Verifique se o `DATABASE_URL` está correto
- Confirme se o Neon está com "Allowed IP" = "0.0.0.0/0" (all IPs)

### Erro: "Unauthorized" em todas as rotas
- Verifique `JWT_SECRET` (deve ser o mesmo no deploy e local)
- Limpe cookies do navegador

### Erro: "R2 connection failed"
- Verifique se as credenciais R2 estão corretas
- Confirme se o bucket existe na Cloudflare

### Erro: "Redis connection failed"
- Verifique `UPSTASH_REDIS_REST_URL` e `TOKEN`
- Confirme se o database Upstash está ativo

---

## 📊 Funcionalidades do Chat Adicionadas

✅ Chat flutuante estilo template Vercel
✅ Sugestões de prompts automáticas
✅ Interface moderna com animações
✅ Respostas sobre:
   - Dicas de criação de prompts
   - Como usar cada ferramenta
   - Informações de custo
   - Melhores práticas

---

## 🎉 Pronto!

Seu DESAYRE Platform está no ar! 🚀

**URLs importantes:**
- App: `https://seudominio.vercel.app`
- Login: `https://seudominio.vercel.app/login`
- Studio: `https://seudominio.vercel.app/studio`
- Admin: `https://seudominio.vercel.app/admin`

**Próximos passos opcionais:**
- [ ] Configurar domínio personalizado na Vercel
- [ ] Configurar R2_PUBLIC_URL com domínio próprio
- [ ] Ativar Analytics na Vercel
- [ ] Configurar cron job para processar fila automaticamente

Dúvidas? Só chamar! 💪
