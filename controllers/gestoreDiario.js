const db = require('../config/database');

/*
  Gestore del diario, delle sessioni di meditazione e delle donazioni.
  Qui mi occupo di tutto ciò che riguarda l'attività personale 
  dell'utente: voci di diario, timer completati e ricompense donate.
*/

// Restituisco tutte le voci del diario dell'utente
const ottieniVociDiario = async (req, res) => {
  try {
    const idUtente = req.session?.user?.id || req.params.userId;
    if (!idUtente) return res.status(401).json({ error: 'Non autorizzato' });
    
    const voci = await db.query(
      'SELECT * FROM diary_entries WHERE user_id = ? ORDER BY created_at DESC',
      [idUtente]
    );
    res.json(voci);
  } catch (errore) {
    console.error('Errore recupero diario:', errore);
    res.status(500).json({ error: 'Errore nel recupero delle voci del diario' });
  }
};

// Restituisco una singola voce del diario (solo se appartiene all'utente)
const ottieniVoce = async (req, res) => {
  try {
    const idUtente = req.session?.user?.id;
    const voce = await db.queryOne(
      'SELECT * FROM diary_entries WHERE id = ? AND user_id = ?',
      [req.params.id, idUtente]
    );
    if (!voce) return res.status(404).json({ error: 'Voce non trovata' });
    res.json(voce);
  } catch (errore) {
    console.error('Errore recupero voce:', errore);
    res.status(500).json({ error: 'Errore nel recupero della voce' });
  }
};

// Creo una nuova voce nel diario
const creaVoce = async (req, res) => {
  try {
    const idUtente = req.session?.user?.id;
    const { title, content, mood, meditation_minutes } = req.body;
    
    if (!idUtente) return res.status(401).json({ error: 'Non autorizzato' });
    if (!content) return res.status(400).json({ error: 'Il contenuto è obbligatorio' });
    
    const idVoce = await db.insert(
      'INSERT INTO diary_entries (user_id, title, content, mood, meditation_minutes) VALUES (?, ?, ?, ?, ?)',
      [idUtente, title || '', content, mood || null, meditation_minutes || 0]
    );
    
    const nuovaVoce = await db.queryOne('SELECT * FROM diary_entries WHERE id = ?', [idVoce]);
    res.status(201).json(nuovaVoce);
  } catch (errore) {
    console.error('Errore creazione voce:', errore);
    res.status(500).json({ error: 'Errore nella creazione della voce' });
  }
};

// Aggiorno una voce esistente del diario
const aggiornaVoce = async (req, res) => {
  try {
    const idUtente = req.session?.user?.id;
    const { title, content, mood, meditation_minutes } = req.body;
    const idVoce = req.params.id;
    
    // Verifico che la voce appartenga all'utente
    const voce = await db.queryOne(
      'SELECT id FROM diary_entries WHERE id = ? AND user_id = ?', [idVoce, idUtente]
    );
    if (!voce) return res.status(404).json({ error: 'Voce non trovata' });
    
    const campi = [];
    const valori = [];
    if (title !== undefined) { campi.push('title = ?'); valori.push(title); }
    if (content !== undefined) { campi.push('content = ?'); valori.push(content); }
    if (mood !== undefined) { campi.push('mood = ?'); valori.push(mood); }
    if (meditation_minutes !== undefined) { campi.push('meditation_minutes = ?'); valori.push(meditation_minutes); }
    
    if (campi.length === 0) {
      return res.status(400).json({ error: 'Nessun campo da aggiornare' });
    }
    
    valori.push(idVoce);
    await db.execute(`UPDATE diary_entries SET ${campi.join(', ')} WHERE id = ?`, valori);
    
    const aggiornata = await db.queryOne('SELECT * FROM diary_entries WHERE id = ?', [idVoce]);
    res.json(aggiornata);
  } catch (errore) {
    console.error('Errore aggiornamento voce:', errore);
    res.status(500).json({ error: 'Errore nell\'aggiornamento della voce' });
  }
};

// Elimino una voce dal diario (solo se appartiene all'utente)
const eliminaVoce = async (req, res) => {
  try {
    const idUtente = req.session?.user?.id;
    const righe = await db.execute(
      'DELETE FROM diary_entries WHERE id = ? AND user_id = ?',
      [req.params.id, idUtente]
    );
    if (righe === 0) return res.status(404).json({ error: 'Voce non trovata' });
    res.status(204).send();
  } catch (errore) {
    console.error('Errore eliminazione voce:', errore);
    res.status(500).json({ error: 'Errore nella cancellazione della voce' });
  }
};

