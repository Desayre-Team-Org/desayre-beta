# Aplicar Migration no Banco

## Opção 1: Aplicar via Vercel CLI (Recomendado)

```bash
# Instale a Vercel CLI se não tiver
npm i -g vercel

# Faça login
vercel login

# Execute o script de migration na Vercel
vercel env pull  # Baixa as variáveis de ambiente
npm run db:migrate
```

## Opção 2: Aplicar localmente (com DATABASE_URL do Neon)

```bash
# Configure a DATABASE_URL do seu banco Neon
export DATABASE_URL="postgresql://user:password@host.neon.tech/dbname"

# Execute a migration
npm run db:migrate
```

## Opção 3: Diretamente no Neon Dashboard

1. Acesse https://console.neon.tech
2. Selecione seu projeto
3. Vá em "SQL Editor"
4. Execute o comando SQL da migration:

```sql
ALTER TABLE "generations" ADD COLUMN "duration" integer;
```

## Verificar se funcionou

```bash
# Execute o comando para verificar a estrutura da tabela
psql $DATABASE_URL -c "\d generations"
```

Você deve ver a coluna `duration` na lista.
