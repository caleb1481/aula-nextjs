'use client'

<<<<<<< HEAD
import { useState } from 'react';
import styles from './page.module.css';

function Atividade04() {
  const [inputValue, setInputValue] = useState({
    id: '',
    quantidade: '',
    produto: ''
  });
  const [dadosCadastrados, setDadosCadastrados] = useState([]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputValue.produto || !inputValue.quantidade) return;

    // Adiciona o novo item e gera um ID único
    const novoItem = { ...inputValue, id: Date.now() };
    setDadosCadastrados([...dadosCadastrados, novoItem]);

    // Limpa os campos
    setInputValue({ id: '', quantidade: '', produto: '' });
  };

  const handleDelete = (id) => {
    setDadosCadastrados(dadosCadastrados.filter(item => item.id !== id));
  };

  return (
    <div className={styles.container}>
      <h1>Formulário básico</h1>

      <form className={styles.form} onSubmit={handleSubmit}>
        <input
          type="number"
          value={inputValue.quantidade}
          onChange={(e) => setInputValue({ ...inputValue, quantidade: e.target.value })}
          placeholder="Qtd"
        />
        <input
          type="text"
          value={inputValue.produto}
          onChange={(e) => setInputValue({ ...inputValue, produto: e.target.value })}
          placeholder="Produto..."
        />
        <button type="submit">Adicionar</button>
      </form>

      {dadosCadastrados.length > 0 && <h2>Lista de compras</h2>}

      <ul className={styles.lista}>
        {dadosCadastrados.map((item) => (
          <li key={item.id} className={styles.linha}>
            <span className={styles.conteudo}>
              {item.quantidade}x {item.produto}
            </span>
            <button onClick={() => handleDelete(item.id)}>Deletar</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Atividade04;
=======
import { use, useState } from 'react';

import styles from './page.module.css';

export default function FormComponent() {

    // const [formData, setFormData] = useState({ nome: '', email: '' });
    const [login, setLogin] = useState('');
    const [senha, setSenha] = useState('');

    // Array histórico de logins
    const [historico, setHistorico] = useState([]);

    const handleSubmit = (e) => {
        e.preventDefault();

        // console.log("Enviando para API:", formData);
        // Aqui você faria um POST para sua API

        // if (login && senha) {
        //     console.log('Dados do formulário enviados!');
        //     console.log(`Usuário: ${login} \nSenha: ${senha}`);
        
        //     let historicoTemp = historico;

        //     // Exemplo horário
        //     const horario = new Date();
        //     historicoTemp.push(`Usuário: ${login} - Horário ${horario.toLocaleString()}`);

        //     setHistorico(historicoTemp);
        //     // console.log(historico);

        // }

        if (login && senha) {
        const horario = new Date();
        const novaEntrada = `Usuário: ${login} - Horário ${horario.toLocaleString()}`;

        // Cria um NOVO array com os elementos antigos + o novo
        // setHistorico([novaEntrada]);
        setHistorico([...historico, novaEntrada]);
    }
    };




    return (
        <div className={styles.container}>

            <h1>Exemplo 5 - Formulário</h1>
            <h2>Login</h2>

            <form onSubmit={handleSubmit} className={styles.formulario}>
                <input
                    name="login"
                    type="text"
                    placeholder='usuário'
                    onChange={e => setLogin(e.target.value)}
                // value={formData.nome}
                // onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                />
                <input
                    name="senha"
                    type="password"
                    placeholder='senha'
                    onChange={e => setSenha(e.target.value)}
                // value={formData.nome}
                // onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                />
                <button type="submit">Acessar sistema</button>
            </form>

            <div className={styles.historico}>
                <h3>Histórico de Logins</h3>
                
                {
                    historico.map( item => 
                        <p key={item}>{item}</p>
                    )
                }

            </div>
        </div>
    );
}
>>>>>>> bbf20e35c82ebaa6085a68b84cba2d67c00b6d13
