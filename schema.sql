-- ============================================================
-- Gestor+ — Banco de dados relacional (SQLite)
-- ============================================================
PRAGMA foreign_keys = ON;

-- ---------- CLIENTES ----------
CREATE TABLE clientes (
  id            TEXT PRIMARY KEY,
  nome          TEXT NOT NULL,
  tipo          TEXT NOT NULL CHECK (tipo IN ('Pessoa física','Pessoa jurídica')),
  documento     TEXT,                 -- CPF ou CNPJ
  email         TEXT,
  telefone      TEXT,
  cep           TEXT,
  logradouro    TEXT,
  numero        TEXT,
  complemento   TEXT,
  bairro        TEXT,
  cidade        TEXT,
  estado        TEXT,
  criado_em     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- CATÁLOGO DE PEÇAS E SERVIÇOS ----------
CREATE TABLE servicos (
  id            TEXT PRIMARY KEY,
  nome          TEXT NOT NULL,
  detalhes      TEXT,
  preco         REAL NOT NULL DEFAULT 0,
  unidade       TEXT NOT NULL DEFAULT 'un',
  criado_em     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- PEDIDOS ----------
CREATE TABLE pedidos (
  id            TEXT PRIMARY KEY,
  cliente_id    TEXT NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  data          TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'Pendente' CHECK (status IN (
                  'Pendente','Aguardando aprovação','Aprovado','Em andamento',
                  'Aguardando pagamento','Enviado','Concluído'
                )),
  total         REAL NOT NULL DEFAULT 0,     -- soma calculada de pedido_itens
  criado_em     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- itens de cada pedido (tabela associativa N:N entre pedidos e serviços)
CREATE TABLE pedido_itens (
  id                TEXT PRIMARY KEY,
  pedido_id         TEXT NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  servico_id        TEXT REFERENCES servicos(id) ON DELETE SET NULL,
  nome_item         TEXT NOT NULL,     -- snapshot do nome no momento da venda
  preco_unitario    REAL NOT NULL,     -- snapshot do preço no momento da venda
  quantidade        INTEGER NOT NULL DEFAULT 1
);

-- ---------- AGENDA ----------
CREATE TABLE agenda (
  id            TEXT PRIMARY KEY,
  titulo        TEXT NOT NULL,
  data          TEXT NOT NULL,
  hora          TEXT,
  cliente_id    TEXT REFERENCES clientes(id) ON DELETE SET NULL,
  observacoes   TEXT,
  criado_em     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- FINANCEIRO ----------
CREATE TABLE financeiro (
  id            TEXT PRIMARY KEY,
  tipo          TEXT NOT NULL CHECK (tipo IN ('Receita','Despesa')),
  descricao     TEXT NOT NULL,
  valor         REAL NOT NULL,
  data          TEXT NOT NULL,
  categoria     TEXT,
  pedido_id     TEXT REFERENCES pedidos(id) ON DELETE SET NULL,  -- opcional: lançamento gerado por um pedido
  criado_em     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- ÍNDICES ----------
CREATE INDEX idx_pedidos_cliente     ON pedidos(cliente_id);
CREATE INDEX idx_pedidos_status      ON pedidos(status);
CREATE INDEX idx_pedido_itens_pedido ON pedido_itens(pedido_id);
CREATE INDEX idx_agenda_data         ON agenda(data);
CREATE INDEX idx_agenda_cliente      ON agenda(cliente_id);
CREATE INDEX idx_financeiro_data     ON financeiro(data);
CREATE INDEX idx_financeiro_tipo     ON financeiro(tipo);

-- ---------- TRIGGER: mantém pedidos.total sincronizado com os itens ----------
CREATE TRIGGER trg_itens_insert AFTER INSERT ON pedido_itens
BEGIN
  UPDATE pedidos SET total = (
    SELECT COALESCE(SUM(preco_unitario * quantidade),0) FROM pedido_itens WHERE pedido_id = NEW.pedido_id
  ) WHERE id = NEW.pedido_id;
END;

CREATE TRIGGER trg_itens_update AFTER UPDATE ON pedido_itens
BEGIN
  UPDATE pedidos SET total = (
    SELECT COALESCE(SUM(preco_unitario * quantidade),0) FROM pedido_itens WHERE pedido_id = NEW.pedido_id
  ) WHERE id = NEW.pedido_id;
END;

CREATE TRIGGER trg_itens_delete AFTER DELETE ON pedido_itens
BEGIN
  UPDATE pedidos SET total = (
    SELECT COALESCE(SUM(preco_unitario * quantidade),0) FROM pedido_itens WHERE pedido_id = OLD.pedido_id
  ) WHERE id = OLD.pedido_id;
END;
