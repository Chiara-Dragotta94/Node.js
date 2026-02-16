const db = require('../config/database');
const { TIPI_INTERVALLO } = require('../constants/costanti');
const buildUpdateQuery = require('../utils/buildUpdateQuery');
const obiettiviService = require('../services/ObiettiviService');

/*
  Gestore degli intervalli di obiettivi.
  Uso una sola query per recuperare gli obiettivi di più intervalli
  invece di una query per intervallo (N+1).
*/

// Recupero gli obiettivi per una lista di intervalli in una sola query; restituisco una mappa idIntervallo -> goals
const _obiettiviPerIntervalli = async (idsIntervalli) => {
  if (!idsIntervalli.length) return {};
  const placeholders = idsIntervalli.map(() => '?').join(',');
  const righe = await db.query(`
    SELECT g.*, ig.interval_id, ig.completed, ig.completed_at
    FROM interval_goals ig
    JOIN goals g ON ig.goal_id = g.id
    WHERE ig.interval_id IN (${placeholders})
  `, idsIntervalli);
  const mappa = {};
  for (const id of idsIntervalli) mappa[id] = [];
  for (const r of righe) {
    const { interval_id, ...goal } = r;
    mappa[interval_id].push(goal);
  }
  return mappa;
};

// Restituisco tutti gli intervalli, con diversi filtri opzionali via query string
const ottieniTutti = async (req, res) => {
  try {
    const { user_id, start_date, end_date, goal_id, interval_type } = req.query;
    
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
    if (interval_type && TIPI_INTERVALLO.includes(interval_type)) {
      sql += ' AND gi.interval_type = ?'; parametri.push(interval_type);
    }
    sql += ' ORDER BY gi.start_date DESC';
    
    const intervalli = await db.query(sql, parametri);
    const ids = intervalli.map((i) => i.id);
    const obiettiviPerId = await _obiettiviPerIntervalli(ids);
    for (const intervallo of intervalli) {
      intervallo.goals = obiettiviPerId[intervallo.id] || [];
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
    
    if (!intervallo) return res.status(404).json({ error: 'Intervallo non trovato' });
    
    const obiettiviMap = await _obiettiviPerIntervalli([intervallo.id]);
    intervallo.goals = obiettiviMap[intervallo.id] || [];
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
    if (!TIPI_INTERVALLO.includes(interval_type)) {
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
    
    const nuovo = await db.queryOne(`
      SELECT gi.*, CONCAT(u.nome, ' ', u.cognome) as user_name
      FROM goal_intervals gi JOIN users u ON gi.user_id = u.id
      WHERE gi.id = ?
    `, [idIntervallo]);
    const obiettiviMap = await _obiettiviPerIntervalli([idIntervallo]);
    nuovo.goals = obiettiviMap[idIntervallo] || [];
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
    if (interval_type && !TIPI_INTERVALLO.includes(interval_type)) {
      return res.status(400).json({ error: 'interval_type non valido' });
    }
    
    const datiAggiornati = {};
    if (start_date) datiAggiornati.start_date = start_date;
    if (end_date) datiAggiornati.end_date = end_date;
    if (interval_type) datiAggiornati.interval_type = interval_type;

    const update = buildUpdateQuery('goal_intervals', datiAggiornati, 'WHERE id = ?', [idIntervallo]);
    if (!update) {
      return res.status(400).json({ error: 'Nessun campo da aggiornare' });
    }
    await db.execute(update.sql, update.values);
    
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

// Segno un obiettivo come completato e assegno le monete
// Delego tutta la logica di business al service layer
const completaObiettivo = async (req, res) => {
  try {
    const { id, goalId } = req.params;
    
    // Il service orchestra tutte le operazioni: verifica, aggiornamento, assegnazione monete
    const risultato = await obiettiviService.completaObiettivo(parseInt(id), parseInt(goalId));
    
    // Aggiorno la sessione se l'utente loggato è quello che ha completato l'obiettivo
    if (req.session?.user && req.session.user.id == risultato.user_id) {
      req.session.user.coins = (req.session.user.coins || 0) + risultato.coins_reward;
    }
    
    res.json({ message: 'Obiettivo completato!', coins_earned: risultato.coins_reward });
  } catch (errore) {
    if (errore.statusCode === 404) {
      return res.status(404).json({ error: errore.message });
    }
    if (errore.statusCode === 400) {
      return res.status(400).json({ error: errore.message });
    }
    console.error('Errore completamento obiettivo:', errore);
    res.status(500).json({ error: 'Errore nel completamento dell\'obiettivo' });
  }
};

// Restituisco tutti gli intervalli di un utente (una query per intervalli, una per tutti gli obiettivi)
const ottieniPerUtente = async (req, res) => {
  try {
    const intervalli = await db.query(
      'SELECT * FROM goal_intervals WHERE user_id = ? ORDER BY start_date DESC',
      [req.params.userId]
    );
    const ids = intervalli.map((i) => i.id);
    const obiettiviPerId = await _obiettiviPerIntervalli(ids);
    for (const intervallo of intervalli) {
      intervallo.goals = obiettiviPerId[intervallo.id] || [];
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
