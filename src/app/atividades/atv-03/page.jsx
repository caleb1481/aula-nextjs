'use client'

import { useState } from 'react';

import Botao from './botao';

import styles from './page.module.css';

function Exemplo04() {

    const [txt, setTxt] = useState();

    const cadastrar = () => setTxt(txt = "cadastrar");
    const editar = () => setTxt(txt = "editar");

    return (
        <div className={styles.container}>
            <h1>ATIVIDADE 03</h1>
            <h2>O valor atual é: {txt}</h2>

            {/* Passando funções e textos via Props para o componente Botao */}
            <Botao texto="Cadastrar" aoClicar={cadastrar} acao={'cadastrar'} />
            <Botao texto="Editar" aoClicar={editar} acao={'editar'} />
        </div>
    );
}

export default Exemplo04;