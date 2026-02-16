const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { verificaLogin, reindirizzaSeLoggato } = require('../middleware/autenticazione');
const auth = require('../controllers/gestoreAutenticazione');

/*
  Rotte delle pagine (viste).
  Definisco solo gli endpoint e delego la logica ai controller.
*/

router.get('/', (req, res) => {
  res.render('home', { title: 'MeditActive - Trova il tuo equilibrio' });
});

router.get('/registrazione', reindirizzaSeLoggato, auth.mostraRegistrazione);
router.post('/registrazione', reindirizzaSeLoggato, auth.registra);

router.get('/accesso', reindirizzaSeLoggato, auth.mostraAccesso);
router.post('/accesso', reindirizzaSeLoggato, auth.accedi);

router.get('/logout', auth.logout);

// --- Dashboard (Pannello) ---

router.get('/pannello', verificaLogin, async (req, res) => {
  try {
    const idUtente = req.session.user.id;
    
    const statistiche = await db.queryOne(`
      SELECT COUNT(*) as total_sessions, COALESCE(SUM(duration_minutes), 0) as total_minutes
      FROM meditation_sessions WHERE user_id = ?
    `, [idUtente]);
    
    // Recupero gli intervalli attivi oggi
    const intervalli = await db.query(`
      SELECT gi.*,
        (SELECT COUNT(*) FROM interval_goals ig WHERE ig.interval_id = gi.id) as total_goals,
        (SELECT COUNT(*) FROM interval_goals ig WHERE ig.interval_id = gi.id AND ig.completed = 1) as completed_goals
      FROM goal_intervals gi
      WHERE gi.user_id = ? AND gi.start_date <= CURDATE() AND gi.end_date >= CURDATE()
      ORDER BY gi.interval_type
    `, [idUtente]);
    
    const ultimeDiario = await db.query(
      'SELECT * FROM diary_entries WHERE user_id = ? ORDER BY created_at DESC LIMIT 3', [idUtente]
    );
    
    res.render('pannello', { title: 'Dashboard - MeditActive', stats: statistiche, intervals: intervalli, recentDiary: ultimeDiario });
  } catch (errore) {
    console.error('Errore dashboard:', errore);
    req.flash('error_msg', 'Errore nel caricamento della dashboard');
    res.redirect('/');
  }
});

// --- Timer meditazione ---

router.get('/timer', verificaLogin, (req, res) => {
  res.render('timer', { title: 'Timer Meditazione - MeditActive' });
});

// --- Obiettivi ---

router.get('/obiettivi', verificaLogin, async (req, res) => {
  try {
    const tuttiGliObiettivi = await db.query('SELECT * FROM goals ORDER BY category, name');
    
    const obiettivi = {
      daily: tuttiGliObiettivi.filter(o => o.category === 'daily'),
      monthly: tuttiGliObiettivi.filter(o => o.category === 'monthly'),
      yearly: tuttiGliObiettivi.filter(o => o.category === 'yearly')
    };
    
    const intervalli = await db.query(`
      SELECT gi.*, (SELECT GROUP_CONCAT(goal_id) FROM interval_goals WHERE interval_id = gi.id) as goal_ids
      FROM goal_intervals gi WHERE gi.user_id = ? ORDER BY gi.start_date DESC
    `, [req.session.user.id]);
    
    res.render('obiettivi', { title: 'Obiettivi - MeditActive', goals: obiettivi, intervals: intervalli });
  } catch (errore) {
    console.error('Errore pagina obiettivi:', errore);
    req.flash('error_msg', 'Errore nel caricamento degli obiettivi');
    res.redirect('/pannello');
  }
});

// --- Abitudini (habit tracker) ---

router.get('/abitudini', verificaLogin, async (req, res) => {
  try {
    const idUtente = req.session.user.id;
    
    const utente = await db.queryOne(
      'SELECT preferred_meditation_time, daily_goal_minutes, reminder_enabled, theme FROM users WHERE id = ?',
      [idUtente]
    );
    const preferenze = {
      preferred_meditation_time: utente?.preferred_meditation_time,
      daily_goal_minutes: utente?.daily_goal_minutes || 10,
      reminder_enabled: utente?.reminder_enabled,
      theme: utente?.theme || 'light'
    };
    
    // Recupero gli intervalli con i conteggi di completamento
    const listaIntervalli = await db.query(`
      SELECT gi.*,
        (SELECT COUNT(*) FROM interval_goals ig WHERE ig.interval_id = gi.id) as total_goals,
        (SELECT COUNT(*) FROM interval_goals ig WHERE ig.interval_id = gi.id AND ig.completed = 1) as completed_goals
      FROM goal_intervals gi WHERE gi.user_id = ? ORDER BY gi.start_date DESC
    `, [idUtente]);

    // Evito l'N+1: recupero tutti gli obiettivi degli intervalli in un'unica query
    const idsIntervalli = listaIntervalli.map(i => i.id);
    let mappaObiettiviPerIntervallo = {};

    if (idsIntervalli.length > 0) {
      const placeholders = idsIntervalli.map(() => '?').join(',');
      const righe = await db.query(`
        SELECT g.*, ig.interval_id, ig.completed, ig.completed_at
        FROM interval_goals ig
        JOIN goals g ON ig.goal_id = g.id
        WHERE ig.interval_id IN (${placeholders})
      `, idsIntervalli);

      // Inizializzo la mappa con tutti gli intervalli
      mappaObiettiviPerIntervallo = {};
      for (const id of idsIntervalli) {
        mappaObiettiviPerIntervallo[id] = [];
      }

      // Raggruppo gli obiettivi per interval_id
      for (const riga of righe) {
        const { interval_id, ...goal } = riga;
        if (!mappaObiettiviPerIntervallo[interval_id]) {
          mappaObiettiviPerIntervallo[interval_id] = [];
        }
        mappaObiettiviPerIntervallo[interval_id].push(goal);
      }
    }

    const intervalli = listaIntervalli.map(intervallo => ({
      ...intervallo,
      goals: mappaObiettiviPerIntervallo[intervallo.id] || []
    }));

    res.render('abitudini', { title: 'Abitudini - MeditActive', preferences: preferenze, intervals: intervalli });
  } catch (errore) {
    console.error('Errore pagina abitudini:', errore);
    req.flash('error_msg', 'Errore nel caricamento delle abitudini');
    res.redirect('/pannello');
  }
});

