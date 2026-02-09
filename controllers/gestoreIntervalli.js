const db = require('../config/database');

/*
  Gestore degli intervalli di obiettivi.
  Qui gestisco i periodi temporali (giornaliero, mensile, annuale) 
  a cui l'utente associa i propri obiettivi da completare.
*/

// Restituisco tutti gli intervalli, con diversi filtri opzionali via query string
const ottieniTutti = async (req, res) => {
  try {
    const { user_id, start_date, end_date, goal_id, interval_type } = req.query;
    
    // Se filtro per obiettivo, devo fare un JOIN con la tabella di associazione
    let sql;
    if (goal_id) {
      sql = `
        SELECT DISTINCT gi.*, CONCAT(u.nome, ' ', u.cognome) as user_name, u.email as user_email
        FROM goal_intervals gi
        JOIN users u ON gi.user_id = u.id
        JOIN interval_goals ig ON gi.id = ig.interval_id
        WHERE ig.goal_id = ?`;
    } else {
      sql = `
        SELECT DISTINCT gi.*, CONCAT(u.nome, ' ', u.cognome) as user_name, u.email as user_email
        FROM goal_intervals gi
        JOIN users u ON gi.user_id = u.id
        WHERE 1=1`;
    }
    
    const parametri = goal_id ? [goal_id] : [];
    
    if (user_id) { sql += ' AND gi.user_id = ?'; parametri.push(user_id); }
    if (start_date) { sql += ' AND gi.start_date >= ?'; parametri.push(start_date); }
    if (end_date) { sql += ' AND gi.end_date <= ?'; parametri.push(end_date); }
    if (interval_type && ['daily', 'monthly', 'yearly'].includes(interval_type)) {
      sql += ' AND gi.interval_type = ?'; parametri.push(interval_type);
    }
    
    sql += ' ORDER BY gi.start_date DESC';
    
    const intervalli = await db.query(sql, parametri);
    
    // Per ogni intervallo, recupero gli obiettivi associati
    for (let intervallo of intervalli) {
      intervallo.goals = await db.query(`
        SELECT g.*, ig.completed, ig.completed_at
        FROM interval_goals ig
        JOIN goals g ON ig.goal_id = g.id
        WHERE ig.interval_id = ?
      `, [intervallo.id]);
    }
    
    res.json(intervalli);
  } catch (errore) {
    console.error('Errore recupero intervalli:', errore);
    res.status(500).json({ error: 'Errore nel recupero degli intervalli' });
  }
};

// Restituisco un singolo intervallo con i suoi obiettivi
const ottieniPerId = async (req, res) => {
  try {
    const intervallo = await db.queryOne(`
      SELECT gi.*, CONCAT(u.nome, ' ', u.cognome) as user_name, u.email as user_email
      FROM goal_intervals gi
      JOIN users u ON gi.user_id = u.id
      WHERE gi.id = ?
    `, [req.params.id]);
    
    if (!intervallo) {
      return res.status(404).json({ error: 'Intervallo non trovato' });
    }
    
    intervallo.goals = await db.query(`
      SELECT g.*, ig.completed, ig.completed_at
      FROM interval_goals ig JOIN goals g ON ig.goal_id = g.id
      WHERE ig.interval_id = ?
    `, [req.params.id]);
    
    res.json(intervallo);
  } catch (errore) {
    console.error('Errore recupero intervallo:', errore);
    res.status(500).json({ error: 'Errore nel recupero dell\'intervallo' });
  }
};

