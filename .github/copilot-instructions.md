# Instruções para Agentes de IA - Aula Next.js

## Visão Geral do Projeto

Este é um projeto educacional Next.js com estrutura organizada em **Exemplos** (ex-01 até ex-05) e **Atividades** (atv-01 até atv-04). Serve como material didático para ensinar conceitos de React e Next.js App Router.

- **Stack**: Next.js 16.2.4, React 19.2.3, CSS Modules
- **Idioma**: Português Brasileiro
- **Estrutura**: App Router (não Pages Router)

## Arquitetura e Padrões

### Estrutura de Diretórios

```
src/app/
├── exemplos/       # Componentes educacionais demonstrando conceitos
│   ├── ex-01/     # Componentes básicos
│   ├── ex-02/     # +CSS Modules
│   ├── ex-03/     # +Componentes reutilizáveis
│   ├── ex-04/     # +Props e useState (componentes reutilizáveis com botões)
│   └── ex-05/     # Trabalho em progresso
├── atividades/     # Exercícios para o aluno
│   ├── atv-01/    # Exercício 1
│   ├── atv-02/    # Exercício 2
│   ├── atv-03/    # Exercício 3 com componente Botao reutilizável
│   └── atv-04/    # Exercício 4
├── estilizacao/   # Estilos globais
│   ├── globals.css
│   └── reset.css
├── layout.js      # Root layout com fontes Geist e estilos globais
└── page.jsx       # Home com links de navegação
```

### Convenções de Nomenclatura

- **Componentes de página**: `page.jsx` (exportado como default)
- **Componentes reutilizáveis**: `index.jsx` em subdiretórios (ex: `botao/index.jsx`)
- **Estilos**: `page.module.css` ou `index.module.css` (sempre CSS Modules)
- **Imports de estilos**: `import styles from './page.module.css'`
- **Nomes de classes**: camelCase em CSS (ex: `containerHome`, `containerListas`)

### Padrões de Componentes

#### Componentes Funcionais Simples (sem estado)
```jsx
// Componente educacional básico
function Exemplo01() {
  return (
    <div>
      <h1>Titulo</h1>
      <p>Conteúdo</p>
    </div>
  );
}
export default Exemplo01;
```

#### Componentes Reutilizáveis com Props
```jsx
// botao/index.jsx - Componente parametrizado
function Botao({ texto, aoClicar, acao }) {
  return (
    <button 
      className={`${styles.botao} ${acao === '+' ? styles.mais : styles.menos}`}
      onClick={aoClicar}
    >
      {texto}
    </button>
  );
}
export default Botao;
```

#### Componentes com Estado (use 'use client')
Sempre adicione `'use client'` no topo quando usar hooks:
```jsx
'use client'
import { useState } from 'react';

function Exemplo04() {
  const [contador, setContador] = useState(0);
  const incrementar = () => setContador(contador + 1);
  // ...
}
```

## Workflows Principais

### Desenvolvimento Local
```bash
npm run dev    # Inicia servidor em http://localhost:3000
npm run build  # Build de produção
npm start      # Roda build de produção localmente
npm run lint   # ESLint (Next.js Core Web Vitals)
```

### Adicionar Nova Página/Atividade
1. Crie pasta `src/app/exemplos/ex-XX/` ou `src/app/atividades/atv-XX/`
2. Crie `page.jsx` como componente default
3. Crie `page.module.css` para estilos específicos
4. Atualize navegação em `src/app/page.jsx` com `<Link href="/...">Texto</Link>`

### Adicionar Componente Reutilizável
1. Crie subdiretório (ex: `src/app/atividades/atv-03/botao/`)
2. Coloque o componente em `index.jsx`
3. Crie `index.module.css` para estilos
4. Importe em `page.jsx` com caminho relativo: `import Botao from './botao'`

## Configurações Importantes

- **jsconfig.json**: Alias `@/*` apontando para `./src/*` (use se precisar imports profundos)
- **ESLint**: Usa `eslint-config-next` com Core Web Vitals
- **Fontes**: Geist Sans/Mono do Google Fonts (importadas em `layout.js`)
- **Idioma**: `<html lang="pt-br">` no root layout

## Padrões de Estado e Interatividade

- Use `useState` para estado local de componentes
- Sempre adicione `'use client'` em componentes com hooks
- Props nomeadas em português: `aoClicar`, `texto`, `acao`
- Callbacks inline ou funções nomeadas (ambas usadas no projeto)

## Pontos de Atenção

1. **CSS Modules**: Todos os estilos devem ser em CSS Modules (não inline styles ou global styles exceto `estilizacao/`)
2. **Importações de Estilo**: Sempre destructure com `const styles = require(...)` ou import statement
3. **Nomes de Classes CSS**: Nunca use classes CSS diretas; sempre acesse pelo objeto `styles`
4. **Navegação**: Use `next/link` para navegação interna (já presente em `page.jsx`)
5. **Estrutura de Pasta**: Siga o padrão de 2 níveis de profundidade máximo para componentes
