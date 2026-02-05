# 🤖 Configuração de CI/CD - Deploy Automático

Este guia configura deploy automático do Kimi Code → GitHub → Vercel.

## 📋 Passo 1: Criar Token da Vercel

1. Acesse: https://vercel.com/account/tokens
2. Clique em **"Create Token"**
3. Nome: `Kimi Code Deploy`
4. Escopo: `Full Account` (ou limitado ao projeto)
5. Copie o token (só aparece uma vez!)

## 📋 Passo 2: Configurar Secrets no GitHub

1. Acesse: `https://github.com/Desayre-Team-Org/desayre-beta/settings/secrets/actions`
2. Clique em **"New repository secret"**
3. Adicione estes secrets:

| Nome | Valor |
|------|-------|
| `VERCEL_TOKEN` | Token que você copiou no passo 1 |
| `VERCEL_ORG_ID` | Seu ID da organização Vercel |
| `VERCEL_PROJECT_ID` | ID do projeto na Vercel |

### Como pegar ORG_ID e PROJECT_ID:

Na Vercel, execute:
```bash
npx vercel env ls
```

Ou pegue na URL do projeto:
- URL: `vercel.com/ngdigitalsuporte-8339s-projects/desayre-beta-xxxx`
- Org ID: `ngdigitalsuporte-8339s-projects`
- Project ID: `desayre-beta-xxxx`

## 📋 Passo 3: Testar

1. Faça qualquer alteração no código
2. Execute: `node scripts/auto-deploy.js "sua mensagem"`
3. O deploy será feito automaticamente!

## 🔄 Fluxo Automático

```
Kimi Code → Git Push → GitHub Actions → Vercel Deploy
     ↑___________________________________________↓
              (URL de retorno)
```

## 🛠️ Comandos Úteis

```bash
# Deploy rápido
node scripts/auto-deploy.js

# Deploy com mensagem customizada
node scripts/auto-deploy.js "feat: nova funcionalidade"

# Ver status do deploy
npx vercel --version

# Ver logs
npx vercel logs desayre-beta.vercel.app
```

## ⚡ GitHub Actions

O arquivo `.github/workflows/deploy.yml` já está configurado.

Todo push na branch `main` vai:
1. ✅ Rodar type checking
2. ✅ Fazer build
3. ✅ Deploy automaticamente na Vercel

## 📝 Notas

- O deploy só funciona se os tests passarem
- Commits com `[skip ci]` no título não disparam deploy
- Você pode ver o progresso em: https://github.com/Desayre-Team-Org/desayre-beta/actions

## 🔑 Segurança

- NUNCA commit tokens diretamente no código
- Sempre use GitHub Secrets
- Tokens da Vercel expiram após 1 ano
- Renove tokens periodicamente
