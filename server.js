const express = require('express');
const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = path.join(__dirname, 'gestor.db');
const isNewDB = !fs.existsSync(DB_PATH);
const db = new DatabaseSync(DB_PATH);

if (isNewDB) {
  console.log('Criando banco de dados a partir do schema.sql...');
  db.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
  seedFromJSON();
  console.log('Banco criado e populado com dados de exemplo.');
}

function seedFromJSON() {
  const dataDir = path.join(__dirname, 'data');
  const clientes = JSON.parse(fs.readFileSync(path.join(dataDir, 'clientes.json')));
  const servicos = JSON.parse(fs.readFileSync(path.join(dataDir, 'servicos.json')));
  const pedidos = JSON.parse(fs.readFileSync(path.join(dataDir, 'pedidos.json')));
  const agenda = JSON.parse(fs.readFileSync(path.join(dataDir, 'agenda.json')));
  const financeiro = JSON.parse(fs.readFileSync(path.join(dataDir, 'financeiro.json')));

  const insCliente = db.prepare(`INSERT INTO clientes (id,nome,tipo,documento,email,telefone,cep,logradouro,numero,complemento,bairro,cidade,estado) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  for (const c of clientes) insCliente.run(c.id, c.nome, c.tipo, c.documento||'', c.email||'', c.telefone||'', c.cep||'', c.logradouro||'', c.numero||'', c.complemento||'', c.bairro||'', c.cidade||'', c.estado||'');

  const insServico = db.prepare(`INSERT INTO servicos (id,nome,detalhes,preco,unidade) VALUES (?,?,?,?,?)`);
  for (const s of servicos) insServico.run(s.id, s.nome, s.detalhes||'', s.preco, s.unidade||'un');

  const insPedido = db.prepare(`INSERT INTO pedidos (id,cliente_id,data,status,total) VALUES (?,?,?,?,?)`);
  const insItem = db.prepare(`INSERT INTO pedido_itens (id,pedido_id,servico_id,nome_item,preco_unitario,quantidade) VALUES (?,?,?,?,?,?)`);
  for (const p of pedidos) {
    insPedido.run(p.id, p.cliente_id, p.data, p.status, p.total);
    for (const it of (p.itens || [])) insItem.run(it.id, p.id, it.servico_id||null, it.nome_item, it.preco_unitario, it.quantidade);
  }

  const insAgenda = db.prepare(`INSERT INTO agenda (id,titulo,data,hora,cliente_id,observacoes) VALUES (?,?,?,?,?,?)`);
  for (const a of agenda) insAgenda.run(a.id, a.titulo, a.data, a.hora||'', a.cliente_id||null, a.observacoes||'');

  const insFin = db.prepare(`INSERT INTO financeiro (id,tipo,descricao,valor,data,categoria,pedido_id) VALUES (?,?,?,?,?,?,?)`);
  for (const f of financeiro) insFin.run(f.id, f.tipo, f.descricao, f.valor, f.data, f.categoria||'', f.pedido_id||null);
}

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

/* ---------- helpers para tabelas simples ---------- */
function simpleCrud(table, cols) {
  const placeholders = cols.map(() => '?').join(',');

  app.get(`/api/${table}`, (req, res) => {
    const rows = db.prepare(`SELECT * FROM ${table} ORDER BY criado_em`).all();
    res.json(rows);
  });

  app.post(`/api/${table}`, (req, res) => {
    const id = uid();
    const values = cols.map(c => req.body[c] ?? null);
    db.prepare(`INSERT INTO ${table} (id,${cols.join(',')}) VALUES (?,${placeholders})`).run(id, ...values);
    const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
    res.json(row);
  });

  app.put(`/api/${table}/:id`, (req, res) => {
    const values = cols.map(c => req.body[c] ?? null);
    const setClause = cols.map(c => `${c} = ?`).join(',');
    db.prepare(`UPDATE ${table} SET ${setClause} WHERE id = ?`).run(...values, req.params.id);
    const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(req.params.id);
    res.json(row);
  });

  app.delete(`/api/${table}/:id`, (req, res) => {
    db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(req.params.id);
    res.json({ ok: true });
  });
}

simpleCrud('clientes', ['nome', 'tipo', 'documento', 'email', 'telefone', 'cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'estado']);
simpleCrud('servicos', ['nome', 'detalhes', 'preco', 'unidade']);
simpleCrud('agenda', ['titulo', 'data', 'hora', 'cliente_id', 'observacoes']);
simpleCrud('financeiro', ['tipo', 'descricao', 'valor', 'data', 'categoria', 'pedido_id']);

/* ---------- pedidos (com itens) ---------- */
function loadPedidoItens(pedidoId) {
  return db.prepare(`SELECT * FROM pedido_itens WHERE pedido_id = ?`).all(pedidoId);
}

app.get('/api/pedidos', (req, res) => {
  const pedidos = db.prepare(`SELECT * FROM pedidos ORDER BY criado_em`).all();
  const withItens = pedidos.map(p => ({ ...p, itens: loadPedidoItens(p.id) }));
  res.json(withItens);
});

app.post('/api/pedidos', (req, res) => {
  const id = uid();
  const { cliente_id, data, status, itens } = req.body;
  db.prepare(`INSERT INTO pedidos (id,cliente_id,data,status,total) VALUES (?,?,?,?,0)`).run(id, cliente_id, data, status);
  const insItem = db.prepare(`INSERT INTO pedido_itens (id,pedido_id,servico_id,nome_item,preco_unitario,quantidade) VALUES (?,?,?,?,?,?)`);
  for (const it of (itens || [])) insItem.run(uid(), id, it.servico_id || null, it.nome_item, it.preco_unitario, it.quantidade);
  const pedido = db.prepare(`SELECT * FROM pedidos WHERE id = ?`).get(id);
  res.json({ ...pedido, itens: loadPedidoItens(id) });
});

app.put('/api/pedidos/:id', (req, res) => {
  const id = req.params.id;
  const { cliente_id, data, status, itens } = req.body;
  db.prepare(`UPDATE pedidos SET cliente_id=?, data=?, status=? WHERE id=?`).run(cliente_id, data, status, id);
  db.prepare(`DELETE FROM pedido_itens WHERE pedido_id = ?`).run(id);
  const insItem = db.prepare(`INSERT INTO pedido_itens (id,pedido_id,servico_id,nome_item,preco_unitario,quantidade) VALUES (?,?,?,?,?,?)`);
  for (const it of (itens || [])) insItem.run(uid(), id, it.servico_id || null, it.nome_item, it.preco_unitario, it.quantidade);
  const pedido = db.prepare(`SELECT * FROM pedidos WHERE id = ?`).get(id);
  res.json({ ...pedido, itens: loadPedidoItens(id) });
});

app.delete('/api/pedidos/:id', (req, res) => {
  db.prepare(`DELETE FROM pedidos WHERE id = ?`).run(req.params.id);
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Gestor+ rodando em http://localhost:${PORT}`);
});
