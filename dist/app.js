// ============================================================
// CONFIGURAÇÃO E ESTADO GERAL
// ============================================================
const URL_API = "api.php";
const PRODUTOS_POR_PAGINA = 6;
let listaCategorias = [];
let paginaAtualProdutos = 1;
let termoBuscaProdutos = "";
let filtroCategoriaProdutos = "";
// ============================================================
// FUNÇÕES UTILITÁRIAS
// ============================================================
function obterElemento(id) {
    return document.getElementById(id);
}
function formatarMoeda(valor) {
    return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function formatarData(data) {
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
function exibirToast(mensagem, tipo) {
    const container = obterElemento("containerToasts");
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
async function requisitarApi(url, opcoes) {
    try {
        const resposta = await fetch(url, opcoes);
        const corpo = (await resposta.json());
        return corpo;
    }
    catch (erro) {
        console.error("Erro de rede ou de leitura da resposta:", erro);
        return { sucesso: false, mensagem: "Não foi possível conectar à API. Verifique o XAMPP." };
    }
}
// ============================================================
// DASHBOARD - CÁLCULOS (REDUCE / FILTER / MAP)
// ============================================================
function calcularFaturamentoTotal(pedidos) {
    const pedidosValidos = pedidos.filter((pedido) => pedido.status !== "Cancelado");
    return pedidosValidos.reduce((acumulado, pedido) => {
        return acumulado + pedido.quantidade * Number(pedido.valor_unitario);
    }, 0);
}
function obterProdutosEstoqueCritico(produtos) {
    return produtos.filter((produto) => produto.status_estoque === "Crítico" || produto.status_estoque === "Esgotado");
}
function calcularRankingProdutos(pedidos) {
    const pedidosValidos = pedidos.filter((pedido) => pedido.status !== "Cancelado");
    const mapaRanking = new Map();
    for (const pedido of pedidosValidos) {
        const valorPedido = pedido.quantidade * Number(pedido.valor_unitario);
        const existente = mapaRanking.get(pedido.nome_produto);
        if (existente) {
            existente.totalVendido += pedido.quantidade;
            existente.faturamento += valorPedido;
        }
        else {
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
function renderizarCardsDashboard(dados) {
    const cardFaturamento = obterElemento("cardFaturamentoTotal");
    const cardProdutosAtivos = obterElemento("cardProdutosAtivos");
    const cardEstoqueCritico = obterElemento("cardEstoqueCritico");
    const cardProdutoTop = obterElemento("cardProdutoMaisVendido");
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
function renderizarRankingProdutos(pedidos) {
    const container = obterElemento("listaRankingProdutos");
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
function renderizarFaturamentoCategoria(dados) {
    const container = obterElemento("listaFaturamentoCategoria");
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
async function carregarDashboard() {
    const resposta = await requisitarApi(`${URL_API}?recurso=dashboard`);
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
function renderizarTabelaProdutos(produtos) {
    const corpoTabela = obterElemento("corpoTabelaProdutos");
    if (corpoTabela === null) {
        return;
    }
    if (produtos.length === 0) {
        corpoTabela.innerHTML = `<tr><td colspan="6" class="text-muted fst-italic text-center py-4">Nenhum dado registrado</td></tr>`;
        return;
    }
    corpoTabela.innerHTML = produtos
        .map((produto) => {
        const classeStatus = produto.status_estoque === "Normal"
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
async function carregarProdutos() {
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
    const resposta = await requisitarApi(`${URL_API}?${parametros.toString()}`);
    if (!resposta.sucesso || resposta.dados === undefined) {
        exibirToast(resposta.mensagem ?? "Erro ao carregar produtos.", "erro");
        return;
    }
    renderizarTabelaProdutos(resposta.dados);
    atualizarControlesPaginacao(resposta.dados.length);
}
function atualizarControlesPaginacao(quantidadeRetornada) {
    const rotuloPagina = obterElemento("rotuloPaginaAtual");
    const botaoAnterior = obterElemento("botaoPaginaAnterior");
    const botaoProxima = obterElemento("botaoPaginaProxima");
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
function preencherSelectCategorias(seletor, incluirTodas) {
    const opcaoInicial = incluirTodas
        ? `<option value="">Todas as categorias</option>`
        : `<option value="">Selecione uma categoria</option>`;
    seletor.innerHTML = opcaoInicial + listaCategorias
        .map((categoria) => `<option value="${categoria.id_categoria}">${categoria.nome_categoria}</option>`)
        .join("");
}
function vincularBotoesProdutos() {
    const botoesEditar = document.querySelectorAll(".btn-editar-produto");
    const botoesExcluir = document.querySelectorAll(".btn-excluir-produto");
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
async function abrirModalProduto(id) {
    const formulario = obterElemento("formularioProduto");
    const titulo = obterElemento("tituloModalProduto");
    const campoId = obterElemento("produtoId");
    const campoNome = obterElemento("produtoNome");
    const campoCategoria = obterElemento("produtoCategoria");
    const campoDescricao = obterElemento("produtoDescricao");
    const campoPreco = obterElemento("produtoPreco");
    const campoEstoque = obterElemento("produtoEstoque");
    const campoEstoqueMinimo = obterElemento("produtoEstoqueMinimo");
    const campoAtivo = obterElemento("produtoAtivo");
    if (formulario === null ||
        titulo === null ||
        campoId === null ||
        campoNome === null ||
        campoCategoria === null ||
        campoDescricao === null ||
        campoPreco === null ||
        campoEstoque === null ||
        campoEstoqueMinimo === null ||
        campoAtivo === null) {
        return;
    }
    formulario.reset();
    preencherSelectCategorias(campoCategoria, false);
    if (id === null) {
        titulo.textContent = "Novo Produto";
        campoId.value = "";
        campoAtivo.checked = true;
    }
    else {
        titulo.textContent = "Editar Produto";
        const resposta = await requisitarApi(`${URL_API}?recurso=produtos&id=${id}`);
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
    const elementoModal = obterElemento("modalProduto");
    if (elementoModal !== null) {
        new bootstrap.Modal(elementoModal).show();
    }
}
async function salvarProduto(evento) {
    evento.preventDefault();
    const campoId = obterElemento("produtoId");
    const campoNome = obterElemento("produtoNome");
    const campoCategoria = obterElemento("produtoCategoria");
    const campoDescricao = obterElemento("produtoDescricao");
    const campoPreco = obterElemento("produtoPreco");
    const campoEstoque = obterElemento("produtoEstoque");
    const campoEstoqueMinimo = obterElemento("produtoEstoqueMinimo");
    const campoAtivo = obterElemento("produtoAtivo");
    if (campoId === null ||
        campoNome === null ||
        campoCategoria === null ||
        campoDescricao === null ||
        campoPreco === null ||
        campoEstoque === null ||
        campoEstoqueMinimo === null ||
        campoAtivo === null) {
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
    const resposta = await requisitarApi(url, {
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
function confirmarExclusaoProduto(id) {
    const confirmado = window.confirm("Deseja realmente excluir este produto?");
    if (!confirmado) {
        return;
    }
    void excluirProduto(id);
}
async function excluirProduto(id) {
    const resposta = await requisitarApi(`${URL_API}?recurso=produtos&id=${id}`, { method: "DELETE" });
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
function renderizarTabelaCategorias(categorias) {
    const corpoTabela = obterElemento("corpoTabelaCategorias");
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
async function carregarCategorias() {
    const resposta = await requisitarApi(`${URL_API}?recurso=categorias`);
    if (!resposta.sucesso || resposta.dados === undefined) {
        exibirToast(resposta.mensagem ?? "Erro ao carregar categorias.", "erro");
        return;
    }
    listaCategorias = resposta.dados;
    renderizarTabelaCategorias(resposta.dados);
    const seletorFiltro = obterElemento("filtroCategoriaProdutos");
    if (seletorFiltro !== null) {
        preencherSelectCategorias(seletorFiltro, true);
    }
}
function vincularBotoesCategorias() {
    const botoesEditar = document.querySelectorAll(".btn-editar-categoria");
    const botoesExcluir = document.querySelectorAll(".btn-excluir-categoria");
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
function abrirModalCategoria(id) {
    const formulario = obterElemento("formularioCategoria");
    const titulo = obterElemento("tituloModalCategoria");
    const campoId = obterElemento("categoriaId");
    const campoNome = obterElemento("categoriaNome");
    const campoDescricao = obterElemento("categoriaDescricao");
    if (formulario === null || titulo === null || campoId === null || campoNome === null || campoDescricao === null) {
        return;
    }
    formulario.reset();
    if (id === null) {
        titulo.textContent = "Nova Categoria";
        campoId.value = "";
    }
    else {
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
    const elementoModal = obterElemento("modalCategoria");
    if (elementoModal !== null) {
        new bootstrap.Modal(elementoModal).show();
    }
}
async function salvarCategoria(evento) {
    evento.preventDefault();
    const campoId = obterElemento("categoriaId");
    const campoNome = obterElemento("categoriaNome");
    const campoDescricao = obterElemento("categoriaDescricao");
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
    const resposta = await requisitarApi(url, {
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
function confirmarExclusaoCategoria(id) {
    const confirmado = window.confirm("Deseja realmente excluir esta categoria? Os produtos vinculados ficarão sem categoria.");
    if (!confirmado) {
        return;
    }
    void excluirCategoria(id);
}
async function excluirCategoria(id) {
    const resposta = await requisitarApi(`${URL_API}?recurso=categorias&id=${id}`, { method: "DELETE" });
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
let listaProdutosParaPedido = [];
function renderizarTabelaPedidos(pedidos) {
    const corpoTabela = obterElemento("corpoTabelaPedidos");
    if (corpoTabela === null) {
        return;
    }
    if (pedidos.length === 0) {
        corpoTabela.innerHTML = `<tr><td colspan="7" class="text-muted fst-italic text-center py-4">Nenhum dado registrado</td></tr>`;
        return;
    }
    corpoTabela.innerHTML = pedidos
        .map((pedido) => {
        const classeStatus = pedido.status === "Confirmado"
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
async function carregarPedidos() {
    const resposta = await requisitarApi(`${URL_API}?recurso=pedidos`);
    if (!resposta.sucesso || resposta.dados === undefined) {
        exibirToast(resposta.mensagem ?? "Erro ao carregar pedidos.", "erro");
        return;
    }
    renderizarTabelaPedidos(resposta.dados);
}
function vincularBotoesPedidos() {
    const botoesEditar = document.querySelectorAll(".btn-editar-pedido");
    const botoesExcluir = document.querySelectorAll(".btn-excluir-pedido");
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
async function abrirModalPedido(id) {
    const formulario = obterElemento("formularioPedido");
    const titulo = obterElemento("tituloModalPedido");
    const campoId = obterElemento("pedidoId");
    const campoProduto = obterElemento("pedidoProduto");
    const campoQuantidade = obterElemento("pedidoQuantidade");
    const campoValor = obterElemento("pedidoValorUnitario");
    const campoData = obterElemento("pedidoData");
    const campoStatus = obterElemento("pedidoStatus");
    if (formulario === null ||
        titulo === null ||
        campoId === null ||
        campoProduto === null ||
        campoQuantidade === null ||
        campoValor === null ||
        campoData === null ||
        campoStatus === null) {
        return;
    }
    formulario.reset();
    const resposta = await requisitarApi(`${URL_API}?recurso=produtos&porPagina=100`);
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
    }
    else {
        titulo.textContent = "Editar Pedido";
        const respostaPedido = await requisitarApi(`${URL_API}?recurso=pedidos&id=${id}`);
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
    const elementoModal = obterElemento("modalPedido");
    if (elementoModal !== null) {
        new bootstrap.Modal(elementoModal).show();
    }
}
function preencherValorUnitarioPedido() {
    const campoProduto = obterElemento("pedidoProduto");
    const campoValor = obterElemento("pedidoValorUnitario");
    if (campoProduto === null || campoValor === null) {
        return;
    }
    const produtoSelecionado = listaProdutosParaPedido.find((produto) => String(produto.id_produto) === campoProduto.value);
    if (produtoSelecionado !== undefined) {
        campoValor.value = produtoSelecionado.preco_unitario;
    }
}
async function salvarPedido(evento) {
    evento.preventDefault();
    const campoId = obterElemento("pedidoId");
    const campoProduto = obterElemento("pedidoProduto");
    const campoQuantidade = obterElemento("pedidoQuantidade");
    const campoValor = obterElemento("pedidoValorUnitario");
    const campoData = obterElemento("pedidoData");
    const campoStatus = obterElemento("pedidoStatus");
    if (campoId === null ||
        campoProduto === null ||
        campoQuantidade === null ||
        campoValor === null ||
        campoData === null ||
        campoStatus === null) {
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
    const resposta = await requisitarApi(url, {
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
function confirmarExclusaoPedido(id) {
    const confirmado = window.confirm("Deseja realmente excluir este pedido?");
    if (!confirmado) {
        return;
    }
    void excluirPedido(id);
}
async function excluirPedido(id) {
    const resposta = await requisitarApi(`${URL_API}?recurso=pedidos&id=${id}`, { method: "DELETE" });
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
function fecharModal(idModal) {
    const elementoModal = obterElemento(idModal);
    if (elementoModal === null) {
        return;
    }
    const botaoFechar = elementoModal.querySelector('[data-bs-dismiss="modal"]');
    if (botaoFechar !== null) {
        botaoFechar.click();
    }
}
// ============================================================
// INICIALIZAÇÃO E EVENTOS
// ============================================================
function vincularEventosGerais() {
    const botaoNovoProduto = obterElemento("botaoNovoProduto");
    if (botaoNovoProduto !== null) {
        botaoNovoProduto.addEventListener("click", () => {
            void abrirModalProduto(null);
        });
    }
    const formularioProduto = obterElemento("formularioProduto");
    if (formularioProduto !== null) {
        formularioProduto.addEventListener("submit", (evento) => {
            void salvarProduto(evento);
        });
    }
    const botaoNovaCategoria = obterElemento("botaoNovaCategoria");
    if (botaoNovaCategoria !== null) {
        botaoNovaCategoria.addEventListener("click", () => {
            abrirModalCategoria(null);
        });
    }
    const formularioCategoria = obterElemento("formularioCategoria");
    if (formularioCategoria !== null) {
        formularioCategoria.addEventListener("submit", (evento) => {
            void salvarCategoria(evento);
        });
    }
    const botaoNovoPedido = obterElemento("botaoNovoPedido");
    if (botaoNovoPedido !== null) {
        botaoNovoPedido.addEventListener("click", () => {
            void abrirModalPedido(null);
        });
    }
    const formularioPedido = obterElemento("formularioPedido");
    if (formularioPedido !== null) {
        formularioPedido.addEventListener("submit", (evento) => {
            void salvarPedido(evento);
        });
    }
    const campoPedidoProduto = obterElemento("pedidoProduto");
    if (campoPedidoProduto !== null) {
        campoPedidoProduto.addEventListener("change", preencherValorUnitarioPedido);
    }
    const campoBusca = obterElemento("campoBuscaProdutos");
    if (campoBusca !== null) {
        let temporizador;
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
    const seletorFiltroCategoria = obterElemento("filtroCategoriaProdutos");
    if (seletorFiltroCategoria !== null) {
        seletorFiltroCategoria.addEventListener("change", () => {
            filtroCategoriaProdutos = seletorFiltroCategoria.value;
            paginaAtualProdutos = 1;
            void carregarProdutos();
        });
    }
    const botaoPaginaAnterior = obterElemento("botaoPaginaAnterior");
    if (botaoPaginaAnterior !== null) {
        botaoPaginaAnterior.addEventListener("click", () => {
            if (paginaAtualProdutos > 1) {
                paginaAtualProdutos -= 1;
                void carregarProdutos();
            }
        });
    }
    const botaoPaginaProxima = obterElemento("botaoPaginaProxima");
    if (botaoPaginaProxima !== null) {
        botaoPaginaProxima.addEventListener("click", () => {
            paginaAtualProdutos += 1;
            void carregarProdutos();
        });
    }
}
async function inicializar() {
    vincularEventosGerais();
    await carregarCategorias();
    await carregarProdutos();
    await carregarPedidos();
    await carregarDashboard();
}
document.addEventListener("DOMContentLoaded", () => {
    void inicializar();
});
export {};
