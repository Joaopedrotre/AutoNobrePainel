import type {
    Categoria,
    Produto,
    Pedido,
    DadosDashboard,
    RespostaApi,
    RankingProduto,
} from "./types.js";

// ============================================================
// DECLARAÇÃO DO BOOTSTRAP (CARREGADO VIA CDN COMO SCRIPT GLOBAL)
// ============================================================

declare const bootstrap: {
    Toast: new (elemento: HTMLElement, opcoes?: { delay?: number }) => { show: () => void };
    Modal: new (elemento: HTMLElement) => { show: () => void; hide: () => void };
};

// ============================================================
// CONFIGURAÇÃO E ESTADO GERAL
// ============================================================

const URL_API = "api.php";
const PRODUTOS_POR_PAGINA = 6;

let listaCategorias: Categoria[] = [];
let paginaAtualProdutos = 1;
let termoBuscaProdutos = "";
let filtroCategoriaProdutos = "";

// ============================================================
// FUNÇÕES UTILITÁRIAS
// ============================================================

function obterElemento<T extends HTMLElement>(id: string): T | null {
    return document.getElementById(id) as T | null;
}

function formatarMoeda(valor: number): string {
    return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(data: string): string {
    const partes = data.split("-");
    if (partes.length !== 3) {
        return data;
    }
    const dia = partes[2];
    const mes = partes[1];
    const ano = partes[0];
    if (dia === undefined || mes === undefined || ano === undefined) {
        return data;
    }
    return `${dia}/${mes}/${ano}`;
}

function exibirToast(mensagem: string, tipo: "sucesso" | "erro"): void {
    const container = obterElemento<HTMLDivElement>("containerToasts");
    if (container === null) {
        return;
    }

    const toast = document.createElement("div");
    toast.className = `toast align-items-center text-white ${tipo === "sucesso" ? "bg-success" : "bg-danger"} border-0`;
    toast.setAttribute("role", "alert");
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${mensagem}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>`;
    container.appendChild(toast);

    const instanciaToast = new bootstrap.Toast(toast, { delay: 4000 });
    instanciaToast.show();

    toast.addEventListener("hidden.bs.toast", () => {
        toast.remove();
    });
}

// ============================================================
// FUNÇÃO GENÉRICA DE REQUISIÇÃO (FETCH + ASYNC/AWAIT + TRY/CATCH)
// ============================================================

async function requisitarApi<T>(url: string, opcoes?: RequestInit): Promise<RespostaApi<T>> {
    try {
        const resposta = await fetch(url, opcoes);
        const corpo = (await resposta.json()) as RespostaApi<T>;
        return corpo;
    } catch (erro) {
        console.error("Erro de rede ou de leitura da resposta:", erro);
        return { sucesso: false, mensagem: "Não foi possível conectar à API. Verifique o XAMPP." };
    }
}

// ============================================================
// DASHBOARD - CÁLCULOS (REDUCE / FILTER / MAP)
// ============================================================

function calcularFaturamentoTotal(pedidos: Pedido[]): number {
    const pedidosValidos = pedidos.filter((pedido) => pedido.status !== "Cancelado");

    return pedidosValidos.reduce((acumulado, pedido) => {
        return acumulado + pedido.quantidade * Number(pedido.valor_unitario);
    }, 0);
}

function obterProdutosEstoqueCritico(produtos: Produto[]): Produto[] {
    return produtos.filter((produto) => produto.status_estoque === "Crítico" || produto.status_estoque === "Esgotado");
}

function calcularRankingProdutos(pedidos: Pedido[]): RankingProduto[] {
    const pedidosValidos = pedidos.filter((pedido) => pedido.status !== "Cancelado");
    const mapaRanking = new Map<string, RankingProduto>();

    for (const pedido of pedidosValidos) {
        const valorPedido = pedido.quantidade * Number(pedido.valor_unitario);
        const existente = mapaRanking.get(pedido.nome_produto);

        if (existente) {
            existente.totalVendido += pedido.quantidade;
            existente.faturamento += valorPedido;
        } else {
            mapaRanking.set(pedido.nome_produto, {
                nomeProduto: pedido.nome_produto,
                totalVendido: pedido.quantidade,
                faturamento: valorPedido,
            });
        }
    }

    return Array.from(mapaRanking.values()).sort((a, b) => b.totalVendido - a.totalVendido);
}

// ============================================================
// DASHBOARD - RENDERIZAÇÃO
// ============================================================

function renderizarCardsDashboard(dados: DadosDashboard): void {
    const cardFaturamento = obterElemento<HTMLElement>("cardFaturamentoTotal");
    const cardProdutosAtivos = obterElemento<HTMLElement>("cardProdutosAtivos");
    const cardEstoqueCritico = obterElemento<HTMLElement>("cardEstoqueCritico");
    const cardProdutoTop = obterElemento<HTMLElement>("cardProdutoMaisVendido");

    const faturamentoTotal = calcularFaturamentoTotal(dados.pedidos);
    const produtosAtivos = dados.produtos.filter((produto) => produto.ativo === 1);
    const estoqueCritico = obterProdutosEstoqueCritico(dados.produtos);
    const ranking = calcularRankingProdutos(dados.pedidos);

    if (cardFaturamento !== null) {
        cardFaturamento.textContent = formatarMoeda(faturamentoTotal);
    }
    if (cardProdutosAtivos !== null) {
        cardProdutosAtivos.textContent = String(produtosAtivos.length);
    }
    if (cardEstoqueCritico !== null) {
        cardEstoqueCritico.textContent = String(estoqueCritico.length);
    }
    if (cardProdutoTop !== null) {
        const primeiroColocado = ranking.length > 0 ? ranking[0] : undefined;
        cardProdutoTop.textContent = primeiroColocado !== undefined ? primeiroColocado.nomeProduto : "Nenhum dado registrado";
    }
}

function renderizarRankingProdutos(pedidos: Pedido[]): void {
    const container = obterElemento<HTMLDivElement>("listaRankingProdutos");
    if (container === null) {
        return;
    }

    const ranking = calcularRankingProdutos(pedidos).slice(0, 5);

    if (ranking.length === 0) {
        container.innerHTML = `<p class="text-muted fst-italic mb-0 p-3">Nenhum dado registrado.</p>`;
        return;
    }

    const linhas = ranking
        .map((item, indice) => {
            const faturamentoFormatado = formatarMoeda(item.faturamento);
            return `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    <span><strong>#${indice + 1}</strong> ${item.nomeProduto}</span>
                    <span class="text-end">
                        <span class="badge bg-info-subtle text-info-emphasis me-2">${item.totalVendido} un.</span>
                        <span class="fw-semibold">${faturamentoFormatado}</span>
                    </span>
                </li>`;
        })
        .join("");

    container.innerHTML = `<ul class="list-group list-group-flush">${linhas}</ul>`;
}

function renderizarFaturamentoCategoria(dados: DadosDashboard): void {
    const container = obterElemento<HTMLDivElement>("listaFaturamentoCategoria");
    if (container === null) {
        return;
    }

    if (dados.faturamentoCategoria.length === 0) {
        container.innerHTML = `<p class="text-muted fst-italic mb-0">Nenhum dado registrado.</p>`;
        return;
    }

    const maiorValor = Math.max(...dados.faturamentoCategoria.map((item) => Number(item.faturamento_total)), 1);

    container.innerHTML = dados.faturamentoCategoria
        .map((item) => {
            const valor = Number(item.faturamento_total);
            const percentual = Math.round((valor / maiorValor) * 100);
            return `
                <div class="mb-2">
                    <div class="d-flex justify-content-between small">
                        <span>${item.nome_categoria}</span>
                        <span class="fw-semibold">${formatarMoeda(valor)}</span>
                    </div>
                    <div class="progress" style="height: 8px;">
                        <div class="progress-bar progress-bar-nobre" style="width: ${percentual}%"></div>
                    </div>
                </div>`;
        })
        .join("");
}

async function carregarDashboard(): Promise<void> {
    const resposta = await requisitarApi<DadosDashboard>(`${URL_API}?recurso=dashboard`);

    if (!resposta.sucesso || resposta.dados === undefined) {
        exibirToast(resposta.mensagem ?? "Erro ao carregar o dashboard.", "erro");
        return;
    }

    renderizarCardsDashboard(resposta.dados);
    renderizarRankingProdutos(resposta.dados.pedidos);
    renderizarFaturamentoCategoria(resposta.dados);
}

// ============================================================
// PRODUTOS - CARREGAMENTO E RENDERIZAÇÃO
// ============================================================

function renderizarTabelaProdutos(produtos: Produto[]): void {
    const corpoTabela = obterElemento<HTMLTableSectionElement>("corpoTabelaProdutos");
    if (corpoTabela === null) {
        return;
    }

    if (produtos.length === 0) {
        corpoTabela.innerHTML = `<tr><td colspan="6" class="text-muted fst-italic text-center py-4">Nenhum dado registrado</td></tr>`;
        return;
    }

    corpoTabela.innerHTML = produtos
        .map((produto) => {
            const classeStatus =
                produto.status_estoque === "Normal"
                    ? "bg-success-subtle text-success-emphasis"
                    : produto.status_estoque === "Crítico"
                      ? "bg-warning-subtle text-warning-emphasis"
                      : "bg-danger-subtle text-danger-emphasis";

            return `
                <tr>
                    <td>
                        <div>${produto.nome_produto}</div>
                        ${produto.descricao !== null && produto.descricao !== "" ? `<div class="small text-muted">${produto.descricao}</div>` : ""}
                    </td>
                    <td>${produto.nome_categoria}</td>
                    <td>${formatarMoeda(Number(produto.preco_unitario))}</td>
                    <td>${produto.quantidade_estoque}</td>
                    <td><span class="badge ${classeStatus}">${produto.status_estoque}</span></td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-outline-secondary btn-editar-produto" data-id="${produto.id_produto}">Editar</button>
                        <button class="btn btn-sm btn-outline-danger btn-excluir-produto" data-id="${produto.id_produto}">Excluir</button>
                    </td>
                </tr>`;
        })
        .join("");

    vincularBotoesProdutos();
}

async function carregarProdutos(): Promise<void> {
    const parametros = new URLSearchParams();
    parametros.set("recurso", "produtos");
    parametros.set("pagina", String(paginaAtualProdutos));
    parametros.set("porPagina", String(PRODUTOS_POR_PAGINA));

    if (termoBuscaProdutos !== "") {
        parametros.set("busca", termoBuscaProdutos);
    }
    if (filtroCategoriaProdutos !== "") {
        parametros.set("categoria", filtroCategoriaProdutos);
    }

    const resposta = await requisitarApi<Produto[]>(`${URL_API}?${parametros.toString()}`);

    if (!resposta.sucesso || resposta.dados === undefined) {
        exibirToast(resposta.mensagem ?? "Erro ao carregar produtos.", "erro");
        return;
    }

    renderizarTabelaProdutos(resposta.dados);
    atualizarControlesPaginacao(resposta.dados.length);
}

function atualizarControlesPaginacao(quantidadeRetornada: number): void {
    const rotuloPagina = obterElemento<HTMLSpanElement>("rotuloPaginaAtual");
    const botaoAnterior = obterElemento<HTMLButtonElement>("botaoPaginaAnterior");
    const botaoProxima = obterElemento<HTMLButtonElement>("botaoPaginaProxima");

    if (rotuloPagina !== null) {
        rotuloPagina.textContent = `Página ${paginaAtualProdutos}`;
    }
    if (botaoAnterior !== null) {
        botaoAnterior.disabled = paginaAtualProdutos <= 1;
    }
    if (botaoProxima !== null) {
        botaoProxima.disabled = quantidadeRetornada < PRODUTOS_POR_PAGINA;
    }
}

function preencherSelectCategorias(seletor: HTMLSelectElement, incluirTodas: boolean): void {
    const opcaoInicial = incluirTodas
        ? `<option value="">Todas as categorias</option>`
        : `<option value="">Selecione uma categoria</option>`;

    seletor.innerHTML = opcaoInicial + listaCategorias
        .map((categoria) => `<option value="${categoria.id_categoria}">${categoria.nome_categoria}</option>`)
        .join("");
}

function vincularBotoesProdutos(): void {
    const botoesEditar = document.querySelectorAll<HTMLButtonElement>(".btn-editar-produto");
    const botoesExcluir = document.querySelectorAll<HTMLButtonElement>(".btn-excluir-produto");

    botoesEditar.forEach((botao) => {
        botao.addEventListener("click", () => {
            const idTexto = botao.dataset["id"];
            if (idTexto !== undefined) {
                abrirModalProduto(Number(idTexto));
            }
        });
    });

    botoesExcluir.forEach((botao) => {
        botao.addEventListener("click", () => {
            const idTexto = botao.dataset["id"];
            if (idTexto !== undefined) {
                confirmarExclusaoProduto(Number(idTexto));
            }
        });
    });
}

async function abrirModalProduto(id: number | null): Promise<void> {
    const formulario = obterElemento<HTMLFormElement>("formularioProduto");
    const titulo = obterElemento<HTMLElement>("tituloModalProduto");
    const campoId = obterElemento<HTMLInputElement>("produtoId");
    const campoNome = obterElemento<HTMLInputElement>("produtoNome");
    const campoCategoria = obterElemento<HTMLSelectElement>("produtoCategoria");
    const campoDescricao = obterElemento<HTMLInputElement>("produtoDescricao");
    const campoPreco = obterElemento<HTMLInputElement>("produtoPreco");
    const campoEstoque = obterElemento<HTMLInputElement>("produtoEstoque");
    const campoEstoqueMinimo = obterElemento<HTMLInputElement>("produtoEstoqueMinimo");
    const campoAtivo = obterElemento<HTMLInputElement>("produtoAtivo");

    if (
        formulario === null ||
        titulo === null ||
        campoId === null ||
        campoNome === null ||
        campoCategoria === null ||
        campoDescricao === null ||
        campoPreco === null ||
        campoEstoque === null ||
        campoEstoqueMinimo === null ||
        campoAtivo === null
    ) {
        return;
    }

    formulario.reset();
    preencherSelectCategorias(campoCategoria, false);

    if (id === null) {
        titulo.textContent = "Novo Produto";
        campoId.value = "";
        campoAtivo.checked = true;
    } else {
        titulo.textContent = "Editar Produto";
        const resposta = await requisitarApi<Produto>(`${URL_API}?recurso=produtos&id=${id}`);

        if (!resposta.sucesso || resposta.dados === undefined) {
            exibirToast(resposta.mensagem ?? "Produto não encontrado.", "erro");
            return;
        }

        const produto = resposta.dados;
        campoId.value = String(produto.id_produto);
        campoNome.value = produto.nome_produto;
        campoCategoria.value = produto.id_categoria !== null ? String(produto.id_categoria) : "";
        campoDescricao.value = produto.descricao ?? "";
        campoPreco.value = produto.preco_unitario;
        campoEstoque.value = String(produto.quantidade_estoque);
        campoEstoqueMinimo.value = String(produto.estoque_minimo);
        campoAtivo.checked = produto.ativo === 1;
    }

    const elementoModal = obterElemento<HTMLDivElement>("modalProduto");
    if (elementoModal !== null) {
        new bootstrap.Modal(elementoModal).show();
    }
}

async function salvarProduto(evento: Event): Promise<void> {
    evento.preventDefault();

    const campoId = obterElemento<HTMLInputElement>("produtoId");
    const campoNome = obterElemento<HTMLInputElement>("produtoNome");
    const campoCategoria = obterElemento<HTMLSelectElement>("produtoCategoria");
    const campoDescricao = obterElemento<HTMLInputElement>("produtoDescricao");
    const campoPreco = obterElemento<HTMLInputElement>("produtoPreco");
    const campoEstoque = obterElemento<HTMLInputElement>("produtoEstoque");
    const campoEstoqueMinimo = obterElemento<HTMLInputElement>("produtoEstoqueMinimo");
    const campoAtivo = obterElemento<HTMLInputElement>("produtoAtivo");

    if (
        campoId === null ||
        campoNome === null ||
        campoCategoria === null ||
        campoDescricao === null ||
        campoPreco === null ||
        campoEstoque === null ||
        campoEstoqueMinimo === null ||
        campoAtivo === null
    ) {
        return;
    }

    const corpo = {
        nomeProduto: campoNome.value,
        descricao: campoDescricao.value !== "" ? campoDescricao.value : null,
        idCategoria: campoCategoria.value !== "" ? Number(campoCategoria.value) : null,
        precoUnitario: Number(campoPreco.value),
        quantidadeEstoque: Number(campoEstoque.value),
        estoqueMinimo: Number(campoEstoqueMinimo.value),
        ativo: campoAtivo.checked ? 1 : 0,
    };

    const ehEdicao = campoId.value !== "";
    const url = ehEdicao ? `${URL_API}?recurso=produtos&id=${campoId.value}` : `${URL_API}?recurso=produtos`;
    const metodo = ehEdicao ? "PUT" : "POST";

    const resposta = await requisitarApi<{ id: number }>(url, {
        method: metodo,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
    });

    if (!resposta.sucesso) {
        exibirToast(resposta.mensagem ?? "Erro ao salvar produto.", "erro");
        return;
    }

    exibirToast(resposta.mensagem ?? "Produto salvo com sucesso.", "sucesso");
    fecharModal("modalProduto");
    await carregarProdutos();
    await carregarDashboard();
}

function confirmarExclusaoProduto(id: number): void {
    const confirmado = window.confirm("Deseja realmente excluir este produto?");
    if (!confirmado) {
        return;
    }
    void excluirProduto(id);
}

async function excluirProduto(id: number): Promise<void> {
    const resposta = await requisitarApi<null>(`${URL_API}?recurso=produtos&id=${id}`, { method: "DELETE" });

    if (!resposta.sucesso) {
        exibirToast(resposta.mensagem ?? "Erro ao excluir produto.", "erro");
        return;
    }

    exibirToast(resposta.mensagem ?? "Produto excluído com sucesso.", "sucesso");
    await carregarProdutos();
    await carregarDashboard();
}

// ============================================================
// CATEGORIAS - CARREGAMENTO E RENDERIZAÇÃO
// ============================================================

function renderizarTabelaCategorias(categorias: Categoria[]): void {
    const corpoTabela = obterElemento<HTMLTableSectionElement>("corpoTabelaCategorias");
    if (corpoTabela === null) {
        return;
    }

    if (categorias.length === 0) {
        corpoTabela.innerHTML = `<tr><td colspan="3" class="text-muted fst-italic text-center py-4">Nenhum dado registrado</td></tr>`;
        return;
    }

    corpoTabela.innerHTML = categorias
        .map((categoria) => {
            return `
                <tr>
                    <td>${categoria.nome_categoria}</td>
                    <td>${categoria.descricao ?? "-"}</td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-outline-secondary btn-editar-categoria" data-id="${categoria.id_categoria}">Editar</button>
                        <button class="btn btn-sm btn-outline-danger btn-excluir-categoria" data-id="${categoria.id_categoria}">Excluir</button>
                    </td>
                </tr>`;
        })
        .join("");

    vincularBotoesCategorias();
}

async function carregarCategorias(): Promise<void> {
    const resposta = await requisitarApi<Categoria[]>(`${URL_API}?recurso=categorias`);

    if (!resposta.sucesso || resposta.dados === undefined) {
        exibirToast(resposta.mensagem ?? "Erro ao carregar categorias.", "erro");
        return;
    }

    listaCategorias = resposta.dados;
    renderizarTabelaCategorias(resposta.dados);

    const seletorFiltro = obterElemento<HTMLSelectElement>("filtroCategoriaProdutos");
    if (seletorFiltro !== null) {
        preencherSelectCategorias(seletorFiltro, true);
    }
}

function vincularBotoesCategorias(): void {
    const botoesEditar = document.querySelectorAll<HTMLButtonElement>(".btn-editar-categoria");
    const botoesExcluir = document.querySelectorAll<HTMLButtonElement>(".btn-excluir-categoria");

    botoesEditar.forEach((botao) => {
        botao.addEventListener("click", () => {
            const idTexto = botao.dataset["id"];
            if (idTexto !== undefined) {
                abrirModalCategoria(Number(idTexto));
            }
        });
    });

    botoesExcluir.forEach((botao) => {
        botao.addEventListener("click", () => {
            const idTexto = botao.dataset["id"];
            if (idTexto !== undefined) {
                confirmarExclusaoCategoria(Number(idTexto));
            }
        });
    });
}

function abrirModalCategoria(id: number | null): void {
    const formulario = obterElemento<HTMLFormElement>("formularioCategoria");
    const titulo = obterElemento<HTMLElement>("tituloModalCategoria");
    const campoId = obterElemento<HTMLInputElement>("categoriaId");
    const campoNome = obterElemento<HTMLInputElement>("categoriaNome");
    const campoDescricao = obterElemento<HTMLTextAreaElement>("categoriaDescricao");

    if (formulario === null || titulo === null || campoId === null || campoNome === null || campoDescricao === null) {
        return;
    }

    formulario.reset();

    if (id === null) {
        titulo.textContent = "Nova Categoria";
        campoId.value = "";
    } else {
        const categoria = listaCategorias.find((item) => item.id_categoria === id);
        if (categoria === undefined) {
            exibirToast("Categoria não encontrada.", "erro");
            return;
        }
        titulo.textContent = "Editar Categoria";
        campoId.value = String(categoria.id_categoria);
        campoNome.value = categoria.nome_categoria;
        campoDescricao.value = categoria.descricao ?? "";
    }

    const elementoModal = obterElemento<HTMLDivElement>("modalCategoria");
    if (elementoModal !== null) {
        new bootstrap.Modal(elementoModal).show();
    }
}

async function salvarCategoria(evento: Event): Promise<void> {
    evento.preventDefault();

    const campoId = obterElemento<HTMLInputElement>("categoriaId");
    const campoNome = obterElemento<HTMLInputElement>("categoriaNome");
    const campoDescricao = obterElemento<HTMLTextAreaElement>("categoriaDescricao");

    if (campoId === null || campoNome === null || campoDescricao === null) {
        return;
    }

    const corpo = {
        nomeCategoria: campoNome.value,
        descricao: campoDescricao.value !== "" ? campoDescricao.value : null,
    };

    const ehEdicao = campoId.value !== "";
    const url = ehEdicao ? `${URL_API}?recurso=categorias&id=${campoId.value}` : `${URL_API}?recurso=categorias`;
    const metodo = ehEdicao ? "PUT" : "POST";

    const resposta = await requisitarApi<{ id: number }>(url, {
        method: metodo,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
    });

    if (!resposta.sucesso) {
        exibirToast(resposta.mensagem ?? "Erro ao salvar categoria.", "erro");
        return;
    }

    exibirToast(resposta.mensagem ?? "Categoria salva com sucesso.", "sucesso");
    fecharModal("modalCategoria");
    await carregarCategorias();
}

function confirmarExclusaoCategoria(id: number): void {
    const confirmado = window.confirm("Deseja realmente excluir esta categoria? Os produtos vinculados ficarão sem categoria.");
    if (!confirmado) {
        return;
    }
    void excluirCategoria(id);
}

async function excluirCategoria(id: number): Promise<void> {
    const resposta = await requisitarApi<null>(`${URL_API}?recurso=categorias&id=${id}`, { method: "DELETE" });

    if (!resposta.sucesso) {
        exibirToast(resposta.mensagem ?? "Erro ao excluir categoria.", "erro");
        return;
    }

    exibirToast(resposta.mensagem ?? "Categoria excluída com sucesso.", "sucesso");
    await carregarCategorias();
    await carregarProdutos();
}

// ============================================================
// PEDIDOS - CARREGAMENTO E RENDERIZAÇÃO
// ============================================================

let listaProdutosParaPedido: Produto[] = [];

function renderizarTabelaPedidos(pedidos: Pedido[]): void {
    const corpoTabela = obterElemento<HTMLTableSectionElement>("corpoTabelaPedidos");
    if (corpoTabela === null) {
        return;
    }

    if (pedidos.length === 0) {
        corpoTabela.innerHTML = `<tr><td colspan="7" class="text-muted fst-italic text-center py-4">Nenhum dado registrado</td></tr>`;
        return;
    }

    corpoTabela.innerHTML = pedidos
        .map((pedido) => {
            const classeStatus =
                pedido.status === "Confirmado"
                    ? "bg-success-subtle text-success-emphasis"
                    : pedido.status === "Pendente"
                      ? "bg-warning-subtle text-warning-emphasis"
                      : "bg-secondary-subtle text-secondary-emphasis";

            return `
                <tr>
                    <td>${formatarData(pedido.data_pedido)}</td>
                    <td>${pedido.nome_produto}</td>
                    <td>${pedido.quantidade}</td>
                    <td>${formatarMoeda(Number(pedido.valor_unitario))}</td>
                    <td>${formatarMoeda(Number(pedido.valor_total))}</td>
                    <td><span class="badge ${classeStatus}">${pedido.status}</span></td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-outline-secondary btn-editar-pedido" data-id="${pedido.id_pedido}">Editar</button>
                        <button class="btn btn-sm btn-outline-danger btn-excluir-pedido" data-id="${pedido.id_pedido}">Excluir</button>
                    </td>
                </tr>`;
        })
        .join("");

    vincularBotoesPedidos();
}

async function carregarPedidos(): Promise<void> {
    const resposta = await requisitarApi<Pedido[]>(`${URL_API}?recurso=pedidos`);

    if (!resposta.sucesso || resposta.dados === undefined) {
        exibirToast(resposta.mensagem ?? "Erro ao carregar pedidos.", "erro");
        return;
    }

    renderizarTabelaPedidos(resposta.dados);
}

function vincularBotoesPedidos(): void {
    const botoesEditar = document.querySelectorAll<HTMLButtonElement>(".btn-editar-pedido");
    const botoesExcluir = document.querySelectorAll<HTMLButtonElement>(".btn-excluir-pedido");

    botoesEditar.forEach((botao) => {
        botao.addEventListener("click", () => {
            const idTexto = botao.dataset["id"];
            if (idTexto !== undefined) {
                void abrirModalPedido(Number(idTexto));
            }
        });
    });

    botoesExcluir.forEach((botao) => {
        botao.addEventListener("click", () => {
            const idTexto = botao.dataset["id"];
            if (idTexto !== undefined) {
                confirmarExclusaoPedido(Number(idTexto));
            }
        });
    });
}

async function abrirModalPedido(id: number | null): Promise<void> {
    const formulario = obterElemento<HTMLFormElement>("formularioPedido");
    const titulo = obterElemento<HTMLElement>("tituloModalPedido");
    const campoId = obterElemento<HTMLInputElement>("pedidoId");
    const campoProduto = obterElemento<HTMLSelectElement>("pedidoProduto");
    const campoQuantidade = obterElemento<HTMLInputElement>("pedidoQuantidade");
    const campoValor = obterElemento<HTMLInputElement>("pedidoValorUnitario");
    const campoData = obterElemento<HTMLInputElement>("pedidoData");
    const campoStatus = obterElemento<HTMLSelectElement>("pedidoStatus");

    if (
        formulario === null ||
        titulo === null ||
        campoId === null ||
        campoProduto === null ||
        campoQuantidade === null ||
        campoValor === null ||
        campoData === null ||
        campoStatus === null
    ) {
        return;
    }

    formulario.reset();

    const resposta = await requisitarApi<Produto[]>(`${URL_API}?recurso=produtos&porPagina=100`);
    if (resposta.sucesso && resposta.dados !== undefined) {
        listaProdutosParaPedido = resposta.dados;
        campoProduto.innerHTML = listaProdutosParaPedido
            .map((produto) => `<option value="${produto.id_produto}" data-preco="${produto.preco_unitario}">${produto.nome_produto}</option>`)
            .join("");
    }

    if (id === null) {
        titulo.textContent = "Novo Pedido";
        campoId.value = "";
        preencherValorUnitarioPedido();

        const hoje = new Date().toISOString().split("T")[0];
        if (hoje !== undefined) {
            campoData.value = hoje;
        }
    } else {
        titulo.textContent = "Editar Pedido";
        const respostaPedido = await requisitarApi<Pedido>(`${URL_API}?recurso=pedidos&id=${id}`);

        if (!respostaPedido.sucesso || respostaPedido.dados === undefined) {
            exibirToast(respostaPedido.mensagem ?? "Pedido não encontrado.", "erro");
            return;
        }

        const pedido = respostaPedido.dados;
        campoId.value = String(pedido.id_pedido);
        campoProduto.value = String(pedido.id_produto);
        campoQuantidade.value = String(pedido.quantidade);
        campoValor.value = pedido.valor_unitario;
        campoData.value = pedido.data_pedido;
        campoStatus.value = pedido.status;
    }

    const elementoModal = obterElemento<HTMLDivElement>("modalPedido");
    if (elementoModal !== null) {
        new bootstrap.Modal(elementoModal).show();
    }
}

function preencherValorUnitarioPedido(): void {
    const campoProduto = obterElemento<HTMLSelectElement>("pedidoProduto");
    const campoValor = obterElemento<HTMLInputElement>("pedidoValorUnitario");
    if (campoProduto === null || campoValor === null) {
        return;
    }

    const produtoSelecionado = listaProdutosParaPedido.find((produto) => String(produto.id_produto) === campoProduto.value);
    if (produtoSelecionado !== undefined) {
        campoValor.value = produtoSelecionado.preco_unitario;
    }
}

async function salvarPedido(evento: Event): Promise<void> {
    evento.preventDefault();

    const campoId = obterElemento<HTMLInputElement>("pedidoId");
    const campoProduto = obterElemento<HTMLSelectElement>("pedidoProduto");
    const campoQuantidade = obterElemento<HTMLInputElement>("pedidoQuantidade");
    const campoValor = obterElemento<HTMLInputElement>("pedidoValorUnitario");
    const campoData = obterElemento<HTMLInputElement>("pedidoData");
    const campoStatus = obterElemento<HTMLSelectElement>("pedidoStatus");

    if (
        campoId === null ||
        campoProduto === null ||
        campoQuantidade === null ||
        campoValor === null ||
        campoData === null ||
        campoStatus === null
    ) {
        return;
    }

    if (campoProduto.value === "") {
        exibirToast("Selecione um produto para o pedido.", "erro");
        return;
    }

    const corpo = {
        idProduto: Number(campoProduto.value),
        quantidade: Number(campoQuantidade.value),
        valorUnitario: Number(campoValor.value),
        dataPedido: campoData.value,
        status: campoStatus.value,
    };

    const ehEdicao = campoId.value !== "";
    const url = ehEdicao ? `${URL_API}?recurso=pedidos&id=${campoId.value}` : `${URL_API}?recurso=pedidos`;
    const metodo = ehEdicao ? "PUT" : "POST";

    const resposta = await requisitarApi<{ id: number }>(url, {
        method: metodo,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
    });

    if (!resposta.sucesso) {
        exibirToast(resposta.mensagem ?? "Erro ao salvar pedido.", "erro");
        return;
    }

    exibirToast(resposta.mensagem ?? "Pedido salvo com sucesso.", "sucesso");
    fecharModal("modalPedido");
    await carregarPedidos();
    await carregarDashboard();
    await carregarProdutos();
}

function confirmarExclusaoPedido(id: number): void {
    const confirmado = window.confirm("Deseja realmente excluir este pedido?");
    if (!confirmado) {
        return;
    }
    void excluirPedido(id);
}

async function excluirPedido(id: number): Promise<void> {
    const resposta = await requisitarApi<null>(`${URL_API}?recurso=pedidos&id=${id}`, { method: "DELETE" });

    if (!resposta.sucesso) {
        exibirToast(resposta.mensagem ?? "Erro ao excluir pedido.", "erro");
        return;
    }

    exibirToast(resposta.mensagem ?? "Pedido excluído com sucesso.", "sucesso");
    await carregarPedidos();
    await carregarDashboard();
}

// ============================================================
// FUNÇÃO AUXILIAR - FECHAR MODAL PELO ID
// ============================================================

function fecharModal(idModal: string): void {
    const elementoModal = obterElemento<HTMLDivElement>(idModal);
    if (elementoModal === null) {
        return;
    }
    const botaoFechar = elementoModal.querySelector<HTMLButtonElement>('[data-bs-dismiss="modal"]');
    if (botaoFechar !== null) {
        botaoFechar.click();
    }
}

// ============================================================
// INICIALIZAÇÃO E EVENTOS
// ============================================================

function vincularEventosGerais(): void {
    const botaoNovoProduto = obterElemento<HTMLButtonElement>("botaoNovoProduto");
    if (botaoNovoProduto !== null) {
        botaoNovoProduto.addEventListener("click", () => {
            void abrirModalProduto(null);
        });
    }

    const formularioProduto = obterElemento<HTMLFormElement>("formularioProduto");
    if (formularioProduto !== null) {
        formularioProduto.addEventListener("submit", (evento) => {
            void salvarProduto(evento);
        });
    }

    const botaoNovaCategoria = obterElemento<HTMLButtonElement>("botaoNovaCategoria");
    if (botaoNovaCategoria !== null) {
        botaoNovaCategoria.addEventListener("click", () => {
            abrirModalCategoria(null);
        });
    }

    const formularioCategoria = obterElemento<HTMLFormElement>("formularioCategoria");
    if (formularioCategoria !== null) {
        formularioCategoria.addEventListener("submit", (evento) => {
            void salvarCategoria(evento);
        });
    }

    const botaoNovoPedido = obterElemento<HTMLButtonElement>("botaoNovoPedido");
    if (botaoNovoPedido !== null) {
        botaoNovoPedido.addEventListener("click", () => {
            void abrirModalPedido(null);
        });
    }

    const formularioPedido = obterElemento<HTMLFormElement>("formularioPedido");
    if (formularioPedido !== null) {
        formularioPedido.addEventListener("submit", (evento) => {
            void salvarPedido(evento);
        });
    }

    const campoPedidoProduto = obterElemento<HTMLSelectElement>("pedidoProduto");
    if (campoPedidoProduto !== null) {
        campoPedidoProduto.addEventListener("change", preencherValorUnitarioPedido);
    }

    const campoBusca = obterElemento<HTMLInputElement>("campoBuscaProdutos");
    if (campoBusca !== null) {
        let temporizador: number | undefined;
        campoBusca.addEventListener("input", () => {
            if (temporizador !== undefined) {
                window.clearTimeout(temporizador);
            }
            temporizador = window.setTimeout(() => {
                termoBuscaProdutos = campoBusca.value;
                paginaAtualProdutos = 1;
                void carregarProdutos();
            }, 400);
        });
    }

    const seletorFiltroCategoria = obterElemento<HTMLSelectElement>("filtroCategoriaProdutos");
    if (seletorFiltroCategoria !== null) {
        seletorFiltroCategoria.addEventListener("change", () => {
            filtroCategoriaProdutos = seletorFiltroCategoria.value;
            paginaAtualProdutos = 1;
            void carregarProdutos();
        });
    }

    const botaoPaginaAnterior = obterElemento<HTMLButtonElement>("botaoPaginaAnterior");
    if (botaoPaginaAnterior !== null) {
        botaoPaginaAnterior.addEventListener("click", () => {
            if (paginaAtualProdutos > 1) {
                paginaAtualProdutos -= 1;
                void carregarProdutos();
            }
        });
    }

    const botaoPaginaProxima = obterElemento<HTMLButtonElement>("botaoPaginaProxima");
    if (botaoPaginaProxima !== null) {
        botaoPaginaProxima.addEventListener("click", () => {
            paginaAtualProdutos += 1;
            void carregarProdutos();
        });
    }
}

async function inicializar(): Promise<void> {
    vincularEventosGerais();
    await carregarCategorias();
    await carregarProdutos();
    await carregarPedidos();
    await carregarDashboard();
}

document.addEventListener("DOMContentLoaded", () => {
    void inicializar();
});
