export function Seletores() {
    const [genero, setGenero] = useState("M");
    const [termos, setTermos] = useState(false);

    return (
        <div>
            <p>Gênero:</p>
            <input type="radio" name="gen" value="M" checked={genero === "M"} onChange={() => setGenero("M")} /> Masculino
            <input type="radio" name="gen" value="F" checked={genero === "F"} onChange={() => setGenero("F")} /> Feminino

            <div style={{ marginTop: '10px' }}>
                <input type="checkbox" checked={termos} onChange={(e) => setTermos(e.target.checked)} />
                <label> Aceito os termos de uso</label>
            </div>
        </div>
    );
}