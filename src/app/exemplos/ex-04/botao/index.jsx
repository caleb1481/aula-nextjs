import styles from './index.module.css';

function Botao({ texto, aoClicar, acao }) {
    return (
        <button
            className={`${styles.botao} ${acao === '+' ? styles.mais : styles.menos}`}
            // className={styles.botao + ' ' + acao === '+' ? styles.mais : styles.menos}
            onClick={aoClicar}
        >
            {texto}
        </button>
    );
}

export default Botao;