// --- Ricompense ---

router.get('/ricompense', verificaLogin, async (req, res) => {
  try {
    const idUtente = req.session.user.id;
    
    const utente = await db.queryOne('SELECT coins FROM users WHERE id = ?', [idUtente]);
    
    const alberiPiantati = await db.queryOne(
      "SELECT COUNT(*) as trees_planted FROM donations WHERE user_id = ? AND type = 'tree'", [idUtente]
    );
    const totaleDonato = await db.queryOne(
      "SELECT COALESCE(SUM(coins_spent), 0) as total_donated FROM donations WHERE user_id = ? AND type = 'donation'", [idUtente]
    );
    
    const donazioni = await db.query(
      'SELECT * FROM donations WHERE user_id = ? ORDER BY created_at DESC LIMIT 10', [idUtente]
    );
    
    // Progetti disponibili
    const progetti = [
      { id: 1, name: 'Riforestazione Amazzonia', type: 'tree', cost: 50, description: 'Pianta un albero nella foresta amazzonica' },
      { id: 2, name: 'Riforestazione Italia', type: 'tree', cost: 30, description: 'Pianta un albero nelle foreste italiane' },
      { id: 3, name: 'Oceani Puliti', type: 'donation', cost: 100, description: 'Supporta la pulizia degli oceani' },
      { id: 4, name: 'Energia Rinnovabile', type: 'donation', cost: 150, description: 'Finanzia progetti di energia pulita' },
      { id: 5, name: 'Acqua Potabile', type: 'donation', cost: 80, description: 'Porta acqua potabile in comunità bisognose' }
    ];
    
    res.render('ricompense', {
      title: 'Ricompense - MeditActive',
      coins: utente.coins,
      stats: { trees_planted: alberiPiantati?.trees_planted || 0, total_donated: totaleDonato?.total_donated || 0 },
      donations: donazioni,
      projects: progetti
    });
  } catch (errore) {
    console.error('Errore pagina ricompense:', errore);
    req.flash('error_msg', 'Errore nel caricamento delle ricompense');
    res.redirect('/pannello');
  }
});

// --- Diario ---

router.get('/diario', verificaLogin, async (req, res) => {
  try {
    const voci = await db.query(
      'SELECT * FROM diary_entries WHERE user_id = ? ORDER BY created_at DESC',
      [req.session.user.id]
    );
    res.render('diario', { title: 'Diario - MeditActive', entries: voci });
  } catch (errore) {
    console.error('Errore pagina diario:', errore);
    req.flash('error_msg', 'Errore nel caricamento del diario');
    res.redirect('/pannello');
  }
});

// --- Profilo ---

router.get('/profilo', verificaLogin, async (req, res) => {
  try {
    const idUtente = req.session.user.id;
    
    const profilo = await db.queryOne(`
      SELECT id, email, nome, cognome, coins, created_at,
        preferred_meditation_time, daily_goal_minutes, reminder_enabled, theme
      FROM users WHERE id = ?
    `, [idUtente]);
    
    const sessioni = await db.queryOne(`
      SELECT COUNT(*) as total_sessions, COALESCE(SUM(duration_minutes), 0) as total_minutes
      FROM meditation_sessions WHERE user_id = ?
    `, [idUtente]);
    
    const vociDiario = await db.queryOne('SELECT COUNT(*) as count FROM diary_entries WHERE user_id = ?', [idUtente]);
    
    const obiettiviCompletati = await db.queryOne(`
      SELECT COUNT(*) as count FROM interval_goals ig
      JOIN goal_intervals gi ON ig.interval_id = gi.id
      WHERE gi.user_id = ? AND ig.completed = 1
    `, [idUtente]);
    
    const statistiche = {
      total_sessions: sessioni?.total_sessions || 0,
      total_minutes: sessioni?.total_minutes || 0,
      diary_entries: vociDiario?.count || 0,
      goals_completed: obiettiviCompletati?.count || 0
    };
    
    const preferenze = {
      preferred_meditation_time: profilo?.preferred_meditation_time,
      daily_goal_minutes: profilo?.daily_goal_minutes || 10,
      reminder_enabled: profilo?.reminder_enabled,
      theme: profilo?.theme || 'light'
    };
    
    res.render('profilo', { title: 'Profilo - MeditActive', profile: profilo, preferences: preferenze, stats: statistiche });
  } catch (errore) {
    console.error('Errore pagina profilo:', errore);
    req.flash('error_msg', 'Errore nel caricamento del profilo');
    res.redirect('/pannello');
  }
});

router.post('/profilo', verificaLogin, auth.aggiornaProfilo);
router.post('/preferenze', verificaLogin, auth.aggiornaPreferenze);

module.exports = router;