// Creo un nuovo intervallo e, se indicati, associo subito degli obiettivi
const crea = async (req, res) => {
  try {
    const { user_id, start_date, end_date, interval_type, goal_ids } = req.body;
    
    if (!user_id || !start_date || !end_date || !interval_type) {
      return res.status(400).json({ error: 'user_id, start_date, end_date e interval_type sono obbligatori' });
    }
    if (!['daily', 'monthly', 'yearly'].includes(interval_type)) {
      return res.status(400).json({ error: 'interval_type non valido. Usa: daily, monthly, yearly' });
    }
    
    // Verifico che l'utente esista
    const utente = await db.queryOne('SELECT id FROM users WHERE id = ?', [user_id]);
    if (!utente) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }
    
    if (new Date(start_date) > new Date(end_date)) {
      return res.status(400).json({ error: 'La data di inizio deve essere precedente alla data di fine' });
    }
    
    const idIntervallo = await db.insert(
      'INSERT INTO goal_intervals (user_id, start_date, end_date, interval_type) VALUES (?, ?, ?, ?)',
      [user_id, start_date, end_date, interval_type]
    );
    
    // Se ho ricevuto una lista di obiettivi, li associo all'intervallo
    if (goal_ids && Array.isArray(goal_ids) && goal_ids.length > 0) {
      for (const idObiettivo of goal_ids) {
        const esiste = await db.queryOne('SELECT id FROM goals WHERE id = ?', [idObiettivo]);
        if (esiste) {
          await db.insert(
            'INSERT IGNORE INTO interval_goals (interval_id, goal_id) VALUES (?, ?)',
            [idIntervallo, idObiettivo]
          );
        }
      }
    }
    
    // Restituisco l'intervallo completo appena creato
    const nuovo = await db.queryOne(`
      SELECT gi.*, CONCAT(u.nome, ' ', u.cognome) as user_name
      FROM goal_intervals gi JOIN users u ON gi.user_id = u.id
      WHERE gi.id = ?
    `, [idIntervallo]);
    
    nuovo.goals = await db.query(`
      SELECT g.*, ig.completed
      FROM interval_goals ig JOIN goals g ON ig.goal_id = g.id
      WHERE ig.interval_id = ?
    `, [idIntervallo]);
    
    res.status(201).json(nuovo);
  } catch (errore) {
    console.error('Errore creazione intervallo:', errore);
    res.status(500).json({ error: 'Errore nella creazione dell\'intervallo' });
  }
};

// Aggiorno le date o il tipo di un intervallo
const aggiorna = async (req, res) => {
  try {
    const { start_date, end_date, interval_type } = req.body;
    const idIntervallo = req.params.id;
    
    const intervallo = await db.queryOne('SELECT id FROM goal_intervals WHERE id = ?', [idIntervallo]);
    if (!intervallo) {
      return res.status(404).json({ error: 'Intervallo non trovato' });
    }
    if (interval_type && !['daily', 'monthly', 'yearly'].includes(interval_type)) {
      return res.status(400).json({ error: 'interval_type non valido' });
    }
    
    const campi = [];
    const valori = [];
    if (start_date) { campi.push('start_date = ?'); valori.push(start_date); }
    if (end_date) { campi.push('end_date = ?'); valori.push(end_date); }
    if (interval_type) { campi.push('interval_type = ?'); valori.push(interval_type); }
    
    if (campi.length === 0) {
      return res.status(400).json({ error: 'Nessun campo da aggiornare' });
    }
    
    valori.push(idIntervallo);
    await db.execute(`UPDATE goal_intervals SET ${campi.join(', ')} WHERE id = ?`, valori);
    
    const aggiornato = await db.queryOne(`
      SELECT gi.*, CONCAT(u.nome, ' ', u.cognome) as user_name
      FROM goal_intervals gi JOIN users u ON gi.user_id = u.id WHERE gi.id = ?
    `, [idIntervallo]);
    
    res.json(aggiornato);
  } catch (errore) {
    console.error('Errore aggiornamento intervallo:', errore);
    res.status(500).json({ error: 'Errore nell\'aggiornamento dell\'intervallo' });
  }
};

// Elimino un intervallo (il CASCADE rimuove anche le associazioni)
const elimina = async (req, res) => {
  try {
    const righe = await db.execute('DELETE FROM goal_intervals WHERE id = ?', [req.params.id]);
    if (righe === 0) {
      return res.status(404).json({ error: 'Intervallo non trovato' });
    }
    res.status(204).send();
  } catch (errore) {
    console.error('Errore eliminazione intervallo:', errore);
    res.status(500).json({ error: 'Errore nella cancellazione dell\'intervallo' });
  }
};

