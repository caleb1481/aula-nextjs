import * as Crypto from 'expo-crypto';

const CHAVE_DADOS = 'controle_financeiro_dados_v1';

let dadosEmMemoria = null;

const criarDadosVazios = () => ({
  usuarios: [],
  salarios: {},
  gastos: [],
  ultimoGastoCriadoEm: 0,
  personalizacoes: {},
});

function normalizarDados(dados) {
  if (!dados || typeof dados !== 'object') return criarDadosVazios();

  return {
    usuarios: Array.isArray(dados.usuarios) ? dados.usuarios : [],
    salarios: dados.salarios && typeof dados.salarios === 'object' ? dados.salarios : {},
    gastos: Array.isArray(dados.gastos) ? dados.gastos : [],
    ultimoGastoCriadoEm: Number(dados.ultimoGastoCriadoEm) || 0,
    personalizacoes:
      dados.personalizacoes && typeof dados.personalizacoes === 'object'
        ? dados.personalizacoes
        : {},
  };
}

function lerDados() {
  if (dadosEmMemoria) return dadosEmMemoria;

  try {
    const dadosSalvos = globalThis?.localStorage?.getItem(CHAVE_DADOS);
    dadosEmMemoria = normalizarDados(dadosSalvos ? JSON.parse(dadosSalvos) : null);
  } catch (erro) {
    // Alguns navegadores bloqueiam o localStorage em janelas privadas. Nesse
    // caso o app segue funcionando durante a sessão, sem persistência futura.
    console.warn('Não foi possível acessar o armazenamento local:', erro);
    dadosEmMemoria = criarDadosVazios();
  }

  return dadosEmMemoria;
}

function salvarDados(dados) {
  dadosEmMemoria = dados;
  try {
    globalThis?.localStorage?.setItem(CHAVE_DADOS, JSON.stringify(dados));
  } catch (erro) {
    console.warn('Não foi possível salvar no armazenamento local:', erro);
  }
}

function chavePersonalizacao(usuarioId, tarefa) {
  return `${usuarioId}:${tarefa}`;
}

async function gerarHashSenha(senha) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, senha);
}

export async function criarUsuario(nomeUsuario, senha) {
  const dados = lerDados();
  const nomeNormalizado = nomeUsuario.trim().toLowerCase();

  if (dados.usuarios.some((usuario) => usuario.nomeUsuario === nomeNormalizado)) {
    throw new Error('USUARIO_JA_EXISTE');
  }

  const senhaHash = await gerarHashSenha(senha);
  const id = Math.max(0, ...dados.usuarios.map((usuario) => Number(usuario.id) || 0)) + 1;
  dados.usuarios.push({ id, nomeUsuario: nomeNormalizado, senhaHash, criadoEm: Date.now() });
  salvarDados(dados);

  return { id, nomeUsuario: nomeNormalizado };
}

export async function autenticarUsuario(nomeUsuario, senha) {
  const nomeNormalizado = nomeUsuario.trim().toLowerCase();
  const senhaHash = await gerarHashSenha(senha);
  const usuario = lerDados().usuarios.find(
    (item) => item.nomeUsuario === nomeNormalizado && item.senhaHash === senhaHash
  );

  if (!usuario) throw new Error('CREDENCIAIS_INVALIDAS');
  return { id: usuario.id, nomeUsuario: usuario.nomeUsuario };
}

export async function buscarUsuarioPorId(usuarioId) {
  const usuario = lerDados().usuarios.find((item) => Number(item.id) === Number(usuarioId));
  return usuario ? { id: usuario.id, nomeUsuario: usuario.nomeUsuario } : null;
}

export async function buscarSalario(usuarioId) {
  return lerDados().salarios[String(usuarioId)] ?? null;
}

export async function salvarSalario(usuarioId, valor) {
  const dados = lerDados();
  dados.salarios[String(usuarioId)] = valor;
  salvarDados(dados);
}

export async function apagarSalario(usuarioId) {
  const dados = lerDados();
  delete dados.salarios[String(usuarioId)];
  salvarDados(dados);
}

export async function buscarGastos(usuarioId) {
  return lerDados()
    .gastos.filter((gasto) => Number(gasto.usuarioId) === Number(usuarioId))
    .sort((a, b) => b.criadoEm - a.criadoEm)
    .map(({ id, tarefa, valor }) => ({ id, tarefa, valor }));
}

export async function inserirGasto(usuarioId, gasto) {
  const dados = lerDados();
  const criadoEm = Math.max(Date.now(), dados.ultimoGastoCriadoEm + 1);
  dados.ultimoGastoCriadoEm = criadoEm;
  dados.gastos.push({ ...gasto, usuarioId, criadoEm });
  salvarDados(dados);
}

export async function removerGastoDb(usuarioId, id) {
  const dados = lerDados();
  dados.gastos = dados.gastos.filter(
    (gasto) => !(gasto.id === id && Number(gasto.usuarioId) === Number(usuarioId))
  );
  salvarDados(dados);
}

export async function limparGastosDb(usuarioId) {
  const dados = lerDados();
  dados.gastos = dados.gastos.filter((gasto) => Number(gasto.usuarioId) !== Number(usuarioId));
  salvarDados(dados);
}

export async function buscarPersonalizacoes(usuarioId) {
  const personalizacoes = {};
  const prefixo = `${usuarioId}:`;

  Object.entries(lerDados().personalizacoes).forEach(([chave, valor]) => {
    if (chave.startsWith(prefixo)) personalizacoes[chave.slice(prefixo.length)] = valor;
  });

  return personalizacoes;
}

export async function salvarPersonalizacaoCategoria(usuarioId, tarefa, cor, emoji) {
  const dados = lerDados();
  dados.personalizacoes[chavePersonalizacao(usuarioId, tarefa)] = {
    cor,
    emoji: emoji || '',
  };
  salvarDados(dados);
}

export async function removerPersonalizacaoCategoria(usuarioId, tarefa) {
  const dados = lerDados();
  delete dados.personalizacoes[chavePersonalizacao(usuarioId, tarefa)];
  salvarDados(dados);
}

export async function limparPersonalizacoesDb(usuarioId) {
  const dados = lerDados();
  const prefixo = `${usuarioId}:`;

  Object.keys(dados.personalizacoes).forEach((chave) => {
    if (chave.startsWith(prefixo)) delete dados.personalizacoes[chave];
  });
  salvarDados(dados);
}