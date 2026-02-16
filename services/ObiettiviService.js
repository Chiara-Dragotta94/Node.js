const db = require('../config/database');

/*
  Service layer per la logica di business complessa relativa agli obiettivi.
  
  Questo layer orchestra operazioni multiple che coinvolgono più tabelle
  e garantisce la coerenza dei dati. Il controller delega qui la logica
  e si limita a gestire la richiesta HTTP e la risposta.
  
  Vantaggi:
  - Logica testabile senza Express (posso testare il service direttamente)
  - Logica riusabile (posso chiamare il service da altri posti, es. job schedulati)
  - Separazione delle responsabilità: controller gestisce HTTP, service gestisce business
*/

/**
 * Completo un obiettivo associato a un intervallo.
 * 
 * Quello che faccio:
 * 1. Verifico che l'associazione esista e non sia già completata
 * 2. Aggiorno lo stato di completamento nell'interval_goals
 * 3. Assegno le monete all'utente
 * 4. Restituisco i dati dell'obiettivo completato
 * 
 * Tutto avviene in una transazione: o tutto riesce o nulla viene applicato.
 * 
 * @param {number} intervalId - ID dell'intervallo
 * @param {number} goalId - ID dell'obiettivo
 * @returns {Promise<{coins_reward: number, user_id: number}>} Dati dell'obiettivo completato
 * @throws {Error} Con statusCode 404 se l'associazione non esiste
 * @throws {Error} Con statusCode 400 se l'obiettivo è già completato
 */
const completaObiettivo = async (intervalId, goalId) => {
  return await db.withTransaction(async (conn) => {
    // Recupero l'associazione con i dati necessari (user_id e coins_reward)
    const [righe] = await conn.execute(`
      SELECT ig.*, gi.user_id, g.coins_reward
      FROM interval_goals ig
      JOIN goal_intervals gi ON ig.interval_id = gi.id
      JOIN goals g ON ig.goal_id = g.id
      WHERE ig.interval_id = ? AND ig.goal_id = ?
    `, [intervalId, goalId]);
    
    if (righe.length === 0) {
      const err = new Error('Associazione non trovata');
      err.statusCode = 404;
      throw err;
    }
    
    const row = righe[0];
    
    if (row.completed) {
      const err = new Error('Obiettivo già completato');
      err.statusCode = 400;
      throw err;
    }
    
    // Segno l'obiettivo come completato
    await conn.execute(
      'UPDATE interval_goals SET completed = 1, completed_at = NOW() WHERE interval_id = ? AND goal_id = ?',
      [intervalId, goalId]
    );
    
    // Aggiungo le monete all'utente
    await conn.execute(
      'UPDATE users SET coins = coins + ? WHERE id = ?',
      [row.coins_reward, row.user_id]
    );
    
    // Restituisco i dati che servono al controller per aggiornare la sessione
    return {
      coins_reward: row.coins_reward,
      user_id: row.user_id
    };
  });
};

module.exports = {
  completaObiettivo
};
