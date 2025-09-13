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
app.use(express.static(path.join(__dirname, 'public')));

// Conexão com o banco de dados PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Função para criar as tabelas se não existirem
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
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS os (
        id SERIAL PRIMARY KEY,
        numero_os TEXT,
        cliente TEXT,
        tecnico TEXT,
        status TEXT DEFAULT 'aberta',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS almoxarifado (
        id SERIAL PRIMARY KEY,
        item TEXT,
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

// Inicia o servidor apenas depois que as tabelas forem criadas
async function startServer() {
  try {
    await createTables();
    app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
    });
  } catch (err) {
    console.error("Erro ao iniciar o servidor:", err);
    process.exit(1);
  }
}

// Chame a função para iniciar o servidor
startServer();

// Rotas da API
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

// Rotas da API para O.S.
app.get("/api/os", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM os ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/os", async (req, res) => {
  const { numero_os, cliente, tecnico, status } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO os (numero_os, cliente, tecnico, status)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [numero_os, cliente, tecnico, status || 'aberta']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/os/:id", async (req, res) => {
  const { id } = req.params;
  const { numero_os, cliente, tecnico, status } = req.body;
  try {
    const result = await pool.query(
      `UPDATE os SET
        numero_os = $1,
        cliente = $2,
        tecnico = $3,
        status = $4
      WHERE id = $5 RETURNING *`,
      [numero_os, cliente, tecnico, status, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/os/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM os WHERE id = $1", [id]);
    res.json({ message: "O.S. excluída" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rotas da API para Almoxarifado
app.get("/api/almoxarifado", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM almoxarifado ORDER BY data_registro DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/almoxarifado", async (req, res) => {
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

app.delete("/api/almoxarifado/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM almoxarifado WHERE id = $1", [id]);
    res.json({ message: "Item do almoxarifado excluído" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});