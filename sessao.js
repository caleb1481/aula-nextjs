import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Guarda apenas o ID do usuário logado, para que o app "lembre" a sessão da
// próxima vez que for aberto.
const CHAVE_SESSAO = 'controle_financeiro_usuario_id';

// O expo-secure-store só funciona em iOS/Android (não existe no navegador).
// Por isso, quando o app roda na web, usamos localStorage como alternativa —
// menos seguro que o SecureStore, mas suficiente para lembrar a sessão local.
const rodandoNaWeb = Platform.OS === 'web';

export async function salvarSessao(usuarioId) {
  if (rodandoNaWeb) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CHAVE_SESSAO, String(usuarioId));
    }
    return;
  }
  await SecureStore.setItemAsync(CHAVE_SESSAO, String(usuarioId));
}

export async function buscarSessao() {
  if (rodandoNaWeb) {
    if (typeof localStorage !== 'undefined') {
      const valor = localStorage.getItem(CHAVE_SESSAO);
      return valor ? Number(valor) : null;
    }
    return null;
  }
  const valor = await SecureStore.getItemAsync(CHAVE_SESSAO);
  return valor ? Number(valor) : null;
}

export async function limparSessao() {
  if (rodandoNaWeb) {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(CHAVE_SESSAO);
    }
    return;
  }
  await SecureStore.deleteItemAsync(CHAVE_SESSAO);
}