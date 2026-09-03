import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StatusBar,
  ActivityIndicator,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { PieChart, BarChart } from 'react-native-gifted-charts';
import {
  criarUsuario,
  autenticarUsuario,
  buscarUsuarioPorId,
  buscarSalario,
  salvarSalario,
  apagarSalario,
  buscarGastos,
  inserirGasto,
  removerGastoDb,
  limparGastosDb,
  buscarPersonalizacoes,
  salvarPersonalizacaoCategoria,
  removerPersonalizacaoCategoria,
  limparPersonalizacoesDb,
} from './database';
import { salvarSessao, buscarSessao, limparSessao } from './sessao';

// Paleta de cores usada automaticamente para diferenciar cada categoria no
// gráfico, antes de qualquer personalização feita pelo usuário.
const PALETA_CORES = [
  '#4c8bf5',
  '#4cd97b',
  '#f5a623',
  '#ff6b6b',
  '#a78bfa',
  '#38bdf8',
  '#f472b6',
  '#facc15',
  '#2dd4bf',
  '#fb923c',
];

// Opções de cor disponíveis no painel de personalização de categoria.
const PALETA_EDICAO_CORES = [
  '#4c8bf5',
  '#4cd97b',
  '#f5a623',
  '#ff6b6b',
  '#a78bfa',
  '#38bdf8',
  '#f472b6',
  '#facc15',
  '#2dd4bf',
  '#fb923c',
  '#eab308',
  '#84cc16',
  '#22d3ee',
  '#e879f9',
  '#f87171',
  '#94a3b8',
];

// Opções de emoji disponíveis para usar como "logo" da categoria.
const EMOJIS_CATEGORIA = [
  '🛒',
  '🏠',
  '🚗',
  '💡',
  '🍔',
  '🎉',
  '💊',
  '📚',
  '✈️',
  '🎮',
  '👕',
  '💳',
  '☕',
  '🐾',
  '💰',
  '📱',
  '🎓',
  '⚽',
  '🎵',
  '🧾',
];

// Abas da tela principal do app.
const ABAS = [
  { chave: 'adicionar', icone: '➕', rotulo: 'Adicionar' },
  { chave: 'grafico', icone: '📊', rotulo: 'Gráfico' },
  { chave: 'gastos', icone: '📋', rotulo: 'Gastos' },
];

// O componente Alert do React Native não tem implementação no Web/Expo Web,
// então essas funções decidem entre o Alert nativo (celular) e window.alert /
// window.confirm (navegador/computador), garantindo que funcione nas duas.
const mostrarAlerta = (titulo, mensagem) => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(`${titulo}\n\n${mensagem}`);
  } else {
    Alert.alert(titulo, mensagem);
  }
};

const confirmarAcao = (titulo, mensagem, aoConfirmar) => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const confirmado = window.confirm(`${titulo}\n\n${mensagem}`);
    if (confirmado) {
      aoConfirmar();
    }
  } else {
    Alert.alert(titulo, mensagem, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar', style: 'destructive', onPress: aoConfirmar },
    ]);
  }
};

