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

// A função para criar a tabela foi alterada para PostgreSQL
async function createTable() {
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
    console.log("Tabela 'tasks' verificada/criada com sucesso.");
  } catch (err) {
    console.error("Erro ao criar a tabela:", err);
  } finally {
    client.release();
  }
}

// Chame a função para criar a tabela ao iniciar o servidor
createTable();

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

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});