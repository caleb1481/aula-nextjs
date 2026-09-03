import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';

// Nome do arquivo do banco de dados SQLite salvo no próprio dispositivo.
const NOME_BANCO = 'controle_financeiro.db';

let bancoPromise = null;

// Abre (ou cria, se não existir) o banco e garante que as tabelas existam.
// Reaproveita a mesma conexão em todas as chamadas (padrão singleton).
function abrirBanco() {
  if (!bancoPromise) {
    bancoPromise = SQLite.openDatabaseAsync(NOME_BANCO).then(async (db) => {
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS usuarios (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nome_usuario TEXT NOT NULL UNIQUE,
          senha_hash TEXT NOT NULL,
          criado_em INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS configuracoes (
          usuario_id INTEGER PRIMARY KEY NOT NULL,
          salario REAL NOT NULL,
          FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS gastos (
          id TEXT PRIMARY KEY NOT NULL,
          usuario_id INTEGER NOT NULL,
          tarefa TEXT NOT NULL,
          valor REAL NOT NULL,
          criado_em INTEGER NOT NULL,
          FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS personalizacoes_categoria (
          usuario_id INTEGER NOT NULL,
          tarefa TEXT NOT NULL,
          cor TEXT,
          emoji TEXT,
          PRIMARY KEY (usuario_id, tarefa),
          FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
        );
      `);
      return db;
    });
  }
  return bancoPromise;
}

// Gera um hash SHA-256 da senha. É uma proteção simples (a senha nunca fica
// em texto puro no banco), mas não substitui um backend de verdade — como
// tudo roda 100% no aparelho, não há nenhum servidor validando as contas.
async function gerarHashSenha(senha) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, senha);
}

// ---- Contas de usuário ----

export async function criarUsuario(nomeUsuario, senha) {
  const db = await abrirBanco();
  const nomeNormalizado = nomeUsuario.trim().toLowerCase();
  const senhaHash = await gerarHashSenha(senha);

  const jaExiste = await db.getFirstAsync(
    'SELECT id FROM usuarios WHERE nome_usuario = ?',
    [nomeNormalizado]
  );
  if (jaExiste) {
    throw new Error('USUARIO_JA_EXISTE');
  }

  const resultado = await db.runAsync(
    'INSERT INTO usuarios (nome_usuario, senha_hash, criado_em) VALUES (?, ?, ?)',
    [nomeNormalizado, senhaHash, Date.now()]
  );

  return { id: resultado.lastInsertRowId, nomeUsuario: nomeNormalizado };
}

export async function autenticarUsuario(nomeUsuario, senha) {
  const db = await abrirBanco();
  const nomeNormalizado = nomeUsuario.trim().toLowerCase();
  const senhaHash = await gerarHashSenha(senha);

  const usuario = await db.getFirstAsync(
    'SELECT id, nome_usuario FROM usuarios WHERE nome_usuario = ? AND senha_hash = ?',
    [nomeNormalizado, senhaHash]
  );

  if (!usuario) {
    throw new Error('CREDENCIAIS_INVALIDAS');
  }

  return { id: usuario.id, nomeUsuario: usuario.nome_usuario };
}

export async function buscarUsuarioPorId(usuarioId) {
  const db = await abrirBanco();
  const usuario = await db.getFirstAsync(
    'SELECT id, nome_usuario FROM usuarios WHERE id = ?',
    [usuarioId]
  );
  return usuario ? { id: usuario.id, nomeUsuario: usuario.nome_usuario } : null;
}

// ---- Salário (uma linha por usuário) ----

export async function buscarSalario(usuarioId) {
  const db = await abrirBanco();
  const linha = await db.getFirstAsync(
    'SELECT salario FROM configuracoes WHERE usuario_id = ?',
    [usuarioId]
  );
  return linha ? linha.salario : null;
}

export async function salvarSalario(usuarioId, valor) {
  const db = await abrirBanco();
  await db.runAsync(
    `INSERT INTO configuracoes (usuario_id, salario) VALUES (?, ?)
     ON CONFLICT(usuario_id) DO UPDATE SET salario = excluded.salario`,
    [usuarioId, valor]
  );
}

export async function apagarSalario(usuarioId) {
  const db = await abrirBanco();
  await db.runAsync('DELETE FROM configuracoes WHERE usuario_id = ?', [usuarioId]);
}

// ---- Gastos (sempre filtrados pelo usuário dono) ----

export async function buscarGastos(usuarioId) {
  const db = await abrirBanco();
  const linhas = await db.getAllAsync(
    'SELECT id, tarefa, valor FROM gastos WHERE usuario_id = ? ORDER BY criado_em DESC, rowid DESC',
    [usuarioId]
  );
  return linhas;
}

export async function inserirGasto(usuarioId, gasto) {
  const db = await abrirBanco();
  await db.runAsync(
    'INSERT INTO gastos (id, usuario_id, tarefa, valor, criado_em) VALUES (?, ?, ?, ?, ?)',
    [gasto.id, usuarioId, gasto.tarefa, gasto.valor, Date.now()]
  );
}

export async function removerGastoDb(usuarioId, id) {
  const db = await abrirBanco();
  await db.runAsync('DELETE FROM gastos WHERE id = ? AND usuario_id = ?', [
    id,
    usuarioId,
  ]);
}

export async function limparGastosDb(usuarioId) {
  const db = await abrirBanco();
  await db.runAsync('DELETE FROM gastos WHERE usuario_id = ?', [usuarioId]);
}

// ---- Personalização de categorias (cor e emoji escolhidos pelo usuário) ----

export async function buscarPersonalizacoes(usuarioId) {
  const db = await abrirBanco();
  const linhas = await db.getAllAsync(
    'SELECT tarefa, cor, emoji FROM personalizacoes_categoria WHERE usuario_id = ?',
    [usuarioId]
  );
  const mapa = {};
  linhas.forEach((linha) => {
    mapa[linha.tarefa] = { cor: linha.cor, emoji: linha.emoji };
  });
  return mapa;
}

export async function salvarPersonalizacaoCategoria(usuarioId, tarefa, cor, emoji) {
  const db = await abrirBanco();
  await db.runAsync(
    `INSERT INTO personalizacoes_categoria (usuario_id, tarefa, cor, emoji) VALUES (?, ?, ?, ?)
     ON CONFLICT(usuario_id, tarefa) DO UPDATE SET cor = excluded.cor, emoji = excluded.emoji`,
    [usuarioId, tarefa, cor, emoji || '']
  );
}

export async function removerPersonalizacaoCategoria(usuarioId, tarefa) {
  const db = await abrirBanco();
  await db.runAsync(
    'DELETE FROM personalizacoes_categoria WHERE usuario_id = ? AND tarefa = ?',
    [usuarioId, tarefa]
  );
}

export async function limparPersonalizacoesDb(usuarioId) {
  const db = await abrirBanco();
  await db.runAsync('DELETE FROM personalizacoes_categoria WHERE usuario_id = ?', [
    usuarioId,
  ]);
}