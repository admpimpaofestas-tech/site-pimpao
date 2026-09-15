# Worker de tracking — Pimpão

Recebe os eventos do site e repassa para o **Meta Conversions API** (CAPI) com o mesmo
`event_id` do Pixel (deduplicação), hasheia os dados pessoais (SHA-256) e guarda os leads
num KV para exportar ao **Google Ads** (conversões offline por `gclid`).

## Como o site usa

O componente `src/components/Tracking.astro` lê do `.env` (veja `.env.example` na raiz):

| Variável | O que é |
|---|---|
| `PUBLIC_META_PIXEL_ID` | ID do Pixel / conjunto de dados (Events Manager) |
| `PUBLIC_GADS_ID` | Tag do Google Ads, formato `AW-123456789` |
| `PUBLIC_GADS_LEAD_LABEL` | Rótulo da ação de conversão "Lead" (Google Ads > Metas > Conversões) |
| `PUBLIC_TRACK_ENDPOINT` | URL do Worker + `/event` |

Eventos (hierarquia FOP):

| # | Evento | Gatilho | Google Ads |
|---|---|---|---|
| 1 | PageView | página carrega | — |
| 2 | ViewContent | scroll 25% ou 10s | — |
| 3 | AddToWishlist | seção Orçamento visível ou scroll 50% | — |
| 4 | Contact | preencheu nome + telefone | envia `user_data` (enhanced conversions) |
| 5 | Lead | enviou o formulário **ou** clicou em qualquer botão de WhatsApp | conversão "Lead" |

## Publicar (uma vez)

```bash
cd worker
npx wrangler login
npx wrangler kv namespace create LEADS        # cole o "id" gerado no wrangler.toml
npx wrangler secret put META_PIXEL_ID
npx wrangler secret put META_CAPI_TOKEN        # Events Manager > Configurações > Conversions API > Gerar token
npx wrangler secret put META_TEST_CODE         # código TESTxxxxx do "Testar eventos" (só durante os testes)
npx wrangler secret put ADMIN_KEY              # senha para baixar o CSV de leads
npx wrangler deploy
```

O deploy imprime a URL, algo como `https://pimpao-tracking.<conta>.workers.dev`.
Coloque `https://pimpao-tracking.<conta>.workers.dev/event` em `PUBLIC_TRACK_ENDPOINT` no `.env`
do site e faça o build de novo.

Se o site for servido por outro domínio além de `pimpao.com.br`, adicione-o em `ALLOWED_ORIGINS`
no `wrangler.toml` (senão o navegador bloqueia por CORS).

## Validar

1. Events Manager > **Testar eventos**: abra o site, role, preencha o formulário. Cada evento
   deve aparecer 2x (Navegador + Servidor) e marcado como **deduplicado**.
2. Confira "Parâmetros correspondidos": `external_id`, `ph`, `fn`, `ln`, cidade/estado/país.
3. Google Ads > Conversões > "Lead" deve mostrar "Registrando conversões" em até 48h.
4. Quando tudo estiver certo, limpe o código de teste:

```bash
npx wrangler secret delete META_TEST_CODE
```

## Exportar leads para o Google Ads (conversões offline)

```bash
curl -H "x-admin-key: SUA_CHAVE" https://pimpao-tracking.<conta>.workers.dev/leads.csv -o leads.csv
```

As colunas `Google Click ID`, `Conversion Name`, `Conversion Time` já estão no formato do
modelo de importação do Google Ads. Importe em Google Ads > Metas > Conversões > Uploads,
marcando só as linhas de quem fechou festa (ou troque `Conversion Name` para "Festa fechada").

## Testar localmente

```bash
cd worker
cp .dev.vars.example .dev.vars   # preencha os valores
npm run dev                      # sobe em http://localhost:8787
```

Na raiz do site, use `PUBLIC_TRACK_ENDPOINT=http://localhost:8787/event` no `.env`.
