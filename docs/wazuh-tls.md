# Wazuh: verificação de certificado TLS

## O que mudou

`SiemClient` (Manager API) e `SiemIndexerClient` (Indexer) não definem mais
`process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"`. A validação TLS agora é a
padrão do Node.js: o certificado do endpoint precisa ser emitido por uma CA
confiável pelo processo, e o hostname precisa corresponder ao certificado.

Não existe (e não deve ser adicionado) nenhum fallback inseguro:
`rejectUnauthorized: false`, agente/dispatcher sem verificação, desabilitar a
checagem de hostname, flags globais ou `curl -k`.

## Consequência operacional (leia antes do deploy)

> **A integração Wazuh existente pode falhar após este hardening** se o
> certificado do Manager API (porta 55000) ou do Indexer (porta 9200) ainda
> não for confiável para o processo Node.js. Os sintomas esperados são erros
> como `fetch failed` com causa `SELF_SIGNED_CERT_IN_CHAIN`,
> `DEPTH_ZERO_SELF_SIGNED_CERT`, `UNABLE_TO_VERIFY_LEAF_SIGNATURE` ou
> `ERR_TLS_CERT_ALTNAME_INVALID`, registrados em `IntegrationSyncLog` e
> refletidos no Integration Health como `ERROR`/`DEGRADED`.

Antes de fazer deploy:

1. Configurar a CA confiável (abaixo) no host/container de **staging**.
2. Um humano testa manualmente, em staging, o Manager API (sync de agentes) e o
   Indexer (sync de vulnerabilidades).
3. Só então configurar produção e fazer o deploy.

Este PR não foi validado contra endpoints reais: nenhum teste real foi
executado, por política (`CLAUDE.md` §11, §17). A dependência de que as CAs
estejam configuradas é uma decisão operacional não verificável offline.

## Como tornar confiável um certificado self-signed / CA privada

Duas opções, gerenciadas por humanos:

### Opção A: trust store do sistema

Importar a CA no trust store do host/container (ex.: Debian/Ubuntu: copiar o
`.crt` para `/usr/local/share/ca-certificates/` e rodar
`update-ca-certificates`). Observe que o Node.js **não** usa o trust store do
sistema por padrão; ele usa o bundle embutido. Use esta opção apenas com
`--use-system-ca` (quando suportado pela versão do Node) ou combine com a
opção B.

### Opção B: `NODE_EXTRA_CA_CERTS`

Definir `NODE_EXTRA_CA_CERTS=/caminho/para/ca-wazuh.pem` no ambiente **antes de
iniciar** o processo Node.js (unit systemd, `docker run -e`, compose, PM2 etc.).
O arquivo PEM pode conter uma ou mais CAs, é adicionado ao bundle embutido e é
lido **apenas na inicialização** do processo. Atribuí-la em runtime (por
exemplo, `process.env.NODE_EXTRA_CA_CERTS = ...` dentro do código) não tem
efeito. Reinicie o processo após alterar o arquivo ou a variável.

Referência: <https://nodejs.org/api/cli.html#node_extra_ca_certsfile>

Importante: o certificado também precisa listar o hostname/IP usado na
`baseUrl` da integração (SAN). Se não listar, corrija o certificado ou a
`baseUrl`; não desabilite a checagem.

## Trade-offs

- `NODE_EXTRA_CA_CERTS` é por processo, não por tenant ou integração: a CA
  adicionada passa a ser confiável para todas as conexões HTTPS daquele
  processo. Ainda assim, é estritamente mais seguro do que o comportamento
  anterior, que desligava a validação para todo o processo.
- Mitigação: use uma CA dedicada à infraestrutura Wazuh e distribua apenas a
  CA (nunca chaves privadas).
- Confiar em uma CA específica por cliente exigiria um agente HTTPS dedicado
  (dependência adicional, ex. `undici`, e/ou mudança de esquema para guardar a
  CA por tenant). Isso ficou fora de escopo; pode ser avaliado depois.

## Testes

`src/lib/integrations/siem-tls.test.ts` (offline) verifica que instanciar os
dois clientes não altera `NODE_TLS_REJECT_UNAUTHORIZED` e que os fontes não
contêm desvio de verificação TLS.
