// ============================================================
// TIPOS - AUTO NOBRE REPRESENTAÇÕES - PAINEL DE CONTROLE
// ============================================================
// OBS: colunas DECIMAL do MariaDB chegam do PDO como string.
// Por isso preco_unitario / valor_unitario / valor_total / faturamento_total
// são tipados como string e convertidos com Number() no momento do uso.

export interface Categoria {
    id_categoria: number;
    nome_categoria: string;
    descricao: string | null;
}

export interface Produto {
    id_produto: number;
    nome_produto: string;
    descricao: string | null;
    nome_categoria: string;
    id_categoria: number | null;
    preco_unitario: string;
    quantidade_estoque: number;
    estoque_minimo: number;
    status_estoque: "Normal" | "Crítico" | "Esgotado";
    ativo: number;
}

export interface Pedido {
    id_pedido: number;
    data_pedido: string;
    status: "Pendente" | "Confirmado" | "Cancelado";
    id_produto: number;
    nome_produto: string;
    nome_categoria: string;
    quantidade: number;
    valor_unitario: string;
    valor_total: string;
}

export interface FaturamentoCategoria {
    id_categoria: number;
    nome_categoria: string;
    faturamento_total: string;
    total_pedidos: number;
}

export interface DadosDashboard {
    produtos: Produto[];
    pedidos: Pedido[];
    faturamentoCategoria: FaturamentoCategoria[];
}

export interface RespostaApi<T> {
    sucesso: boolean;
    dados?: T;
    mensagem?: string;
    erro?: string;
    id?: number;
}

export interface RankingProduto {
    nomeProduto: string;
    totalVendido: number;
    faturamento: number;
}
