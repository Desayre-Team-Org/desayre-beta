---
description: Deploy automático do DESAYRE para produção via Vercel (commit + push + deploy)
---

# Deploy Automático — DESAYRE

## Contexto
- **Projeto:** DESAYRE (Engine do Vectra AI)
- **Repo:** `https://github.com/Desayre-Team-Org/desayre-beta.git`
- **Branch:** `main`
- **Deploy:** Vercel (auto-deploy on push to main)
- **URL Produção:** `https://desayre-be-six.vercel.app`
- **Diretório Local:** `d:\TRABALHO MARKETING DIGITAL\PROJETOS NETTIN\ANARKOM\xxxx\desayre-git\desayre-beta`

## Regra Principal
Após QUALQUER alteração de código, executar automaticamente os passos abaixo.
NÃO perguntar ao usuário — apenas executar e reportar o resultado.

## Passos

// turbo-all

1. Verificar build antes do commit (garante que nada quebra em produção):
```powershell
npm run build 2>&1
```
Se o build FALHAR, NÃO continue. Corrija o erro primeiro.

2. Adicionar os arquivos modificados ao staging:
```powershell
git add -A
```

3. Criar commit com mensagem descritiva (em inglês, seguindo conventional commits):
```powershell
git commit -m "<type>: <descrição curta do que mudou>"
```
Tipos: `fix`, `feat`, `refactor`, `style`, `docs`, `perf`, `chore`

4. Push para origin/main (dispara auto-deploy na Vercel):
```powershell
git push origin main
```

5. Informar ao usuário:
   - ✅ Commit hash
   - ✅ O que mudou
   - ✅ Que o deploy foi disparado na Vercel
   - ✅ Que ele pode atualizar a página em ~1-2 minutos
   - URL: `https://desayre-be-six.vercel.app`