// Salvo una sessione di meditazione completata e assegno le monete
const salvaSessione = async (req, res) => {
  try {
    const idUtente = req.session?.user?.id;
    const { duration_minutes } = req.body;
    
    if (!idUtente) return res.status(401).json({ error: 'Non autorizzato' });
    if (!duration_minutes || duration_minutes < 1) {
      return res.status(400).json({ error: 'Durata non valida' });
    }
    
    await db.insert(
      'INSERT INTO meditation_sessions (user_id, duration_minutes) VALUES (?, ?)',
      [idUtente, duration_minutes]
    );
    
    // Assegno 1 moneta per ogni minuto di meditazione
    const moneteGuadagnate = Math.floor(duration_minutes);
    await db.execute('UPDATE users SET coins = coins + ? WHERE id = ?', [moneteGuadagnate, idUtente]);
    
    // Aggiorno la sessione con le monete aggiornate
    const utente = await db.queryOne('SELECT coins FROM users WHERE id = ?', [idUtente]);
    if (req.session.user) req.session.user.coins = utente.coins;
    
    res.status(201).json({ 
      message: 'Sessione salvata!', 
      duration_minutes, 
      coins_earned: moneteGuadagnate 
    });
  } catch (errore) {
    console.error('Errore salvataggio sessione:', errore);
    res.status(500).json({ error: 'Errore nel salvataggio della sessione' });
  }
};

// Restituisco le statistiche sulle meditazioni dell'utente
const ottieniStatistiche = async (req, res) => {
  try {
    const idUtente = req.session?.user?.id || req.params.userId;
    if (!idUtente) return res.status(401).json({ error: 'Non autorizzato' });
    
    const statistiche = await db.queryOne(`
      SELECT COUNT(*) as total_sessions,
        COALESCE(SUM(duration_minutes), 0) as total_minutes,
        COALESCE(AVG(duration_minutes), 0) as avg_duration,
        COALESCE(MAX(duration_minutes), 0) as longest_session
      FROM meditation_sessions WHERE user_id = ?
    `, [idUtente]);
    
    // Sessioni degli ultimi 7 giorni
    const ultimeSessioni = await db.query(`
      SELECT DATE(completed_at) as date, SUM(duration_minutes) as minutes
      FROM meditation_sessions
      WHERE user_id = ? AND completed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(completed_at) ORDER BY date DESC
    `, [idUtente]);
    
    res.json({ ...statistiche, recent_sessions: ultimeSessioni });
  } catch (errore) {
    console.error('Errore statistiche:', errore);
    res.status(500).json({ error: 'Errore nel recupero delle statistiche' });
  }
};

// Creo una donazione: l'utente spende monete per piantare un albero o sostenere un progetto
const creaDonazione = async (req, res) => {
  try {
    const idUtente = req.session?.user?.id;
    const { type, coins_spent, project_name } = req.body;
    
    if (!idUtente) return res.status(401).json({ error: 'Non autorizzato' });
    if (!type || !coins_spent) return res.status(400).json({ error: 'Tipo e monete sono obbligatori' });
    if (!['tree', 'donation'].includes(type)) return res.status(400).json({ error: 'Tipo non valido' });
    
    // Verifico che l'utente abbia abbastanza monete
    const utente = await db.queryOne('SELECT coins FROM users WHERE id = ?', [idUtente]);
    if (utente.coins < coins_spent) {
      return res.status(400).json({ error: 'Monete insufficienti' });
    }
    
    // Sottraggo le monete e creo la donazione
    await db.execute('UPDATE users SET coins = coins - ? WHERE id = ?', [coins_spent, idUtente]);
    
    const idDonazione = await db.insert(
      'INSERT INTO donations (user_id, type, coins_spent, project_name) VALUES (?, ?, ?, ?)',
      [idUtente, type, coins_spent, project_name || null]
    );
    
    // Aggiorno le monete nella sessione
    const utenteAggiornato = await db.queryOne('SELECT coins FROM users WHERE id = ?', [idUtente]);
    if (req.session.user) req.session.user.coins = utenteAggiornato.coins;
    
    const donazione = await db.queryOne('SELECT * FROM donations WHERE id = ?', [idDonazione]);
    res.status(201).json(donazione);
  } catch (errore) {
    console.error('Errore donazione:', errore);
    res.status(500).json({ error: 'Errore nella creazione della donazione' });
  }
};

// Restituisco lo storico delle donazioni dell'utente con statistiche
const ottieniDonazioni = async (req, res) => {
  try {
    const idUtente = req.session?.user?.id || req.params.userId;
    if (!idUtente) return res.status(401).json({ error: 'Non autorizzato' });
    
    const donazioni = await db.query(
      'SELECT * FROM donations WHERE user_id = ? ORDER BY created_at DESC', [idUtente]
    );
    const statistiche = await db.query(`
      SELECT type, COUNT(*) as count, SUM(coins_spent) as total_coins
      FROM donations WHERE user_id = ? GROUP BY type
    `, [idUtente]);
    
    res.json({ donations: donazioni, stats: statistiche });
  } catch (errore) {
    console.error('Errore recupero donazioni:', errore);
    res.status(500).json({ error: 'Errore nel recupero delle donazioni' });
  }
};

module.exports = {
  ottieniVociDiario,
  ottieniVoce,
  creaVoce,
  aggiornaVoce,
  eliminaVoce,
  salvaSessione,
  ottieniStatistiche,
  creaDonazione,
  ottieniDonazioni
};
