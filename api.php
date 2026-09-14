<?php

// ============================================================
// API - AUTO NOBRE REPRESENTAÇÕES - PAINEL DE CONTROLE
// API JSON única, com roteamento por "recurso"
// ============================================================

require_once "config.php";

header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(204);
    exit;
}

// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

function responderJson(array $dados, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($dados, JSON_UNESCAPED_UNICODE);
    exit;
}

function obterCorpoRequisicao(): array
{
    $corpo = file_get_contents("php://input");
    $dados = json_decode($corpo, true);
    return is_array($dados) ? $dados : [];
}

// ============================================================
// FUNÇÕES - PRODUTOS
// ============================================================

function listarProdutos(PDO $pdo, ?string $busca, ?int $idCategoria, int $pagina, int $porPagina): array
{
    $limite = $porPagina;
    $offset = ($pagina - 1) * $porPagina;

    // CHAMADA DA STORED PROCEDURE (BUSCA + FILTRO + PAGINAÇÃO)
    $stmt = $pdo->prepare("CALL sp_buscarProdutos(:termo, :categoria, :limite, :offset)");
    $stmt->bindValue(":termo", $busca);
    $stmt->bindValue(":categoria", $idCategoria, $idCategoria === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
    $stmt->bindValue(":limite", $limite, PDO::PARAM_INT);
    $stmt->bindValue(":offset", $offset, PDO::PARAM_INT);
    $stmt->execute();

    return $stmt->fetchAll();
}

function buscarProdutoPorId(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare("SELECT * FROM vw_estoque_produtos WHERE id_produto = :id");
    $stmt->bindValue(":id", $id, PDO::PARAM_INT);
    $stmt->execute();

    $produto = $stmt->fetch();
    return $produto === false ? null : $produto;
}

function criarProduto(PDO $pdo, array $dados): int
{
    $sql = "INSERT INTO produtos (nome_produto, descricao, id_categoria, preco_unitario, quantidade_estoque, estoque_minimo, ativo)
            VALUES (:nome, :descricao, :categoria, :preco, :estoque, :estoqueMinimo, :ativo)";

    $stmt = $pdo->prepare($sql);
    $stmt->bindValue(":nome", $dados["nomeProduto"]);
    $stmt->bindValue(":descricao", $dados["descricao"] ?? null);
    $stmt->bindValue(":categoria", $dados["idCategoria"] ?? null, PDO::PARAM_INT);
    $stmt->bindValue(":preco", $dados["precoUnitario"]);
    $stmt->bindValue(":estoque", $dados["quantidadeEstoque"] ?? 0, PDO::PARAM_INT);
    $stmt->bindValue(":estoqueMinimo", $dados["estoqueMinimo"] ?? 5, PDO::PARAM_INT);
    $stmt->bindValue(":ativo", $dados["ativo"] ?? 1, PDO::PARAM_INT);
    $stmt->execute();

    return (int) $pdo->lastInsertId();
}

function atualizarProduto(PDO $pdo, int $id, array $dados): bool
{
    $sql = "UPDATE produtos SET
                nome_produto = :nome,
                descricao = :descricao,
                id_categoria = :categoria,
                preco_unitario = :preco,
                quantidade_estoque = :estoque,
                estoque_minimo = :estoqueMinimo,
                ativo = :ativo
            WHERE id_produto = :id";

    $stmt = $pdo->prepare($sql);
    $stmt->bindValue(":nome", $dados["nomeProduto"]);
    $stmt->bindValue(":descricao", $dados["descricao"] ?? null);
    $stmt->bindValue(":categoria", $dados["idCategoria"] ?? null, PDO::PARAM_INT);
    $stmt->bindValue(":preco", $dados["precoUnitario"]);
    $stmt->bindValue(":estoque", $dados["quantidadeEstoque"] ?? 0, PDO::PARAM_INT);
    $stmt->bindValue(":estoqueMinimo", $dados["estoqueMinimo"] ?? 5, PDO::PARAM_INT);
    $stmt->bindValue(":ativo", $dados["ativo"] ?? 1, PDO::PARAM_INT);
    $stmt->bindValue(":id", $id, PDO::PARAM_INT);

    return $stmt->execute() && $stmt->rowCount() > 0;
}

function excluirProduto(PDO $pdo, int $id): bool
{
    $stmt = $pdo->prepare("DELETE FROM produtos WHERE id_produto = :id");
    $stmt->bindValue(":id", $id, PDO::PARAM_INT);
    $stmt->execute();

    return $stmt->rowCount() > 0;
}

// ============================================================
// FUNÇÕES - CATEGORIAS
// ============================================================

function listarCategorias(PDO $pdo): array
{
    $stmt = $pdo->query("SELECT * FROM categorias ORDER BY nome_categoria ASC");
    return $stmt->fetchAll();
}

function buscarCategoriaPorId(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare("SELECT * FROM categorias WHERE id_categoria = :id");
    $stmt->bindValue(":id", $id, PDO::PARAM_INT);
    $stmt->execute();

    $categoria = $stmt->fetch();
    return $categoria === false ? null : $categoria;
}

function criarCategoria(PDO $pdo, array $dados): int
{
    $stmt = $pdo->prepare("INSERT INTO categorias (nome_categoria, descricao) VALUES (:nome, :descricao)");
    $stmt->bindValue(":nome", $dados["nomeCategoria"]);
    $stmt->bindValue(":descricao", $dados["descricao"] ?? null);
    $stmt->execute();

    return (int) $pdo->lastInsertId();
}

function atualizarCategoria(PDO $pdo, int $id, array $dados): bool
{
    $stmt = $pdo->prepare("UPDATE categorias SET nome_categoria = :nome, descricao = :descricao WHERE id_categoria = :id");
    $stmt->bindValue(":nome", $dados["nomeCategoria"]);
    $stmt->bindValue(":descricao", $dados["descricao"] ?? null);
    $stmt->bindValue(":id", $id, PDO::PARAM_INT);

    return $stmt->execute() && $stmt->rowCount() > 0;
}

function excluirCategoria(PDO $pdo, int $id): bool
{
    $stmt = $pdo->prepare("DELETE FROM categorias WHERE id_categoria = :id");
    $stmt->bindValue(":id", $id, PDO::PARAM_INT);
    $stmt->execute();

    return $stmt->rowCount() > 0;
}

// ============================================================
// FUNÇÕES - PEDIDOS
// ============================================================

function listarPedidos(PDO $pdo): array
{
    $stmt = $pdo->query("SELECT * FROM vw_pedidos_detalhados ORDER BY data_pedido DESC, id_pedido DESC");
    return $stmt->fetchAll();
}

function buscarPedidoPorId(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare("SELECT * FROM vw_pedidos_detalhados WHERE id_pedido = :id");
    $stmt->bindValue(":id", $id, PDO::PARAM_INT);
    $stmt->execute();

    $pedido = $stmt->fetch();
    return $pedido === false ? null : $pedido;
}

function criarPedido(PDO $pdo, array $dados): int
{
    $sql = "INSERT INTO pedidos (id_produto, quantidade, valor_unitario, data_pedido, status)
            VALUES (:produto, :quantidade, :valorUnitario, :data, :status)";

    $stmt = $pdo->prepare($sql);
    $stmt->bindValue(":produto", $dados["idProduto"], PDO::PARAM_INT);
    $stmt->bindValue(":quantidade", $dados["quantidade"], PDO::PARAM_INT);
    $stmt->bindValue(":valorUnitario", $dados["valorUnitario"]);
    $stmt->bindValue(":data", $dados["dataPedido"] ?? date("Y-m-d"));
    $stmt->bindValue(":status", $dados["status"] ?? "Pendente");
    $stmt->execute();

    return (int) $pdo->lastInsertId();
}

function atualizarPedido(PDO $pdo, int $id, array $dados): bool
{
    $sql = "UPDATE pedidos SET
                id_produto = :produto,
                quantidade = :quantidade,
                valor_unitario = :valorUnitario,
                data_pedido = :data,
                status = :status
            WHERE id_pedido = :id";

    $stmt = $pdo->prepare($sql);
    $stmt->bindValue(":produto", $dados["idProduto"], PDO::PARAM_INT);
    $stmt->bindValue(":quantidade", $dados["quantidade"], PDO::PARAM_INT);
    $stmt->bindValue(":valorUnitario", $dados["valorUnitario"]);
    $stmt->bindValue(":data", $dados["dataPedido"]);
    $stmt->bindValue(":status", $dados["status"]);
    $stmt->bindValue(":id", $id, PDO::PARAM_INT);

    return $stmt->execute() && $stmt->rowCount() > 0;
}

function excluirPedido(PDO $pdo, int $id): bool
{
    $stmt = $pdo->prepare("DELETE FROM pedidos WHERE id_pedido = :id");
    $stmt->bindValue(":id", $id, PDO::PARAM_INT);
    $stmt->execute();

    return $stmt->rowCount() > 0;
}

// ============================================================
// FUNÇÃO - DASHBOARD (DADOS BRUTOS PARA AGREGAÇÃO NO FRONTEND)
// ============================================================

function obterDadosDashboard(PDO $pdo): array
{
    $produtos = $pdo->query("SELECT * FROM vw_estoque_produtos")->fetchAll();
    $pedidos = $pdo->query("SELECT * FROM vw_pedidos_detalhados")->fetchAll();
    $faturamentoCategoria = $pdo->query("SELECT * FROM vw_faturamento_categoria")->fetchAll();

    return [
        "produtos" => $produtos,
        "pedidos" => $pedidos,
        "faturamentoCategoria" => $faturamentoCategoria,
    ];
}

// ============================================================
// ROTEAMENTO PRINCIPAL
// ============================================================

$pdo = obterConexao();
$recurso = $_GET["recurso"] ?? "";
$metodo = $_SERVER["REQUEST_METHOD"];
$id = isset($_GET["id"]) ? (int) $_GET["id"] : null;

try {
    switch ($recurso) {

        // --------------------------------------------------
        // ROTA: DASHBOARD
        // --------------------------------------------------
        case "dashboard":
            responderJson(["sucesso" => true, "dados" => obterDadosDashboard($pdo)]);
            break;

        // --------------------------------------------------
        // ROTA: PRODUTOS
        // --------------------------------------------------
        case "produtos":
            if ($metodo === "GET" && $id !== null) {
                $produto = buscarProdutoPorId($pdo, $id);
                if ($produto === null) {
                    responderJson(["sucesso" => false, "mensagem" => "Produto não encontrado."], 404);
                }
                responderJson(["sucesso" => true, "dados" => $produto]);

            } elseif ($metodo === "GET") {
                $busca = $_GET["busca"] ?? null;
                $categoria = isset($_GET["categoria"]) && $_GET["categoria"] !== "" ? (int) $_GET["categoria"] : null;
                $pagina = isset($_GET["pagina"]) ? max(1, (int) $_GET["pagina"]) : 1;
                $porPagina = isset($_GET["porPagina"]) ? max(1, (int) $_GET["porPagina"]) : 10;

                $produtos = listarProdutos($pdo, $busca, $categoria, $pagina, $porPagina);
                responderJson(["sucesso" => true, "dados" => $produtos, "pagina" => $pagina, "porPagina" => $porPagina]);

            } elseif ($metodo === "POST") {
                $dados = obterCorpoRequisicao();
                $novoId = criarProduto($pdo, $dados);
                responderJson(["sucesso" => true, "mensagem" => "Produto cadastrado com sucesso.", "id" => $novoId], 201);

            } elseif ($metodo === "PUT") {
                if ($id === null) {
                    responderJson(["sucesso" => false, "mensagem" => "Informe o id do produto."], 400);
                }
                $dados = obterCorpoRequisicao();
                $atualizado = atualizarProduto($pdo, $id, $dados);
                if (!$atualizado) {
                    responderJson(["sucesso" => false, "mensagem" => "Produto não encontrado ou nenhum dado alterado."], 404);
                }
                responderJson(["sucesso" => true, "mensagem" => "Produto atualizado com sucesso."]);

            } elseif ($metodo === "DELETE") {
                if ($id === null) {
                    responderJson(["sucesso" => false, "mensagem" => "Informe o id do produto."], 400);
                }
                $excluido = excluirProduto($pdo, $id);
                if (!$excluido) {
                    responderJson(["sucesso" => false, "mensagem" => "Produto não encontrado. Nada foi excluído."], 404);
                }
                responderJson(["sucesso" => true, "mensagem" => "Produto excluído com sucesso."]);

            } else {
                responderJson(["sucesso" => false, "mensagem" => "Método não permitido para este recurso."], 405);
            }
            break;

        // --------------------------------------------------
        // ROTA: CATEGORIAS
        // --------------------------------------------------
        case "categorias":
            if ($metodo === "GET" && $id !== null) {
                $categoria = buscarCategoriaPorId($pdo, $id);
                if ($categoria === null) {
                    responderJson(["sucesso" => false, "mensagem" => "Categoria não encontrada."], 404);
                }
                responderJson(["sucesso" => true, "dados" => $categoria]);

            } elseif ($metodo === "GET") {
                responderJson(["sucesso" => true, "dados" => listarCategorias($pdo)]);

            } elseif ($metodo === "POST") {
                $dados = obterCorpoRequisicao();
                $novoId = criarCategoria($pdo, $dados);
                responderJson(["sucesso" => true, "mensagem" => "Categoria cadastrada com sucesso.", "id" => $novoId], 201);

            } elseif ($metodo === "PUT") {
                if ($id === null) {
                    responderJson(["sucesso" => false, "mensagem" => "Informe o id da categoria."], 400);
                }
                $dados = obterCorpoRequisicao();
                $atualizado = atualizarCategoria($pdo, $id, $dados);
                if (!$atualizado) {
                    responderJson(["sucesso" => false, "mensagem" => "Categoria não encontrada ou nenhum dado alterado."], 404);
                }
                responderJson(["sucesso" => true, "mensagem" => "Categoria atualizada com sucesso."]);

            } elseif ($metodo === "DELETE") {
                if ($id === null) {
                    responderJson(["sucesso" => false, "mensagem" => "Informe o id da categoria."], 400);
                }
                $excluido = excluirCategoria($pdo, $id);
                if (!$excluido) {
                    responderJson(["sucesso" => false, "mensagem" => "Categoria não encontrada. Nada foi excluído."], 404);
                }
                responderJson(["sucesso" => true, "mensagem" => "Categoria excluída com sucesso. Os produtos vinculados ficaram sem categoria."]);

            } else {
                responderJson(["sucesso" => false, "mensagem" => "Método não permitido para este recurso."], 405);
            }
            break;

        // --------------------------------------------------
        // ROTA: PEDIDOS
        // --------------------------------------------------
        case "pedidos":
            if ($metodo === "GET" && $id !== null) {
                $pedido = buscarPedidoPorId($pdo, $id);
                if ($pedido === null) {
                    responderJson(["sucesso" => false, "mensagem" => "Pedido não encontrado."], 404);
                }
                responderJson(["sucesso" => true, "dados" => $pedido]);

            } elseif ($metodo === "GET") {
                responderJson(["sucesso" => true, "dados" => listarPedidos($pdo)]);

            } elseif ($metodo === "POST") {
                $dados = obterCorpoRequisicao();
                $novoId = criarPedido($pdo, $dados);
                responderJson(["sucesso" => true, "mensagem" => "Pedido registrado com sucesso.", "id" => $novoId], 201);

            } elseif ($metodo === "PUT") {
                if ($id === null) {
                    responderJson(["sucesso" => false, "mensagem" => "Informe o id do pedido."], 400);
                }
                $dados = obterCorpoRequisicao();
                $atualizado = atualizarPedido($pdo, $id, $dados);
                if (!$atualizado) {
                    responderJson(["sucesso" => false, "mensagem" => "Pedido não encontrado ou nenhum dado alterado."], 404);
                }
                responderJson(["sucesso" => true, "mensagem" => "Pedido atualizado com sucesso."]);

            } elseif ($metodo === "DELETE") {
                if ($id === null) {
                    responderJson(["sucesso" => false, "mensagem" => "Informe o id do pedido."], 400);
                }
                $excluido = excluirPedido($pdo, $id);
                if (!$excluido) {
                    responderJson(["sucesso" => false, "mensagem" => "Pedido não encontrado. Nada foi excluído."], 404);
                }
                responderJson(["sucesso" => true, "mensagem" => "Pedido excluído com sucesso."]);

            } else {
                responderJson(["sucesso" => false, "mensagem" => "Método não permitido para este recurso."], 405);
            }
            break;

        // --------------------------------------------------
        // ROTA INEXISTENTE
        // --------------------------------------------------
        default:
            responderJson(["sucesso" => false, "mensagem" => "Recurso não encontrado. Use ?recurso=produtos|categorias|pedidos|dashboard"], 404);
    }

} catch (PDOException $erro) {
    // A TRIGGER BEFORE UPDATE DISPARA SIGNAL SQLSTATE 45000 QUANDO
    // O ESTOQUE OU PREÇO FICAM NEGATIVOS - CAPTURADO AQUI
    responderJson([
        "sucesso" => false,
        "mensagem" => "Erro ao processar a solicitação.",
        "erro" => $erro->getMessage()
    ], 400);
}
