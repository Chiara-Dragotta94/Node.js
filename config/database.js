const mysql = require('mysql2/promise');

/*
  Configurazione del database MySQL.
  
  Utilizzo un pool di connessioni per gestire in modo efficiente
  le richieste concorrenti. Tutte le query passano attraverso
  prepared statement per prevenire attacchi SQL Injection.
*/

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'meditactive',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Verifico che la connessione al database funzioni
const testConnection = async () => {
  try {
    const connessione = await pool.getConnection();
    console.log('✅ Connessione a MySQL riuscita');
    connessione.release();
    return true;
  } catch (errore) {
    console.error('❌ Errore di connessione a MySQL:', errore.message);
    console.log('\n📋 Controlla di aver:');
    console.log('   1. Avviato MySQL (es. XAMPP)');
    console.log('   2. Creato il database "meditactive"');
    console.log('   3. Importato il file migrations.sql in phpMyAdmin');
    console.log('   4. Configurato correttamente il file .env\n');
    return false;
  }
};

// Eseguo una query con prepared statement e restituisco tutte le righe
const query = async (sql, parametri = []) => {
  const [righe] = await pool.execute(sql, parametri);
  return righe;
};

// Come query(), ma restituisco solo la prima riga (o null)
const queryOne = async (sql, parametri = []) => {
  const righe = await query(sql, parametri);
  return righe[0] || null;
};

// Eseguo un INSERT e restituisco l'id della riga creata
const insert = async (sql, parametri = []) => {
  const [risultato] = await pool.execute(sql, parametri);
  return risultato.insertId;
};

// Eseguo un UPDATE o DELETE e restituisco il numero di righe modificate
const execute = async (sql, parametri = []) => {
  const [risultato] = await pool.execute(sql, parametri);
  return risultato.affectedRows;
};

module.exports = {
  pool,
  testConnection,
  query,
  queryOne,
  insert,
  execute
};