// Associo un obiettivo a un intervallo
const aggiungiObiettivo = async (req, res) => {
  try {
    const idIntervallo = req.params.id;
    const { goal_id } = req.body;
    
    if (!goal_id) {
      return res.status(400).json({ error: 'goal_id è obbligatorio' });
    }
    
    const intervallo = await db.queryOne('SELECT id FROM goal_intervals WHERE id = ?', [idIntervallo]);
    if (!intervallo) return res.status(404).json({ error: 'Intervallo non trovato' });
    
    const obiettivo = await db.queryOne('SELECT id FROM goals WHERE id = ?', [goal_id]);
    if (!obiettivo) return res.status(404).json({ error: 'Obiettivo non trovato' });
    
    // Controllo che non sia già associato
    const giaAssociato = await db.queryOne(
      'SELECT id FROM interval_goals WHERE interval_id = ? AND goal_id = ?',
      [idIntervallo, goal_id]
    );
    if (giaAssociato) {
      return res.status(409).json({ error: 'Obiettivo già associato a questo intervallo' });
    }
    
    await db.insert(
      'INSERT INTO interval_goals (interval_id, goal_id) VALUES (?, ?)',
      [idIntervallo, goal_id]
    );
    res.status(201).json({ message: 'Obiettivo associato con successo' });
  } catch (errore) {
    console.error('Errore associazione obiettivo:', errore);
    res.status(500).json({ error: 'Errore nell\'associazione dell\'obiettivo' });
  }
};

// Rimuovo un obiettivo da un intervallo
const rimuoviObiettivo = async (req, res) => {
  try {
    const righe = await db.execute(
      'DELETE FROM interval_goals WHERE interval_id = ? AND goal_id = ?',
      [req.params.id, req.params.goalId]
    );
    if (righe === 0) {
      return res.status(404).json({ error: 'Associazione non trovata' });
    }
    res.status(204).send();
  } catch (errore) {
    console.error('Errore rimozione obiettivo:', errore);
    res.status(500).json({ error: 'Errore nella rimozione dell\'obiettivo' });
  }
};

// Segno un obiettivo come completato e assegno le monete all'utente
const completaObiettivo = async (req, res) => {
  try {
    const { id, goalId } = req.params;
    
    const associazione = await db.queryOne(`
      SELECT ig.*, gi.user_id, g.coins_reward
      FROM interval_goals ig
      JOIN goal_intervals gi ON ig.interval_id = gi.id
      JOIN goals g ON ig.goal_id = g.id
      WHERE ig.interval_id = ? AND ig.goal_id = ?
    `, [id, goalId]);
    
    if (!associazione) {
      return res.status(404).json({ error: 'Associazione non trovata' });
    }
    if (associazione.completed) {
      return res.status(400).json({ error: 'Obiettivo già completato' });
    }
    
    // Segno come completato
    await db.execute(
      'UPDATE interval_goals SET completed = 1, completed_at = NOW() WHERE interval_id = ? AND goal_id = ?',
      [id, goalId]
    );
    
    // Premio l'utente con le monete
    await db.execute(
      'UPDATE users SET coins = coins + ? WHERE id = ?',
      [associazione.coins_reward, associazione.user_id]
    );
    
    // Aggiorno la sessione se è l'utente corrente
    if (req.session?.user && req.session.user.id == associazione.user_id) {
      req.session.user.coins = (req.session.user.coins || 0) + associazione.coins_reward;
    }
    
    res.json({ message: 'Obiettivo completato!', coins_earned: associazione.coins_reward });
  } catch (errore) {
    console.error('Errore completamento obiettivo:', errore);
    res.status(500).json({ error: 'Errore nel completamento dell\'obiettivo' });
  }
};

// Restituisco tutti gli intervalli di un utente specifico
const ottieniPerUtente = async (req, res) => {
  try {
    const intervalli = await db.query(
      'SELECT * FROM goal_intervals WHERE user_id = ? ORDER BY start_date DESC',
      [req.params.userId]
    );
    
    for (let intervallo of intervalli) {
      intervallo.goals = await db.query(`
        SELECT g.*, ig.completed, ig.completed_at
        FROM interval_goals ig JOIN goals g ON ig.goal_id = g.id
        WHERE ig.interval_id = ?
      `, [intervallo.id]);
    }
    
    res.json(intervalli);
  } catch (errore) {
    console.error('Errore recupero intervalli utente:', errore);
    res.status(500).json({ error: 'Errore nel recupero degli intervalli' });
  }
};

module.exports = {
  ottieniTutti,
  ottieniPerId,
  crea,
  aggiorna,
  elimina,
  aggiungiObiettivo,
  rimuoviObiettivo,
  completaObiettivo,
  ottieniPerUtente
};
