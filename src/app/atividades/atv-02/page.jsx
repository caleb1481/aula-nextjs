'use client'

import { useState } from "react";
import styles from "./page.module.css"; 
export default function Exemplo03() {  

    const [num, setNum] = useState(100);

    function handleIncrementa () {
        setNum(num + 1);
    }
    function handleDiminui () {
        setNum(num - 1);
    }

    return (
        <>
         <div className={styles.container}>
            <div className={styles.counter}>{`Contador: ${num}`}</div>
            <button className={styles.button} onClick={handleIncrementa}>+1</button>
            <button className={styles.button} onClick={handleDiminui}>-1</button>
        </div>
        </>
        
    );
}