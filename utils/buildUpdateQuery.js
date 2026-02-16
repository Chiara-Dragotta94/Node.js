/*
  Helper riutilizzabile per costruire in modo dinamico
  la query UPDATE con prepared statement.
  
  La uso per evitare di riscrivere in ogni controller
  la stessa logica con array di campi e valori.
  
  Parametri:
  - tabella: nome della tabella (es. 'users')
  - campi: oggetto { colonna: valore } - se il valore è undefined il campo viene ignorato
  - where: stringa con la clausola WHERE (es. 'WHERE id = ?')
  - whereParams: array di parametri per la WHERE
*/
const buildUpdateQuery = (tabella, campi, where, whereParams = []) => {
  const setParts = [];
  const valori = [];

  // Costruisco la parte SET solo per i campi che hanno un valore definito
  for (const [colonna, valore] of Object.entries(campi)) {
    if (valore !== undefined) {
      setParts.push(`${colonna} = ?`);
      valori.push(valore);
    }
  }

  // Se non ho nulla da aggiornare restituisco null
  if (setParts.length === 0) {
    return null;
  }

  const sql = `UPDATE ${tabella} SET ${setParts.join(', ')} ${where}`;
  return {
    sql,
    values: [...valori, ...whereParams]
  };
};

module.exports = buildUpdateQuery;

