import Link from 'next/link';

import styles from "./page.module.css"; 

function Home() {
  return (
    <div className={styles.containerHome} > 
      <div className={styles.containerListas}>
        <h1>Exemplos</h1>
        <Link href="/exemplos/ex-01">Exemplo 1</Link>
        <Link href="/exemplos/ex-02">Exemplo 2</Link>        
        <Link href="/exemplos/ex-03">Exemplo 3</Link>   
        <Link href="/exemplos/ex-04">Exemplo 4</Link>     
      </div>

      <div className={styles.containerListas}>
        <h1>Atividades</h1>
        <Link href="/atividades/atv-01">Atividade 1</Link>
        <Link href="/atividades/atv-02">Atividade 2</Link>
        <Link href="/atividades/atv-03">Atividade 3</Link>
        <Link href="/atividades/atv-04">Atividade 4</Link>
<<<<<<< HEAD
=======
        <Link href="/atividades/atv-05">Atividade 5</Link>

>>>>>>> bbf20e35c82ebaa6085a68b84cba2d67c00b6d13
      </div>

    </div>
  );
}

export default Home;
