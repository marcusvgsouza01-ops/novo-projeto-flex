const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { Pool } = require("pg");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(bodyParser.json());

// Conexão com o banco de dados PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Funções para criar tabelas se não existirem
async function createTables() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        titulo TEXT NOT NULL,
        quando TEXT,
        antecedencia INTEGER,
        prioridade TEXT,
        descricao TEXT,
        notificar INTEGER,
        concluida INTEGER,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS ordens_servico (
        id SERIAL PRIMARY KEY,
        cliente TEXT NOT NULL,
        descricao TEXT,
        status TEXT,
        data_inicio DATE,
        data_conclusao DATE
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS almoxarifado (
        id SERIAL PRIMARY KEY,
        item TEXT NOT NULL,
        quantidade INTEGER,
        responsavel TEXT,
        data_registro TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("Tabelas verificadas/criadas com sucesso.");
  } catch (err) {
    console.error("Erro ao criar as tabelas:", err);
  } finally {
    client.release();
  }
}
createTables();

// Rotas da API - AGENDA
app.get("/api/tasks", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM tasks ORDER BY quando ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/tasks", async (req, res) => {
  const { titulo, quando, antecedencia, prioridade, descricao, notificar, concluida } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO tasks (titulo, quando, antecedencia, prioridade, descricao, notificar, concluida)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [titulo, quando, antecedencia, prioridade, descricao, notificar, concluida || 0]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/tasks/:id", async (req, res) => {
  const { id } = req.params;
  const { titulo, quando, antecedencia, prioridade, descricao, notificar, concluida } = req.body;
  try {
    const result = await pool.query(
      `UPDATE tasks SET
        titulo = $1,
        quando = $2,
        antecedencia = $3,
        prioridade = $4,
        descricao = $5,
        notificar = $6,
        concluida = $7,
        updated_at = NOW()
      WHERE id = $8 RETURNING *`,
      [titulo, quando, antecedencia, prioridade, descricao, notificar, concluida, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/tasks/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM tasks WHERE id = $1", [id]);
    res.json({ message: "Tarefa excluída" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rotas da API - ORDEM DE SERVIÇO
app.get('/api/ordens-servico', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ordens_servico ORDER BY data_inicio ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ordens-servico', async (req, res) => {
  const { cliente, descricao, status, data_inicio, data_conclusao } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO ordens_servico (cliente, descricao, status, data_inicio, data_conclusao)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [cliente, descricao, status, data_inicio, data_conclusao]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/ordens-servico/:id', async (req, res) => {
  const { id } = req.params;
  const { cliente, descricao, status, data_inicio, data_conclusao } = req.body;
  try {
    const result = await pool.query(
      `UPDATE ordens_servico SET
       cliente = $1, descricao = $2, status = $3, data_inicio = $4, data_conclusao = $5
       WHERE id = $6 RETURNING *`,
      [cliente, descricao, status, data_inicio, data_conclusao, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/ordens-servico/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM ordens_servico WHERE id = $1', [id]);
    res.json({ message: 'Ordem de serviço excluída' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rotas da API - ALMOXARIFADO
app.get('/api/almoxarifado', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM almoxarifado ORDER BY item ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/almoxarifado', async (req, res) => {
  const { item, quantidade, responsavel } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO almoxarifado (item, quantidade, responsavel)
       VALUES ($1, $2, $3) RETURNING *`,
      [item, quantidade, responsavel]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/almoxarifado/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM almoxarifado WHERE id = $1', [id]);
    res.json({ message: 'Item de almoxarifado excluído' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Servir frontend
app.use(express.static(path.join(__dirname, "public")));

// Qualquer rota que não seja /api → entrega o index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});