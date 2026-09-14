<?php

// ============================================================
// CONFIGURAÇÃO DE CONEXÃO COM O BANCO DE DADOS (PDO)
// Auto Nobre Representações - Painel de Controle
// ============================================================

// DADOS DE ACESSO AO BANCO
$host = "localhost";
$nomeBanco = "auto_nobre";
$usuario = "root";
$senha = "";

// FUNÇÃO QUE RETORNA UMA CONEXÃO PDO ATIVA
function obterConexao(): PDO
{
    global $host, $nomeBanco, $usuario, $senha;

    $dsn = "mysql:host={$host};dbname={$nomeBanco};charset=utf8mb4";

    $opcoes = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];

    try {
        return new PDO($dsn, $usuario, $senha, $opcoes);
    } catch (PDOException $erro) {
        http_response_code(500);
        header("Content-Type: application/json; charset=utf-8");
        echo json_encode([
            "sucesso" => false,
            "mensagem" => "Falha na conexão com o banco de dados.",
            "erro" => $erro->getMessage()
        ]);
        exit;
    }
}