export default function App() {
  // Adapta tamanhos (gráfico, fontes) para aparelhos com tela bem pequena.
  const { width: larguraTela } = useWindowDimensions();
  const telaPequena = larguraTela < 360;
  const telaLarga = larguraTela >= 768;

  // ---- Sessão / conta ----
  const [carregandoSessao, setCarregandoSessao] = useState(true);
  const [usuarioLogado, setUsuarioLogado] = useState(null); // { id, nomeUsuario }

  const [modoAuth, setModoAuth] = useState('entrar'); // 'entrar' | 'cadastrar'
  const [nomeUsuarioInput, setNomeUsuarioInput] = useState('');
  const [senhaInput, setSenhaInput] = useState('');
  const [confirmarSenhaInput, setConfirmarSenhaInput] = useState('');
  const [processandoAuth, setProcessandoAuth] = useState(false);

  // ---- Dados financeiros do usuário logado ----
  const [salario, setSalario] = useState('');
  const [salarioDefinido, setSalarioDefinido] = useState(null);
  const [salarioAntesDeEditar, setSalarioAntesDeEditar] = useState(null);
  const [gastos, setGastos] = useState([]);
  const [tarefa, setTarefa] = useState('');
  const [valorGasto, setValorGasto] = useState('');
  const [carregandoDados, setCarregandoDados] = useState(false);

  // Navegação por abas e busca
  const [abaAtiva, setAbaAtiva] = useState('adicionar'); // 'adicionar' | 'grafico' | 'gastos'
  const [buscaGasto, setBuscaGasto] = useState('');

  // Estado do gráfico interativo
  const [tipoGrafico, setTipoGrafico] = useState('pizza'); // 'pizza' | 'barras'
  const [itemSelecionado, setItemSelecionado] = useState(null);

  // Personalização de categorias: { [tarefa]: { cor, emoji } }
  const [personalizacoes, setPersonalizacoes] = useState({});
  const [categoriaEditando, setCategoriaEditando] = useState(null);
  const [corEdicao, setCorEdicao] = useState(PALETA_EDICAO_CORES[0]);
  const [emojiEdicao, setEmojiEdicao] = useState('');

  // Ao abrir o app, verifica se já existe uma sessão salva
  useEffect(() => {
    restaurarSessao();
  }, []);

  const restaurarSessao = async () => {
    try {
      const usuarioId = await buscarSessao();
      if (usuarioId) {
        const usuario = await buscarUsuarioPorId(usuarioId);
        if (usuario) {
          setUsuarioLogado(usuario);
          await carregarDadosFinanceiros(usuario.id);
        } else {
          await limparSessao();
        }
      }
    } catch (erro) {
      console.log('Erro ao restaurar sessão:', erro);
    } finally {
      setCarregandoSessao(false);
    }
  };

  const carregarDadosFinanceiros = async (usuarioId) => {
    setCarregandoDados(true);
    try {
      const [salarioSalvo, gastosSalvos, personalizacoesSalvas] = await Promise.all([
        buscarSalario(usuarioId),
        buscarGastos(usuarioId),
        buscarPersonalizacoes(usuarioId),
      ]);
      setSalarioDefinido(salarioSalvo);
      setGastos(gastosSalvos);
      setPersonalizacoes(personalizacoesSalvas);
    } catch (erro) {
      console.log('Erro ao carregar dados:', erro);
      mostrarAlerta('Erro ao carregar', 'Não foi possível abrir o banco de dados.');
    } finally {
      setCarregandoDados(false);
    }
  };

  const limparCamposAuth = () => {
    setNomeUsuarioInput('');
    setSenhaInput('');
    setConfirmarSenhaInput('');
  };

  const fazerCadastro = async () => {
    const nome = nomeUsuarioInput.trim();
    if (nome.length < 3) {
      mostrarAlerta('Usuário inválido', 'O nome de usuário precisa ter pelo menos 3 caracteres.');
      return;
    }
    if (senhaInput.length < 4) {
      mostrarAlerta('Senha muito curta', 'A senha precisa ter pelo menos 4 caracteres.');
      return;
    }
    if (senhaInput !== confirmarSenhaInput) {
      mostrarAlerta('Senhas diferentes', 'A confirmação de senha não é igual à senha digitada.');
      return;
    }

    setProcessandoAuth(true);
    try {
      const usuario = await criarUsuario(nome, senhaInput);
      await salvarSessao(usuario.id);
      setUsuarioLogado(usuario);
      setAbaAtiva('adicionar');
      limparCamposAuth();
      await carregarDadosFinanceiros(usuario.id);
    } catch (erro) {
      if (erro.message === 'USUARIO_JA_EXISTE') {
        mostrarAlerta('Usuário já existe', 'Escolha outro nome de usuário ou faça login.');
      } else {
        console.log('Erro ao criar conta:', erro);
        mostrarAlerta(
          'Erro ao criar conta',
          `Detalhe técnico: ${erro.message || erro}\n\nSe estiver testando pelo navegador (web), tente rodar no celular pelo app Expo Go — o banco de dados local funciona de forma mais confiável lá.`
        );
      }
    } finally {
      setProcessandoAuth(false);
    }
  };

  const fazerLogin = async () => {
    const nome = nomeUsuarioInput.trim();
    if (!nome || !senhaInput) {
      mostrarAlerta('Campos vazios', 'Preencha usuário e senha.');
      return;
    }

    setProcessandoAuth(true);
    try {
      const usuario = await autenticarUsuario(nome, senhaInput);
      await salvarSessao(usuario.id);
      setUsuarioLogado(usuario);
      setAbaAtiva('adicionar');
      limparCamposAuth();
      await carregarDadosFinanceiros(usuario.id);
    } catch (erro) {
      if (erro.message === 'CREDENCIAIS_INVALIDAS') {
        mostrarAlerta('Não foi possível entrar', 'Usuário ou senha incorretos.');
      } else {
        console.log('Erro ao entrar:', erro);
        mostrarAlerta(
          'Erro ao entrar',
          `Detalhe técnico: ${erro.message || erro}\n\nSe estiver testando pelo navegador (web), tente rodar no celular pelo app Expo Go — o banco de dados local funciona de forma mais confiável lá.`
        );
      }
    } finally {
      setProcessandoAuth(false);
    }
  };

  const fazerLogout = () => {
    confirmarAcao('Sair da conta', 'Deseja sair da sua conta neste aparelho?', async () => {
      await limparSessao();
      setUsuarioLogado(null);
      setSalarioDefinido(null);
      setSalarioAntesDeEditar(null);
      setGastos([]);
      setSalario('');
      setTarefa('');
      setValorGasto('');
      setItemSelecionado(null);
      setPersonalizacoes({});
      setCategoriaEditando(null);
      setAbaAtiva('adicionar');
      setBuscaGasto('');
      limparCamposAuth();
    });
  };

  const formatarMoeda = (valor) => {
    const numero = Number(valor) || 0;
    return numero.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const converterParaNumero = (texto) => {
    const valor = String(texto || '').trim().replace(/[^0-9,.-]/g, '');
    if (!valor) return NaN;

    const ultimaVirgula = valor.lastIndexOf(',');
    const ultimoPonto = valor.lastIndexOf('.');
    let normalizado = valor;

    if (ultimaVirgula !== -1 && ultimoPonto !== -1) {
      const separadorDecimal = ultimaVirgula > ultimoPonto ? ',' : '.';
      const separadorMilhar = separadorDecimal === ',' ? /\./g : /,/g;
      normalizado = valor.replace(separadorMilhar, '').replace(separadorDecimal, '.');
    } else if (ultimaVirgula !== -1) {
      normalizado = valor.replace(/\./g, '').replace(',', '.');
    } else if (ultimoPonto !== -1) {
      const grupos = valor.split('.');
      const pareceMilhar =
        grupos.length > 1 && grupos.slice(1).every((grupo) => grupo.length === 3);
      normalizado = pareceMilhar ? valor.replace(/\./g, '') : valor;
    }

    const numero = Number(normalizado);
    return Number.isFinite(numero) ? numero : NaN;
  };

  const gerarIdGasto = () =>
    `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;  const definirSalario = async () => {
    const valor = converterParaNumero(salario);
    if (!valor || valor <= 0) {
      mostrarAlerta('Valor inválido', 'Digite um salário válido maior que zero.');
      return;
    }
    try {
      await salvarSalario(usuarioLogado.id, valor);
      setSalarioDefinido(valor);
      setSalarioAntesDeEditar(null);
      setSalario('');
    } catch (erro) {
      console.log('Erro ao salvar salário:', erro);
      mostrarAlerta('Erro', 'Não foi possível salvar o salário no banco de dados.');
    }
  };

  const editarSalario = () => {
    setSalarioAntesDeEditar(salarioDefinido);
    setSalario(salarioDefinido ? String(salarioDefinido) : '');
    setSalarioDefinido(null);
  };

  const cancelarEdicaoSalario = () => {
    setSalarioDefinido(salarioAntesDeEditar);
    setSalarioAntesDeEditar(null);
    setSalario('');
  };

  const adicionarGasto = async () => {
    const valor = converterParaNumero(valorGasto);

    if (!tarefa.trim()) {
      mostrarAlerta('Campo vazio', 'Digite o nome da tarefa/gasto.');
      return;
    }
    if (!valor || valor <= 0) {
      mostrarAlerta('Valor inválido', 'Digite um valor válido maior que zero.');
      return;
    }

    const novoGasto = {
      id: gerarIdGasto(),
      tarefa: tarefa.trim(),
      valor,
    };

    try {
      await inserirGasto(usuarioLogado.id, novoGasto);
      setGastos((atual) => [novoGasto, ...atual]);
      setTarefa('');
      setValorGasto('');
    } catch (erro) {
      console.log('Erro ao salvar gasto:', erro);
      mostrarAlerta('Erro', 'Não foi possível salvar o gasto no banco de dados.');
    }
  };

  const removerGasto = (id) => {
    confirmarAcao('Remover gasto', 'Deseja remover este gasto da lista?', async () => {
      try {
        await removerGastoDb(usuarioLogado.id, id);
        setGastos((atual) => atual.filter((g) => g.id !== id));
      } catch (erro) {
        console.log('Erro ao remover gasto:', erro);
        mostrarAlerta('Erro', 'Não foi possível remover o gasto do banco de dados.');
      }
    });
  };

  const limparTudo = () => {
    confirmarAcao(
      'Reiniciar controle',
      'Isso vai apagar o salário, todos os gastos e as personalizações de categoria desta conta. Deseja continuar?',
      async () => {
        try {
          await limparGastosDb(usuarioLogado.id);
          await apagarSalario(usuarioLogado.id);
          await limparPersonalizacoesDb(usuarioLogado.id);
          setSalarioDefinido(null);
          setGastos([]);
          setSalario('');
          setPersonalizacoes({});
          setCategoriaEditando(null);
          setBuscaGasto('');
        } catch (erro) {
          console.log('Erro ao reiniciar dados:', erro);
          mostrarAlerta('Erro', 'Não foi possível apagar os dados do banco.');
        }
      }
    );
  };

  // Abre o painel de personalização para uma categoria, já com a cor/emoji
  // atuais dela pré-selecionados (personalizados ou os padrões automáticos).
  const abrirEdicaoCategoria = (item) => {
    setCategoriaEditando(item.tarefa);
    setCorEdicao(item.cor);
    setEmojiEdicao(item.emoji || '');
  };

  const fecharEdicaoCategoria = () => {
    setCategoriaEditando(null);
  };

  const salvarPersonalizacao = async () => {
    if (!categoriaEditando) return;
    try {
      await salvarPersonalizacaoCategoria(
        usuarioLogado.id,
        categoriaEditando,
        corEdicao,
        emojiEdicao
      );
      setPersonalizacoes((atual) => ({
        ...atual,
        [categoriaEditando]: { cor: corEdicao, emoji: emojiEdicao },
      }));
      setCategoriaEditando(null);
    } catch (erro) {
      console.log('Erro ao salvar personalização:', erro);
      mostrarAlerta('Erro', 'Não foi possível salvar a personalização da categoria.');
    }
  };

  const restaurarPadraoCategoria = async () => {
    if (!categoriaEditando) return;
    try {
      await removerPersonalizacaoCategoria(usuarioLogado.id, categoriaEditando);
      setPersonalizacoes((atual) => {
        const copia = { ...atual };
        delete copia[categoriaEditando];
        return copia;
      });
      setCategoriaEditando(null);
    } catch (erro) {
      console.log('Erro ao restaurar categoria:', erro);
      mostrarAlerta('Erro', 'Não foi possível restaurar o padrão da categoria.');
    }
  };

  const totalGasto = gastos.reduce((soma, item) => soma + item.valor, 0);
  const saldo = (salarioDefinido || 0) - totalGasto;
  const percentualGasto =
    salarioDefinido && salarioDefinido > 0
      ? Math.min((totalGasto / salarioDefinido) * 100, 100)
      : 0;

  // Agrupa os gastos por nome de tarefa/categoria (soma valores repetidos)
  const gastosAgrupados = gastos.reduce((acumulado, item) => {
    const existente = acumulado.find((g) => g.tarefa === item.tarefa);
    if (existente) {
      existente.valor += item.valor;
    } else {
      acumulado.push({ tarefa: item.tarefa, valor: item.valor });
    }
    return acumulado;
  }, []);

  // Ordena do maior para o menor gasto e aplica a cor/emoji personalizados
  // (quando existirem) ou a cor automática da paleta como padrão.
  const dadosCategorias = [...gastosAgrupados]
    .sort((a, b) => b.valor - a.valor)
    .map((item, indice) => {
      const personalizacao = personalizacoes[item.tarefa];
      const corPadrao = PALETA_CORES[indice % PALETA_CORES.length];
      return {
        ...item,
        cor: personalizacao?.cor || corPadrao,
        emoji: personalizacao?.emoji || '',
        percentual: totalGasto > 0 ? (item.valor / totalGasto) * 100 : 0,
      };
    });

  // Tamanhos do gráfico adaptados para telas pequenas
  const raioPizza = telaPequena ? 66 : telaLarga ? 120 : 90;
  const raioInternoPizza = telaPequena ? 38 : telaLarga ? 74 : 55;
  const larguraBarra = telaPequena ? 20 : telaLarga ? 32 : 28;
  const espacamentoBarra = telaPequena ? 16 : telaLarga ? 26 : 22;
  const alturaBarras = telaPequena ? 160 : telaLarga ? 220 : 180;
  const larguraGraficoBarras = Math.max(
    larguraTela - (telaLarga ? 104 : 56),
    dadosCategorias.length * (larguraBarra + espacamentoBarra) + 48
  );

  // Formato exigido pelo PieChart (react-native-gifted-charts)
  const dadosPizza = dadosCategorias.map((item) => ({
    value: item.valor,
    color: item.cor,
    text: item.emoji ? item.emoji : `${item.percentual.toFixed(0)}%`,
    focused: itemSelecionado === item.tarefa,
    onPress: () =>
      setItemSelecionado((atual) => (atual === item.tarefa ? null : item.tarefa)),
  }));

  // Formato exigido pelo BarChart (react-native-gifted-charts)
  const dadosBarras = dadosCategorias.map((item) => {
    const nomeCurto =
      item.tarefa.length > 8 ? `${item.tarefa.slice(0, 8)}…` : item.tarefa;
    return {
      value: item.valor,
      label: item.emoji ? `${item.emoji} ${nomeCurto}` : nomeCurto,
      frontColor: item.cor,
      topLabelComponent: () => (
        <Text style={styles.rotuloBarra}>{formatarMoeda(item.valor)}</Text>
      ),
      onPress: () =>
        setItemSelecionado((atual) => (atual === item.tarefa ? null : item.tarefa)),
    };
  });

  const categoriaSelecionada = dadosCategorias.find(
    (item) => item.tarefa === itemSelecionado
  );

  // Lista de gastos filtrada pela busca da aba "Gastos"
  const gastosFiltrados = gastos.filter((item) =>
    item.tarefa.toLowerCase().includes(buscaGasto.trim().toLowerCase())
  );

  // ---- Tela de carregamento inicial (checando sessão salva) ----
  if (carregandoSessao) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.centralizado}>
          <ActivityIndicator size="large" color="#4c8bf5" />
        </View>
      </SafeAreaView>
    );
  }

  // ---- Tela de login / cadastro ----
  if (!usuarioLogado) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.centralizadoScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.titulo}>💰 Controle Financeiro</Text>
            <Text style={styles.subtitulo}>
              {modoAuth === 'entrar' ? 'Entre na sua conta' : 'Crie sua conta'}
            </Text>

            {Platform.OS === 'web' && (
              <View style={styles.avisoWeb}>
                <Text style={styles.textoAvisoWeb}>
                  ⚠️ Você está no navegador. O banco de dados local funciona melhor no
                  celular, pelo app Expo Go. Se der erro ao criar conta, tente por lá.
                </Text>
              </View>
            )}

            <TextInput
              style={styles.inputSalario}
              placeholder="Nome de usuário"
              placeholderTextColor="#8a8a8a"
              autoCapitalize="none"
              autoCorrect={false}
              value={nomeUsuarioInput}
              onChangeText={setNomeUsuarioInput}
            />

            <TextInput
              style={styles.inputSalario}
              placeholder="Senha"
              placeholderTextColor="#8a8a8a"
              secureTextEntry
              value={senhaInput}
              onChangeText={setSenhaInput}
            />

            {modoAuth === 'cadastrar' && (
              <TextInput
                style={styles.inputSalario}
                placeholder="Confirmar senha"
                placeholderTextColor="#8a8a8a"
                secureTextEntry
                value={confirmarSenhaInput}
                onChangeText={setConfirmarSenhaInput}
              />
            )}

            <TouchableOpacity
              style={styles.botaoPrimario}
              onPress={modoAuth === 'entrar' ? fazerLogin : fazerCadastro}
              disabled={processandoAuth}
            >
              {processandoAuth ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.textoBotaoPrimario}>
                  {modoAuth === 'entrar' ? 'Entrar' : 'Criar conta'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkAlternarAuth}
              onPress={() => {
                setModoAuth((atual) => (atual === 'entrar' ? 'cadastrar' : 'entrar'));
                limparCamposAuth();
              }}
            >
              <Text style={styles.textoLinkAuth}>
                {modoAuth === 'entrar'
                  ? 'Não tem conta? Criar uma agora'
                  : 'Já tem conta? Entrar'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ---- Tela de carregamento dos dados da conta ----
  if (carregandoDados) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.centralizado}>
          <ActivityIndicator size="large" color="#4c8bf5" />
        </View>
      </SafeAreaView>
    );
  }

  // ---- Tela para definir/editar o salário ----
  if (!salarioDefinido) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.centralizadoScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.titulo}>💰 Controle Financeiro</Text>
            <Text style={styles.subtitulo}>
              Olá, {usuarioLogado.nomeUsuario}! Qual é o seu salário mensal?
            </Text>

            <TextInput
              style={styles.inputSalario}
              placeholder="Ex: 3000"
              placeholderTextColor="#8a8a8a"
              keyboardType="numeric"
              value={salario}
              onChangeText={setSalario}
              autoFocus
            />

            <TouchableOpacity style={styles.botaoPrimario} onPress={definirSalario}>
              <Text style={styles.textoBotaoPrimario}>Confirmar salário</Text>
            </TouchableOpacity>

            {salarioAntesDeEditar !== null && (
              <TouchableOpacity
                style={styles.linkAlternarAuth}
                onPress={cancelarEdicaoSalario}
              >
                <Text style={styles.textoLinkAuth}>Cancelar</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.linkAlternarAuth} onPress={fazerLogout}>
              <Text style={[styles.textoLinkAuth, { color: '#ff6b6b' }]}>
                Sair da conta
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ---- Tela principal (com abas) ----
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.appShell}>
      {/* Cabeçalho compacto */}
      <View style={styles.headerTopo}>
        <Text style={styles.tituloHeaderTopo} numberOfLines={1}>
          Olá, {usuarioLogado.nomeUsuario}
        </Text>
        <View style={styles.linhaAcoesHeader}>
          <TouchableOpacity
            style={styles.botaoIconeHeader}
            onPress={editarSalario}
            accessibilityLabel="Editar salário"
          >
            <Text style={styles.textoIconeHeader}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.botaoIconeHeader}
            onPress={fazerLogout}
            accessibilityLabel="Sair"
          >
            <Text style={styles.textoIconeHeader}>🚪</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Resumo financeiro compacto (sempre visível) */}
      <View style={styles.resumoCard}>
        <View style={styles.linhaResumo}>
          <View style={[styles.blocoResumo, { alignItems: 'flex-start' }]}>
            <Text style={styles.labelResumo}>Salário</Text>
            <Text
              style={styles.valorResumo}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {formatarMoeda(salarioDefinido)}
            </Text>
          </View>
          <View style={[styles.blocoResumo, { alignItems: 'center' }]}>
            <Text style={styles.labelResumo}>Gasto</Text>
            <Text
              style={[styles.valorResumo, { color: '#ff6b6b' }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {formatarMoeda(totalGasto)}
            </Text>
          </View>
          <View style={[styles.blocoResumo, { alignItems: 'flex-end' }]}>
            <Text style={styles.labelResumo}>Saldo</Text>
            <Text
              style={[
                styles.valorResumo,
                { color: saldo >= 0 ? '#4cd97b' : '#ff6b6b' },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {formatarMoeda(saldo)}
            </Text>
          </View>
        </View>

        <View style={styles.barraFundo}>
          <View
            style={[
              styles.barraPreenchida,
              {
                width: `${percentualGasto}%`,
                backgroundColor: saldo >= 0 ? '#4cd97b' : '#ff6b6b',
              },
            ]}
          />
        </View>
        <Text style={styles.textoPercentual}>
          {percentualGasto.toFixed(0)}% do salário já comprometido
        </Text>
      </View>

      {/* Conteúdo da aba ativa */}
      <View style={styles.conteudoAbaContainer}>
        {abaAtiva === 'adicionar' && (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            <ScrollView
              contentContainerStyle={styles.conteudoAbaScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.tituloAba}>Novo gasto</Text>

              {dadosCategorias.length > 0 && (
                <>
                  <Text style={styles.labelCampo}>Categorias usadas</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.scrollChips}
                    contentContainerStyle={{ paddingRight: 8 }}
                  >
                    {dadosCategorias.slice(0, 10).map((cat) => (
                      <TouchableOpacity
                        key={cat.tarefa}
                        style={[styles.chipCategoria, { borderColor: cat.cor }]}
                        onPress={() => setTarefa(cat.tarefa)}
                      >
                        {cat.emoji ? (
                          <Text style={styles.chipEmoji}>{cat.emoji}</Text>
                        ) : null}
                        <Text style={styles.chipTexto} numberOfLines={1}>
                          {cat.tarefa}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}

              <Text style={styles.labelCampo}>Nome da tarefa/gasto</Text>
              <TextInput
                style={styles.inputTarefa}
                placeholder="Ex: Mercado, Aluguel, Uber..."
                placeholderTextColor="#8a8a8a"
                value={tarefa}
                onChangeText={setTarefa}
              />

              <Text style={styles.labelCampo}>Valor gasto</Text>
              <TextInput
                style={styles.inputTarefa}
                placeholder="Ex: 150,00"
                placeholderTextColor="#8a8a8a"
                keyboardType="numeric"
                value={valorGasto}
                onChangeText={setValorGasto}
              />

              <TouchableOpacity
                style={styles.botaoAdicionarGrande}
                onPress={adicionarGasto}
              >
                <Text style={styles.textoBotaoAdicionarGrande}>+ Adicionar gasto</Text>
              </TouchableOpacity>

              {gastos.length > 0 && (
                <View style={styles.blocoRecentes}>
                  <Text style={styles.labelCampo}>Últimos gastos</Text>
                  {gastos.slice(0, 3).map((item) => {
                    const emojiCategoria = personalizacoes[item.tarefa]?.emoji;
                    return (
                      <View key={item.id} style={styles.itemRecente}>
                        <Text style={styles.itemRecenteTexto} numberOfLines={1}>
                          {emojiCategoria ? `${emojiCategoria} ` : ''}
                          {item.tarefa}
                        </Text>
                        <Text style={styles.itemRecenteValor}>
                          {formatarMoeda(item.valor)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        )}

        {abaAtiva === 'grafico' && (
          <ScrollView
            contentContainerStyle={styles.conteudoAbaScroll}
            showsVerticalScrollIndicator={false}
          >
            {dadosCategorias.length === 0 ? (
              <Text style={styles.listaVazia}>
                Ainda não há gastos para mostrar no gráfico. Adicione um gasto na aba
                "Adicionar".
              </Text>
            ) : (
              <>
                <View style={styles.linhaCabecalho}>
                  <Text style={styles.tituloAba}>Gastos por categoria</Text>
                  <View style={styles.seletorTipo}>
                    <TouchableOpacity
                      style={[
                        styles.botaoTipo,
                        tipoGrafico === 'pizza' && styles.botaoTipoAtivo,
                      ]}
                      onPress={() => setTipoGrafico('pizza')}
                    >
                      <Text
                        style={[
                          styles.textoBotaoTipo,
                          tipoGrafico === 'pizza' && styles.textoBotaoTipoAtivo,
                        ]}
                      >
                        Pizza
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.botaoTipo,
                        tipoGrafico === 'barras' && styles.botaoTipoAtivo,
                      ]}
                      onPress={() => setTipoGrafico('barras')}
                    >
                      <Text
                        style={[
                          styles.textoBotaoTipo,
                          tipoGrafico === 'barras' && styles.textoBotaoTipoAtivo,
                        ]}
                      >
                        Barras
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.dicaGrafico}>
                  Toque em uma {tipoGrafico === 'pizza' ? 'fatia' : 'barra'} para ver
                  o detalhe
                </Text>

                {tipoGrafico === 'pizza' ? (
                  <View style={styles.containerPizza}>
                    <PieChart
                      data={dadosPizza}
                      donut
                      radius={raioPizza}
                      innerRadius={raioInternoPizza}
                      innerCircleColor="#1e1e1e"
                      showText
                      textColor="#fff"
                      textSize={11}
                      focusOnPress
                      centerLabelComponent={() => (
                        <View style={{ alignItems: 'center' }}>
                          <Text style={styles.centroLabelValor}>
                            {categoriaSelecionada
                              ? formatarMoeda(categoriaSelecionada.valor)
                              : formatarMoeda(totalGasto)}
                          </Text>
                          <Text style={styles.centroLabelTexto}>
                            {categoriaSelecionada
                              ? `${
                                  categoriaSelecionada.emoji
                                    ? categoriaSelecionada.emoji + ' '
                                    : ''
                                }${categoriaSelecionada.tarefa}`
                              : 'Total'}
                          </Text>
                        </View>
                      )}
                    />
                  </View>
                ) : (
                  <View style={styles.containerBarras}>
                    <ScrollView
                      horizontal
                      nestedScrollEnabled
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.scrollBarras}
                    >
                      <BarChart
                        data={dadosBarras}
                        width={larguraGraficoBarras}
                        barWidth={larguraBarra}
                        spacing={espacamentoBarra}
                        roundedTop
                        hideRules
                        xAxisThickness={1}
                        yAxisThickness={0}
                        xAxisColor="#2c2c2c"
                        yAxisTextStyle={{ color: '#8a8a8a', fontSize: 10 }}
                        xAxisLabelTextStyle={{ color: '#8a8a8a', fontSize: 10 }}
                        noOfSections={4}
                        height={alturaBarras}
                      />
                    </ScrollView>
                  </View>
                )}

                <View style={styles.legenda}>
                  {dadosCategorias.map((item) => (
                    <View key={item.tarefa} style={styles.linhaItemLegenda}>
                      <TouchableOpacity
                        style={[
                          styles.itemLegenda,
                          itemSelecionado === item.tarefa && styles.itemLegendaAtivo,
                        ]}
                        onPress={() =>
                          setItemSelecionado((atual) =>
                            atual === item.tarefa ? null : item.tarefa
                          )
                        }
                      >
                        <View
                          style={[
                            styles.bolinhaLegenda,
                            { backgroundColor: item.cor },
                          ]}
                        />
                        {item.emoji ? (
                          <Text style={styles.emojiLegenda}>{item.emoji}</Text>
                        ) : null}
                        <Text style={styles.textoLegenda} numberOfLines={1}>
                          {item.tarefa}
                        </Text>
                        <Text style={styles.textoLegendaValor}>
                          {item.percentual.toFixed(0)}%
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.botaoEditarCategoria}
                        onPress={() =>
                          categoriaEditando === item.tarefa
                            ? fecharEdicaoCategoria()
                            : abrirEdicaoCategoria(item)
                        }
                      >
                        <Text style={styles.textoEditarCategoria}>🎨</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </>
            )}
          </ScrollView>
        )}

        {abaAtiva === 'gastos' && (
          <View style={{ flex: 1 }}>
            <View style={styles.blocoBusca}>
              <TextInput
                style={styles.inputBusca}
                placeholder="🔎 Buscar por nome do gasto"
                placeholderTextColor="#8a8a8a"
                value={buscaGasto}
                onChangeText={setBuscaGasto}
              />
              {gastos.length > 0 && (
                <Text style={styles.textoContagemGastos}>
                  {gastosFiltrados.length} de {gastos.length} gastos
                </Text>
              )}
            </View>

            <FlatList
              data={gastosFiltrados}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listaContainer}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <Text style={styles.listaVazia}>
                  {buscaGasto
                    ? 'Nenhum gasto encontrado com esse nome.'
                    : 'Nenhum gasto cadastrado ainda. Toque em ➕ Adicionar para começar.'}
                </Text>
              }
              renderItem={({ item }) => {
                const emojiCategoria = personalizacoes[item.tarefa]?.emoji;
                return (
                  <View style={styles.itemGasto}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTarefa}>
                        {emojiCategoria ? `${emojiCategoria} ` : ''}
                        {item.tarefa}
                      </Text>
                      <Text style={styles.itemValor}>{formatarMoeda(item.valor)}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.botaoRemover}
                      onPress={() => removerGasto(item.id)}
                    >
                      <Text style={styles.textoRemover}>Remover</Text>
                    </TouchableOpacity>
                  </View>
                );
              }}
              ListFooterComponent={
                gastos.length > 0 ? (
                  <TouchableOpacity style={styles.botaoLimpar} onPress={limparTudo}>
                    <Text style={styles.textoBotaoLimpar}>
                      Reiniciar controle financeiro
                    </Text>
                  </TouchableOpacity>
                ) : null
              }
            />
          </View>
        )}
      </View>

      {/* Barra de abas inferior */}
      <View style={styles.barraAbas}>
        {ABAS.map((aba) => (
          <TouchableOpacity
            key={aba.chave}
            style={styles.botaoAba}
            onPress={() => setAbaAtiva(aba.chave)}
          >
            <Text
              style={[styles.iconeAba, abaAtiva === aba.chave && styles.iconeAbaAtivo]}
            >
              {aba.icone}
            </Text>
            <Text
              style={[styles.labelAba, abaAtiva === aba.chave && styles.labelAbaAtivo]}
            >
              {aba.rotulo}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      </View>

      {/* Modal (bottom sheet) de personalização de categoria */}
      <Modal
        visible={!!categoriaEditando}
        transparent
        animationType="slide"
        onRequestClose={fecharEdicaoCategoria}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={fecharEdicaoCategoria}
          />
          <View style={styles.cardModal}>
            <View style={styles.alcaModal} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.tituloPainelEdicao}>
                Personalizar "{categoriaEditando}"
              </Text>

              <Text style={styles.subtituloPainelEdicao}>Cor</Text>
              <View style={styles.gradeCores}>
                {PALETA_EDICAO_CORES.map((cor) => (
                  <TouchableOpacity
                    key={cor}
                    style={[
                      styles.swatchCor,
                      { backgroundColor: cor },
                      corEdicao === cor && styles.swatchCorSelecionada,
                    ]}
                    onPress={() => setCorEdicao(cor)}
                  />
                ))}
              </View>

              <Text style={styles.subtituloPainelEdicao}>Emoji (opcional)</Text>
              <View style={styles.gradeEmojis}>
                <TouchableOpacity
                  style={[
                    styles.botaoEmojiOpcao,
                    !emojiEdicao && styles.botaoEmojiOpcaoSelecionado,
                  ]}
                  onPress={() => setEmojiEdicao('')}
                >
                  <Text style={styles.textoEmojiOpcao}>🚫</Text>
                </TouchableOpacity>
                {EMOJIS_CATEGORIA.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    style={[
                      styles.botaoEmojiOpcao,
                      emojiEdicao === emoji && styles.botaoEmojiOpcaoSelecionado,
                    ]}
                    onPress={() => setEmojiEdicao(emoji)}
                  >
                    <Text style={styles.textoEmojiOpcao}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity onPress={restaurarPadraoCategoria}>
                <Text style={styles.textoRestaurarPadrao}>
                  Restaurar cor/emoji padrão
                </Text>
              </TouchableOpacity>

              <View style={styles.linhaBotoesPainel}>
                <TouchableOpacity
                  style={styles.botaoCancelarPainel}
                  onPress={fecharEdicaoCategoria}
                >
                  <Text style={styles.textoBotaoCancelarPainel}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.botaoSalvarPainel}
                  onPress={salvarPersonalizacao}
                >
                  <Text style={styles.textoBotaoSalvarPainel}>Salvar</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  centralizado: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  appShell: {
    flex: 1,
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center',
  },
  centralizadoScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  titulo: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitulo: {
    fontSize: 16,
    color: '#b3b3b3',
    marginBottom: 24,
    textAlign: 'center',
  },
  avisoWeb: {
    backgroundColor: '#332b12',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#5c4d1c',
    width: '100%',
  },
  textoAvisoWeb: {
    color: '#f5a623',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },
  inputSalario: {
    width: '100%',
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#2c2c2c',
    marginBottom: 16,
    textAlign: 'center',
  },
  botaoPrimario: {
    backgroundColor: '#4c8bf5',
    paddingVertical: 15,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    minHeight: 50,
    justifyContent: 'center',
  },
  textoBotaoPrimario: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkAlternarAuth: {
    marginTop: 18,
    minHeight: 30,
    justifyContent: 'center',
  },
  textoLinkAuth: {
    color: '#4c8bf5',
    fontSize: 13,
    textAlign: 'center',
  },

  // ---- Cabeçalho compacto ----
  headerTopo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  tituloHeaderTopo: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    flexShrink: 1,
    marginRight: 8,
  },
  linhaAcoesHeader: {
    flexDirection: 'row',
  },
  botaoIconeHeader: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#121212',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  textoIconeHeader: {
    fontSize: 16,
  },

  // ---- Resumo financeiro ----
  resumoCard: {
    backgroundColor: '#1e1e1e',
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 2,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  linhaResumo: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  blocoResumo: {
    flex: 1,
  },
  labelResumo: {
    color: '#8a8a8a',
    fontSize: 11,
    marginBottom: 4,
  },
  valorResumo: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  barraFundo: {
    height: 8,
    backgroundColor: '#2c2c2c',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barraPreenchida: {
    height: '100%',
    borderRadius: 4,
  },
  textoPercentual: {
    color: '#8a8a8a',
    fontSize: 11,
    marginTop: 6,
  },

  // ---- Conteúdo das abas ----
  conteudoAbaContainer: {
    flex: 1,
  },
  conteudoAbaScroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    flexGrow: 1,
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
  },
  tituloAba: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  labelCampo: {
    color: '#8a8a8a',
    fontSize: 12,
    marginBottom: 6,
    marginTop: 14,
  },

  // ---- Aba Adicionar ----
  scrollChips: {
    marginBottom: 4,
  },
  chipCategoria: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    borderWidth: 1.5,
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginRight: 8,
    maxWidth: 150,
  },
  chipEmoji: {
    fontSize: 13,
    marginRight: 5,
  },
  chipTexto: {
    color: '#fff',
    fontSize: 12,
  },
  inputTarefa: {
    backgroundColor: '#1e1e1e',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#2c2c2c',
  },
  botaoAdicionarGrande: {
    backgroundColor: '#4cd97b',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 22,
    minHeight: 50,
    justifyContent: 'center',
  },
  textoBotaoAdicionarGrande: {
    color: '#121212',
    fontWeight: 'bold',
    fontSize: 15,
  },
  blocoRecentes: {
    marginTop: 26,
  },
  itemRecente: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#1e1e1e',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  itemRecenteTexto: {
    color: '#fff',
    fontSize: 13,
    flex: 1,
    marginRight: 8,
  },
  itemRecenteValor: {
    color: '#ff6b6b',
    fontSize: 13,
    fontWeight: '600',
  },

  // ---- Aba Gráfico ----
  linhaCabecalho: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seletorTipo: {
    flexDirection: 'row',
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    padding: 3,
  },
  botaoTipo: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  botaoTipoAtivo: {
    backgroundColor: '#4c8bf5',
  },
  textoBotaoTipo: {
    color: '#8a8a8a',
    fontSize: 12,
    fontWeight: '600',
  },
  textoBotaoTipoAtivo: {
    color: '#fff',
  },
  dicaGrafico: {
    color: '#8a8a8a',
    fontSize: 11,
    marginBottom: 12,
  },
  containerPizza: {
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    borderRadius: 14,
    paddingVertical: 20,
  },
  containerBarras: {
    backgroundColor: '#1e1e1e',
    borderRadius: 14,
    paddingVertical: 16,
    paddingLeft: 8,
    paddingRight: 16,
    overflow: 'hidden',
  },
  scrollBarras: {
    paddingLeft: 8,
    paddingRight: 16,
  },
  rotuloBarra: {
    color: '#8a8a8a',
    fontSize: 9,
    marginBottom: 4,
  },
  centroLabelValor: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  centroLabelTexto: {
    color: '#8a8a8a',
    fontSize: 11,
    marginTop: 2,
    maxWidth: 100,
    textAlign: 'center',
  },
  legenda: {
    marginTop: 16,
  },
  linhaItemLegenda: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemLegenda: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 8,
    minHeight: 44,
  },
  itemLegendaAtivo: {
    backgroundColor: '#1e1e1e',
  },
  bolinhaLegenda: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  emojiLegenda: {
    fontSize: 14,
    marginRight: 6,
  },
  textoLegenda: {
    flex: 1,
    color: '#fff',
    fontSize: 13,
  },
  textoLegendaValor: {
    color: '#8a8a8a',
    fontSize: 12,
    fontWeight: '600',
  },
  botaoEditarCategoria: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoEditarCategoria: {
    fontSize: 17,
  },

  // ---- Aba Gastos ----
  blocoBusca: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  inputBusca: {
    backgroundColor: '#1e1e1e',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#2c2c2c',
  },
  textoContagemGastos: {
    color: '#8a8a8a',
    fontSize: 11,
    marginTop: 6,
  },
  listaContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    flexGrow: 1,
  },
  listaVazia: {
    color: '#8a8a8a',
    textAlign: 'center',
    marginTop: 24,
    fontSize: 13,
    paddingHorizontal: 16,
  },
  itemGasto: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  itemTarefa: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemValor: {
    color: '#ff6b6b',
    fontSize: 14,
  },
  botaoRemover: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 44,
    justifyContent: 'center',
  },
  textoRemover: {
    color: '#ff6b6b',
    fontSize: 12,
  },
  botaoLimpar: {
    marginTop: 8,
    marginBottom: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2c2c2c',
  },
  textoBotaoLimpar: {
    color: '#8a8a8a',
    fontSize: 13,
  },

  // ---- Barra de abas inferior ----
  barraAbas: {
    flexDirection: 'row',
    backgroundColor: '#1e1e1e',
    borderTopWidth: 1,
    borderTopColor: '#2c2c2c',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 22 : 10,
  },
  botaoAba: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    minHeight: 48,
  },
  iconeAba: {
    fontSize: 20,
    marginBottom: 2,
    opacity: 0.5,
  },
  iconeAbaAtivo: {
    opacity: 1,
  },
  labelAba: {
    fontSize: 11,
    color: '#8a8a8a',
  },
  labelAbaAtivo: {
    color: '#4c8bf5',
    fontWeight: '700',
  },

  // ---- Modal de personalização de categoria ----
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  cardModal: {
    backgroundColor: '#1e1e1e',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '85%',
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  alcaModal: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#444',
    alignSelf: 'center',
    marginBottom: 16,
  },
  tituloPainelEdicao: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
  },
  subtituloPainelEdicao: {
    color: '#8a8a8a',
    fontSize: 12,
    marginBottom: 8,
    marginTop: 4,
  },
  gradeCores: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 6,
  },
  swatchCor: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchCorSelecionada: {
    borderColor: '#fff',
  },
  gradeEmojis: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  botaoEmojiOpcao: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#121212',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  botaoEmojiOpcaoSelecionado: {
    borderColor: '#4c8bf5',
  },
  textoEmojiOpcao: {
    fontSize: 17,
  },
  textoRestaurarPadrao: {
    color: '#4c8bf5',
    fontSize: 12,
    marginBottom: 16,
    paddingVertical: 6,
  },
  linhaBotoesPainel: {
    flexDirection: 'row',
    gap: 10,
  },
  botaoCancelarPainel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2c2c2c',
    minHeight: 46,
    justifyContent: 'center',
  },
  textoBotaoCancelarPainel: {
    color: '#8a8a8a',
    fontSize: 13,
    fontWeight: '600',
  },
  botaoSalvarPainel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#4c8bf5',
    minHeight: 46,
    justifyContent: 'center',
  },
  textoBotaoSalvarPainel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});