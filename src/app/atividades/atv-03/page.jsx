'use client'

import { useState } from 'react';

import Botao from './botao';

import styles from './page.module.css';

function Exemplo04() {

    const [txt, setTxt] = useState('');

    const cadastrar = () => setTxt('cadastrar');
    const editar = () => setTxt('editar');
    const listar = () => setTxt('listar');
    const excluir = () => setTxt('excluir');
    const cancelar = () => setTxt('cancelar');

    return (
        <div className={styles.container}>
            <h1>ATIVIDADE 03</h1>
            <h2>O valor atual é: {txt}</h2>
            <div>
            <Botao texto="Cadastrar" aoClicar={cadastrar} acao={'cadastrar'} />
            <Botao texto="Editar" aoClicar={editar} acao={'editar'} />
            <Botao texto="Listar" aoClicar={listar} acao={'listar'} />
            <Botao texto="Excluir" aoClicar={excluir} acao={'excluir'} />
            <Botao texto="cancelar" aoClicar={cancelar} acao={'cancelar'} />
            </div>
        </div>
    );
}

export default Exemplo04;