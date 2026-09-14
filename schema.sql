-- ============================================================
-- AUTO NOBRE REPRESENTAÇÕES - PAINEL DE CONTROLE
-- Script de criação do banco de dados (MariaDB)
-- Projeto 3 - 3º Bimestre
--
-- Categorias e produtos baseados no catálogo real do site
-- institucional (Projeto 2 / dump autonobre_bd.sql). Preço,
-- estoque e pedidos são dados fictícios para fins didáticos,
-- já que o catálogo institucional não guarda essas informações.
-- ============================================================

CREATE DATABASE IF NOT EXISTS auto_nobre
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE auto_nobre;

-- ============================================================
-- TABELAS BASE
-- ============================================================

CREATE TABLE categorias (
    id_categoria INT AUTO_INCREMENT PRIMARY KEY,
    nome_categoria VARCHAR(80) NOT NULL,
    descricao VARCHAR(255) NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE produtos (
    id_produto INT AUTO_INCREMENT PRIMARY KEY,
    nome_produto VARCHAR(120) NOT NULL,
    descricao VARCHAR(255) NULL,
    id_categoria INT NULL,
    preco_unitario DECIMAL(10,2) NOT NULL DEFAULT 0,
    quantidade_estoque INT NOT NULL DEFAULT 0,
    estoque_minimo INT NOT NULL DEFAULT 5,
    ativo TINYINT(1) NOT NULL DEFAULT 1,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_produto_categoria
        FOREIGN KEY (id_categoria) REFERENCES categorias(id_categoria)
        ON DELETE SET NULL
);

CREATE TABLE pedidos (
    id_pedido INT AUTO_INCREMENT PRIMARY KEY,
    id_produto INT NOT NULL,
    quantidade INT NOT NULL,
    valor_unitario DECIMAL(10,2) NOT NULL,
    data_pedido DATE NOT NULL DEFAULT (CURRENT_DATE),
    status VARCHAR(20) NOT NULL DEFAULT 'Pendente',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pedido_produto
        FOREIGN KEY (id_produto) REFERENCES produtos(id_produto)
        ON DELETE CASCADE
);

-- ============================================================
-- FUNCTION REUTILIZÁVEL
-- Calcula o status do estoque de um produto (usada em views e SP)
-- ============================================================

DELIMITER //

CREATE FUNCTION fn_statusEstoque(p_quantidade INT, p_minimo INT)
RETURNS VARCHAR(20)
DETERMINISTIC
BEGIN
    DECLARE v_status VARCHAR(20);

    IF p_quantidade <= 0 THEN
        SET v_status = 'Esgotado';
    ELSEIF p_quantidade <= p_minimo THEN
        SET v_status = 'Crítico';
    ELSE
        SET v_status = 'Normal';
    END IF;

    RETURN v_status;
END //

DELIMITER ;

-- ============================================================
-- TRIGGER BEFORE UPDATE
-- Impede que estoque ou preço fiquem negativos
-- ============================================================

DELIMITER //

CREATE TRIGGER trg_produtos_before_update
BEFORE UPDATE ON produtos
FOR EACH ROW
BEGIN
    IF NEW.quantidade_estoque < 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'A quantidade em estoque não pode ser negativa.';
    END IF;

    IF NEW.preco_unitario < 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'O preço unitário não pode ser negativo.';
    END IF;
END //

DELIMITER ;

-- ============================================================
-- VIEW CONSOLIDADORA
-- Junta produtos + categorias + status de estoque (via FUNCTION)
-- ============================================================

CREATE VIEW vw_estoque_produtos AS
SELECT
    p.id_produto,
    p.nome_produto,
    p.descricao,
    COALESCE(c.nome_categoria, 'Sem categoria') AS nome_categoria,
    p.preco_unitario,
    p.quantidade_estoque,
    p.estoque_minimo,
    fn_statusEstoque(p.quantidade_estoque, p.estoque_minimo) AS status_estoque,
    p.ativo
FROM produtos p
LEFT JOIN categorias c ON c.id_categoria = p.id_categoria;

-- ============================================================
-- VIEW ANALÍTICA
-- Detalha cada pedido já com o valor total calculado
-- ============================================================

CREATE VIEW vw_pedidos_detalhados AS
SELECT
    ped.id_pedido,
    ped.data_pedido,
    ped.status,
    p.id_produto,
    p.nome_produto,
    COALESCE(c.nome_categoria, 'Sem categoria') AS nome_categoria,
    ped.quantidade,
    ped.valor_unitario,
    (ped.quantidade * ped.valor_unitario) AS valor_total
FROM pedidos ped
INNER JOIN produtos p ON p.id_produto = ped.id_produto
LEFT JOIN categorias c ON c.id_categoria = p.id_categoria;

-- ============================================================
-- VIEW ANALÍTICA COM CTE
-- Faturamento consolidado por categoria (ignora pedidos cancelados)
-- ============================================================

CREATE VIEW vw_faturamento_categoria AS
WITH pedidos_validos AS (
    SELECT
        p.id_categoria,
        ped.id_pedido,
        (ped.quantidade * ped.valor_unitario) AS valor_total
    FROM pedidos ped
    INNER JOIN produtos p ON p.id_produto = ped.id_produto
    WHERE ped.status <> 'Cancelado'
)
SELECT
    c.id_categoria,
    c.nome_categoria,
    COALESCE(SUM(pv.valor_total), 0) AS faturamento_total,
    COALESCE(COUNT(pv.id_pedido), 0) AS total_pedidos
FROM categorias c
LEFT JOIN pedidos_validos pv ON pv.id_categoria = c.id_categoria
GROUP BY c.id_categoria, c.nome_categoria;

-- ============================================================
-- STORED PROCEDURE
-- Busca de produtos com filtro por termo/categoria + paginação
-- Chamada via: CALL sp_buscarProdutos('termo', categoria, limite, offset)
-- ============================================================

DELIMITER //

CREATE PROCEDURE sp_buscarProdutos(
    IN p_termo VARCHAR(100),
    IN p_categoria INT,
    IN p_limite INT,
    IN p_offset INT
)
BEGIN
    SELECT
        p.id_produto,
        p.nome_produto,
        p.descricao,
        COALESCE(c.nome_categoria, 'Sem categoria') AS nome_categoria,
        p.id_categoria,
        p.preco_unitario,
        p.quantidade_estoque,
        p.estoque_minimo,
        fn_statusEstoque(p.quantidade_estoque, p.estoque_minimo) AS status_estoque,
        p.ativo
    FROM produtos p
    LEFT JOIN categorias c ON c.id_categoria = p.id_categoria
    WHERE (p_termo IS NULL OR p_termo = '' OR p.nome_produto LIKE CONCAT('%', p_termo, '%'))
      AND (p_categoria IS NULL OR p_categoria = 0 OR p.id_categoria = p_categoria)
    ORDER BY p.nome_produto ASC
    LIMIT p_limite OFFSET p_offset;
END //

DELIMITER ;

-- ============================================================
-- DADOS REAIS DO CATÁLOGO (baseados no site institucional -
-- Projeto 2 / autonobre_bd) ADAPTADOS PARA O PAINEL:
-- preço, estoque e estoque mínimo são dados fictícios,
-- criados para fins didáticos, já que o catálogo institucional
-- não guarda preço nem estoque.
-- ============================================================

INSERT INTO categorias (nome_categoria, descricao) VALUES
('Copos', 'Copos descartáveis PP e PS'),
('Talheres', 'Talheres descartáveis refeição e master'),
('Marmitas', 'Marmitas descartáveis redondas e retangulares'),
('Filmes PVC', 'Filmes de PVC institucionais e domésticos');

INSERT INTO produtos (nome_produto, descricao, id_categoria, preco_unitario, quantidade_estoque, estoque_minimo, ativo) VALUES
('Copo PS 50ml Estriado', 'Branco/Transparente 50x100 Cx5000', 1, 89.90, 320, 100, 1),
('Copo PP 150ml Estriado', 'Branco/Transparente 25x100 Cx2500', 1, 74.50, 45, 60, 1),
('Copo PP 180ml Estriado', 'Branco/Transparente 25x100 Cx2500', 1, 79.90, 210, 60, 1),
('Copo PP 330ml Chopp Liso', 'Transparente 20x50 Cx1000', 1, 62.00, 150, 40, 1),
('Copo PP 550ml Liso', 'Transparente 20x50 Cx1000', 1, 78.00, 95, 40, 1),
('Copo PP 770ml Liso', 'Transparente 20x25 Cx500', 1, 52.00, 0, 30, 1),
('Garfo Master', 'Branco/Cristal 20x50 Cx1000', 2, 38.00, 180, 50, 1),
('Faca Master', 'Branca/Cristal 20x50 Cx1000', 2, 38.00, 175, 50, 1),
('Colher Master', 'Branca/Cristal 20x50 Cx1000', 2, 38.00, 20, 50, 1),
('Garfo Refeição', 'Branco/Cristal 20x50 Cx1000', 2, 45.00, 130, 40, 1),
('Faca Refeição', 'Branca/Cristal 20x50 Cx1000', 2, 45.00, 128, 40, 1),
('Colher Refeição', 'Branca/Cristal 20x50 Cx1000', 2, 45.00, 132, 40, 1),
('Marmita Redonda P - 500ml', 'M32 Branca base e tampa Fd600', 3, 108.00, 60, 25, 1),
('Marmita Redonda M - 700ml', 'M50 Branca base e tampa Fd600', 3, 126.00, 55, 25, 1),
('Marmita Redonda G - 900ml', 'M65 Branca base e tampa Fd600', 3, 144.00, 15, 25, 1),
('Marmita Retangular 500ml', 'MR500 Branca base e tampa Fd400', 3, 96.00, 70, 20, 1),
('Marmita 900ml - 3 Divisórias', 'M900/3 Branca base e tampa Fd300', 3, 102.00, 40, 20, 1),
('Marmita 1200ml - 4 Divisórias', 'M1200/4 Branca base e tampa Fd300', 3, 114.00, 38, 20, 1),
('Filme de PVC 30x9x800', 'Institucional 30x9x800', 4, 45.00, 90, 20, 1),
('Filme de PVC 38x9x800', 'Institucional 38x9x800', 4, 56.00, 85, 20, 1),
('Filme de PVC 38x9x1000', 'Institucional 38x9x1000', 4, 68.00, 75, 20, 0),
('Filme de PVC Doméstico 28x15', '28cm x 15m Cx25', 4, 62.00, 110, 25, 1),
('Filme de PVC Doméstico 28x30', '28cm x 30m Cx25', 4, 98.00, 65, 25, 1),
('Filme de PVC Doméstico 28x100', '28cm x 100m Cx25', 4, 210.00, 8, 15, 1);

INSERT INTO pedidos (id_produto, quantidade, valor_unitario, data_pedido, status) VALUES
(1, 50, 89.90, '2026-05-03', 'Confirmado'),
(3, 30, 79.90, '2026-05-10', 'Confirmado'),
(5, 20, 78.00, '2026-05-15', 'Confirmado'),
(7, 40, 38.00, '2026-05-20', 'Confirmado'),
(9, 60, 38.00, '2026-05-22', 'Confirmado'),
(13, 15, 108.00, '2026-06-01', 'Pendente'),
(14, 10, 126.00, '2026-06-03', 'Confirmado'),
(19, 25, 45.00, '2026-06-05', 'Confirmado'),
(22, 18, 62.00, '2026-06-08', 'Confirmado'),
(1, 20, 89.90, '2026-06-10', 'Cancelado'),
(9, 30, 38.00, '2026-06-15', 'Confirmado'),
(15, 8, 144.00, '2026-06-18', 'Pendente'),
(3, 22, 79.90, '2026-07-02', 'Confirmado'),
(24, 5, 210.00, '2026-07-05', 'Confirmado');
