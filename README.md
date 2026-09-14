# 📦 Auto Nobre Representações — Painel de Controle

Projeto 3 (3º Bimestre) — Dashboard de gestão para a Auto Nobre Representações, empresa de representação comercial do setor de embalagens.

Este projeto segue a estrutura de referência fornecida pelo professor (`api.php` único com roteamento) mantendo a identidade visual usada no Projeto 2 e todos os requisitos avançados de banco de dados definidos para o Projeto 3.

## 📂 Estrutura de Arquivos

```
AutoNobrePainel/
├── api.php              # API única em JSON, com roteamento por ?recurso=
├── config.php            # Conexão PDO com o banco
├── index.html             # Interface do painel (SPA com abas)
├── schema.sql             # Script completo do banco (tabelas, views, SP, trigger, function)
├── tsconfig.json          # Configuração do compilador TypeScript (modo estrito)
├── dist/
│   └── app.js              # JavaScript compilado (gerado a partir de src/app.ts)
└── src/
    ├── app.ts               # Lógica do frontend (fetch, CRUDs, dashboard)
    ├── types.ts              # Tipos/interfaces TypeScript
    └── css/
        └── style.css          # Identidade visual (paleta, cards, botões)
```

## 🚀 Como executar

### 1. Copiar para o XAMPP

Salve a pasta `AutoNobrePainel` dentro de:

```
C:\xampp\htdocs\AutoNobrePainel
```

### 2. Criar o banco de dados

Abra o **phpMyAdmin** (`http://localhost/phpmyadmin`), crie uma nova aba de **SQL** e execute o conteúdo do arquivo `schema.sql`. Ele já cria o banco `auto_nobre`, as tabelas, a function, a trigger, as views e a stored procedure, além de inserir dados de exemplo.

> 💡 Se aparecer erro relacionado a `log_bin_trust_function_creators` ao criar a `FUNCTION`, rode antes:
> `SET GLOBAL log_bin_trust_function_creators = 1;`

Se seu usuário/senha do MySQL forem diferentes de `root` sem senha, ajuste em `config.php`.

### 3. Compilar o TypeScript (caso altere `src/app.ts` ou `src/types.ts`)

```bash
npx tsc
```

O arquivo `dist/app.js` já vem compilado neste pacote — só recompile se editar os arquivos `.ts`.

### 4. Acessar

Com o Apache e o MySQL ligados no XAMPP:

```
http://localhost/AutoNobrePainel/
```

## ✅ Requisitos da rubrica atendidos

**Banco de dados (`schema.sql`)**
- CTE + View analítica: `vw_faturamento_categoria` (usa `WITH pedidos_validos AS (...)`)
- View analítica: `vw_pedidos_detalhados` (junta pedidos + produtos + categorias)
- View consolidadora: `vw_estoque_produtos` (junta produtos + categorias + status via function)
- Stored Procedure: `sp_buscarProdutos`, chamada via `CALL` em `api.php` (busca + filtro + paginação)
- Trigger `BEFORE UPDATE`: `trg_produtos_before_update` (impede estoque/preço negativos)
- Function reutilizável: `fn_statusEstoque` (usada em duas views e na stored procedure)

**Backend (`api.php` + `config.php`)**
- API JSON pura (nenhum HTML renderizado)
- PDO com prepared statements em todas as consultas
- 3 CRUDs completos: Produtos, Categorias e Pedidos, cada um com mensagens claras nas exclusões

**Frontend (`src/app.ts`)**
- Compilado via `tsc`, modo `strict`, sem `any` e sem o operador `!`
- Checagem de nulos sempre via `if`
- `fetch` com `async/await` e `try/catch` (`requisitarApi`)
- `.reduce()` → `calcularFaturamentoTotal` (faturamento = quantidade × valor unitário)
- `.filter()` → `obterProdutosEstoqueCritico` e segmentação de pedidos válidos/cancelados
- `.map()` → formatação em R$ nas tabelas e montagem dos dados do gráfico de faturamento
- Lógica de ranking → `calcularRankingProdutos` (produto mais vendido)
- Cenários vazios tratados em todas as tabelas e cards ("Nenhum dado registrado")

**Bootstrap**
- Componentes usados: navbar, abas de navegação, cards, tabelas, modais, toasts, list-group, progress bar (mais que os 3 mínimos exigidos)
- `index.html` único funciona como template compartilhado (não há duplicação de arquivos entre as seções)

## 🎨 Identidade visual

Paleta e componentes reproduzidos a partir do site institucional (Projeto 2):
- Azul institucional `#0B3B82`
- Amarelo `#E7B92D`
- Fonte Arial
- Navbar branca, fixa no topo, com borda inferior azul de 3px
- Logo real (`assets/logo.png`, com a coroa) + badge amarelo "Embalagens & Packaging"
- Cards com `border-radius: 15px`; cards de KPI com borda superior amarela e efeito de elevação no hover
- Botões `btn-acento` (azul) e `btn-warning-custom` (amarelo), cantos arredondados em 10px
- Badges "subtle" (fundo claro, texto colorido) para status de estoque e de pedido
- Rodapé azul simples
