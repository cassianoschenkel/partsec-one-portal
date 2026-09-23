# Scripts operacionais

Esta pasta contém scripts auxiliares para operação, testes e manutenção do
Partsec One Portal.

Cada script abaixo está classificado por categoria de risco. **Nenhum
script marcado como `production-only`, `credential-sensitive` ou
`external-integration` deve ser executado automaticamente por um agente de
IA** — apenas manualmente, por um humano, com o ambiente correto carregado.
Ver também `CLAUDE.md` (seções "Autonomous development policy", "Security
constraints" e "Production safety").

## Legenda

- **development-safe** — seguro de rodar localmente contra um banco de
  desenvolvimento descartável; não afeta produção nem sistemas externos.
- **operational/manual** — ação operacional que deve ser disparada
  manualmente por um humano (não faz parte do fluxo normal de
  desenvolvimento).
- **production-only** — só deve ser executado contra o ambiente de
  produção, por um humano, como parte do processo de deploy/operação.
- **external-integration** — se conecta a um sistema externo real
  (Zabbix, Wazuh/SIEM); nunca deve ser executado por um agente de IA.
- **credential-sensitive** — define ou altera senhas/credenciais reais, ou
  envia e-mail real; nunca é executado por um agente de IA. Se necessário,
  um humano o executa manualmente, fora da sessão autônoma.

## Scripts disponíveis

### `check-env.ts`

**Categoria:** development-safe.

Valida se as variáveis de ambiente obrigatórias estão presentes e
consistentes (sem conectar a banco de dados ou serviço externo).

```bash
npx tsx scripts/check-env.ts
```

### `deploy.sh`

**Categoria:** production-only.

Script de deploy: cria backup, atualiza código, instala dependências,
aplica migrations em produção (`prisma migrate deploy`) e reinicia o
processo via PM2. Deve ser executado apenas manualmente, por um humano,
no servidor de produção.

### `backup-db.sh`

**Categoria:** production-only.

Gera um backup (`pg_dump`) do banco real a partir do `.env` do servidor.
Deve ser executado apenas manualmente, por um humano, no servidor onde o
`.env` de produção está presente.

### `bootstrap-admin.ts`

**Categoria:** credential-sensitive.

Cria um usuário `PARTSEC_ADMIN` com senha definida via argumento de linha
de comando, contra o `DATABASE_URL` do ambiente atual.

```bash
npx tsx scripts/bootstrap-admin.ts admin@example.com "senha" "Nome"
```

### `set-initial-passwords.ts`

**Categoria:** credential-sensitive.

Define uma senha inicial fixa para usuários administrativos de
desenvolvimento.

```bash
npx tsx scripts/set-initial-passwords.ts
```

### `set-user-password.ts`

**Categoria:** credential-sensitive.

Redefine a senha de um usuário específico.

```bash
npx tsx scripts/set-user-password.ts usuario@example.com "nova-senha"
```

### `set-siem-credentials.ts`

**Categoria:** credential-sensitive.

Grava (encriptado) credenciais de integração SIEM/Wazuh no banco.

```bash
npx tsx scripts/set-siem-credentials.ts
```

### `sync-zabbix.ts`

**Categoria:** external-integration.

Executa a sincronização de hosts/problemas do Zabbix para todos os
tenants com integração ativa, chamando a API real do Zabbix de cada
tenant.

```bash
npx tsx scripts/sync-zabbix.ts
```

### `sync-siem-agents.ts`

**Categoria:** external-integration.

Sincroniza agentes do Wazuh (SIEM) para todos os tenants com integração
ativa, chamando a API real do SIEM.

```bash
npx tsx scripts/sync-siem-agents.ts
```

### `sync-siem-vulnerabilities.ts`

**Categoria:** external-integration.

Sincroniza vulnerabilidades do Wazuh (SIEM) para todos os tenants com
integração ativa, chamando a API real do SIEM.

```bash
npx tsx scripts/sync-siem-vulnerabilities.ts
```

### `import-zabbix-assets.ts`

**Categoria:** external-integration.

Importa ativos (hosts) do Zabbix como `CustomerAsset` para um tenant ou
para todos os tenants, chamando a API real do Zabbix.

```bash
npx tsx scripts/import-zabbix-assets.ts [tenant-slug]
```

### `debug-zabbix-problem-hosts.ts`

**Categoria:** external-integration.

Ferramenta de depuração que consulta problemas/hosts diretamente na API
real do Zabbix de um tenant.

```bash
npx tsx scripts/debug-zabbix-problem-hosts.ts tenant-slug
```

## Nota sobre este PR

Nenhum script foi movido, renomeado ou teve seu comportamento alterado
neste PR — apenas documentado. A execução automática de scripts
`credential-sensitive`, `external-integration` e `production-only` é
bloqueada por padrão pela configuração em `.claude/settings.json` e pelo
hook em `.claude/hooks/block-dangerous-bash.js`.
