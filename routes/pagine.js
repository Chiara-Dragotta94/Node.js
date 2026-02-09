const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { verificaLogin, reindirizzaSeLoggato } = require('../middleware/autenticazione');

/*
  Rotte delle pagine (viste).
  Qui gestisco il rendering di tutte le pagine dell'applicazione,
  la registrazione e il login tramite form.
  Ogni query al database usa prepared statement per la sicurezza.
*/

// --- Pagine pubbliche ---

router.get('/', (req, res) => {
  res.render('home', { title: 'MeditActive - Trova il tuo equilibrio' });
});

// --- Registrazione ---

router.get('/registrazione', reindirizzaSeLoggato, (req, res) => {
  res.render('registrazione', { title: 'Registrati - MeditActive' });
});

router.post('/registrazione', reindirizzaSeLoggato, async (req, res) => {
  try {
    const { email, password, confirmPassword, nome, cognome } = req.body;
    
    const errori = [];
    if (!email || !password || !nome || !cognome) errori.push('Tutti i campi sono obbligatori');
    if (password !== confirmPassword) errori.push('Le password non coincidono');
    if (password && password.length < 6) errori.push('La password deve essere di almeno 6 caratteri');
    
    const emailEsistente = await db.queryOne('SELECT id FROM users WHERE email = ?', [email]);
    if (emailEsistente) errori.push('Email già registrata');
    
    if (errori.length > 0) {
      return res.render('registrazione', { title: 'Registrati - MeditActive', errors: errori, email, nome, cognome });
    }
    
    // Cifro la password e creo l'utente
    const passwordCifrata = await bcrypt.hash(password, 10);
    const idUtente = await db.insert(
      'INSERT INTO users (email, password, nome, cognome) VALUES (?, ?, ?, ?)',
      [email, passwordCifrata, nome, cognome]
    );
    
    // Login automatico dopo la registrazione
    const utente = await db.queryOne(
      'SELECT id, email, nome, cognome, coins FROM users WHERE id = ?', [idUtente]
    );
    req.session.user = utente;
    
    req.flash('success_msg', 'Registrazione completata! Benvenuto/a in MeditActive');
    res.redirect('/pannello');
  } catch (errore) {
    console.error('Errore registrazione:', errore);
    res.render('registrazione', { 
      title: 'Registrati - MeditActive',
      errors: ['Errore durante la registrazione'], 
      email: req.body.email, nome: req.body.nome, cognome: req.body.cognome 
    });
  }
});

// --- Login ---

router.get('/accesso', reindirizzaSeLoggato, (req, res) => {
  res.render('accesso', { title: 'Accedi - MeditActive' });
});

router.post('/accesso', reindirizzaSeLoggato, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.render('accesso', { title: 'Accedi - MeditActive', error: 'Email e password sono obbligatori', email });
    }
    
    const utente = await db.queryOne('SELECT * FROM users WHERE email = ?', [email]);
    
    if (!utente || !(await bcrypt.compare(password, utente.password))) {
      return res.render('accesso', { title: 'Accedi - MeditActive', error: 'Email o password non validi', email });
    }
    
    req.session.user = {
      id: utente.id, email: utente.email, nome: utente.nome, cognome: utente.cognome, coins: utente.coins
    };
    
    req.flash('success_msg', `Bentornato/a, ${utente.nome}!`);
    res.redirect('/pannello');
  } catch (errore) {
    console.error('Errore login:', errore);
    res.render('accesso', { title: 'Accedi - MeditActive', error: 'Errore durante il login' });
  }
});

// --- Logout ---

router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

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
    
    // Per ogni intervallo, recupero anche gli obiettivi dettagliati
    const intervalli = [];
    for (const intervallo of listaIntervalli) {
      const obiettivi = await db.query(`
        SELECT g.*, ig.completed, ig.completed_at
        FROM interval_goals ig JOIN goals g ON ig.goal_id = g.id
        WHERE ig.interval_id = ?
      `, [intervallo.id]);
      intervalli.push({ ...intervallo, goals: obiettivi });
    }
    
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

// Aggiornamento profilo (POST dal form)
router.post('/profilo', verificaLogin, async (req, res) => {
  try {
    const idUtente = req.session.user.id;
    const { nome, cognome, email, password, newPassword } = req.body;
    
    if (newPassword) {
      const utente = await db.queryOne('SELECT password FROM users WHERE id = ?', [idUtente]);
      const passwordValida = await bcrypt.compare(password, utente.password);
      if (!passwordValida) {
        req.flash('error_msg', 'Password attuale non corretta');
        return res.redirect('/profilo');
      }
      const nuovaPasswordCifrata = await bcrypt.hash(newPassword, 10);
      await db.execute('UPDATE users SET password = ? WHERE id = ?', [nuovaPasswordCifrata, idUtente]);
    }
    
    await db.execute('UPDATE users SET nome = ?, cognome = ?, email = ? WHERE id = ?', [nome, cognome, email, idUtente]);
    
    req.session.user.nome = nome;
    req.session.user.cognome = cognome;
    req.session.user.email = email;
    
    req.flash('success_msg', 'Profilo aggiornato con successo');
    res.redirect('/profilo');
  } catch (errore) {
    console.error('Errore aggiornamento profilo:', errore);
    req.flash('error_msg', 'Errore durante l\'aggiornamento');
    res.redirect('/profilo');
  }
});

// Aggiornamento preferenze
router.post('/preferenze', verificaLogin, async (req, res) => {
  try {
    const { preferred_meditation_time, daily_goal_minutes, reminder_enabled, theme } = req.body;
    
    await db.execute(
      'UPDATE users SET preferred_meditation_time = ?, daily_goal_minutes = ?, reminder_enabled = ?, theme = ? WHERE id = ?',
      [preferred_meditation_time || null, daily_goal_minutes || 10, reminder_enabled ? 1 : 0, theme || 'light', req.session.user.id]
    );
    
    req.flash('success_msg', 'Preferenze aggiornate');
    res.redirect('/profilo');
  } catch (errore) {
    console.error('Errore preferenze:', errore);
    req.flash('error_msg', 'Errore durante l\'aggiornamento');
    res.redirect('/profilo');
  }
});

module.exports = router;
