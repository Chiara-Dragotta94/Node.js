const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const db = require('../config/database');
const { BCRYPT_ROUNDS, PASSWORD_MIN_LENGTH } = require('../constants/costanti');

/*
  Gestore dell'autenticazione via form (pagine web).
  Qui metto tutta la logica di registrazione, login e aggiornamento profilo
  così le rotte restano leggere e delegate a questo controller.
*/

// Mostro la pagina di registrazione
const mostraRegistrazione = (req, res) => {
  res.render('registrazione', { title: 'Registrati - MeditActive' });
};

// Elaboro la registrazione: uso express-validator per i controlli base,
// poi verifico la conferma password e l'unicità dell'email a mano
// (perché richiedono logica asincrona o confronto tra campi)
const registra = async (req, res) => {
  try {
    const { email, password, confirmPassword, nome, cognome } = req.body;

    // Raccolgo gli errori di express-validator
    const risultatoValidazione = validationResult(req);
    const errori = risultatoValidazione.array().map(e => e.msg);

    // Controlli che express-validator non può fare da solo
    if (password !== confirmPassword) errori.push('Le password non coincidono');

    const emailEsistente = await db.queryOne('SELECT id FROM users WHERE email = ?', [email]);
    if (emailEsistente) errori.push('Email già registrata');
    
    if (errori.length > 0) {
      return res.render('registrazione', {
        title: 'Registrati - MeditActive',
        errors: errori,
        email,
        nome,
        cognome
      });
    }
    
    const passwordCifrata = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const idUtente = await db.insert(
      'INSERT INTO users (email, password, nome, cognome) VALUES (?, ?, ?, ?)',
      [email, passwordCifrata, nome, cognome]
    );
    
    const utente = await db.queryOne(
      'SELECT id, email, nome, cognome, coins FROM users WHERE id = ?',
      [idUtente]
    );
    req.session.user = utente;
    
    req.flash('success_msg', 'Registrazione completata! Benvenuto/a in MeditActive');
    res.redirect('/pannello');
  } catch (errore) {
    console.error('Errore registrazione:', errore);
    res.render('registrazione', {
      title: 'Registrati - MeditActive',
      errors: ['Errore durante la registrazione'],
      email: req.body.email,
      nome: req.body.nome,
      cognome: req.body.cognome
    });
  }
};

// Mostro la pagina di accesso
const mostraAccesso = (req, res) => {
  res.render('accesso', { title: 'Accedi - MeditActive' });
};

// Elaboro il login: verifica credenziali e creo la sessione
const accedi = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.render('accesso', {
        title: 'Accedi - MeditActive',
        error: 'Email e password sono obbligatori',
        email
      });
    }
    
    const utente = await db.queryOne('SELECT * FROM users WHERE email = ?', [email]);
    
    if (!utente || !(await bcrypt.compare(password, utente.password))) {
      return res.render('accesso', {
        title: 'Accedi - MeditActive',
        error: 'Email o password non validi',
        email
      });
    }
    
    req.session.user = {
      id: utente.id,
      email: utente.email,
      nome: utente.nome,
      cognome: utente.cognome,
      coins: utente.coins
    };
    
    req.flash('success_msg', `Bentornato/a, ${utente.nome}!`);
    res.redirect('/pannello');
  } catch (errore) {
    console.error('Errore login:', errore);
    res.render('accesso', { title: 'Accedi - MeditActive', error: 'Errore durante il login' });
  }
};

// Logout: distruggo la sessione
const logout = (req, res) => {
  req.session.destroy(() => res.redirect('/'));
};

// Aggiorno nome, cognome, email e eventualmente password
const aggiornaProfilo = async (req, res) => {
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
      const nuovaPasswordCifrata = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
      await db.execute('UPDATE users SET password = ? WHERE id = ?', [nuovaPasswordCifrata, idUtente]);
    }
    
    await db.execute(
      'UPDATE users SET nome = ?, cognome = ?, email = ? WHERE id = ?',
      [nome, cognome, email, idUtente]
    );
    
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
};

// Aggiorno le preferenze utente (orario meditazione, minuti giornalieri, reminder, tema)
const aggiornaPreferenze = async (req, res) => {
  try {
    const { preferred_meditation_time, daily_goal_minutes, reminder_enabled, theme } = req.body;
    const idUtente = req.session.user.id;
    
    await db.execute(
      'UPDATE users SET preferred_meditation_time = ?, daily_goal_minutes = ?, reminder_enabled = ?, theme = ? WHERE id = ?',
      [preferred_meditation_time || null, daily_goal_minutes || 10, reminder_enabled ? 1 : 0, theme || 'light', idUtente]
    );
    
    req.flash('success_msg', 'Preferenze aggiornate');
    res.redirect('/profilo');
  } catch (errore) {
    console.error('Errore preferenze:', errore);
    req.flash('error_msg', 'Errore durante l\'aggiornamento');
    res.redirect('/profilo');
  }
};

module.exports = {
  mostraRegistrazione,
  registra,
  mostraAccesso,
  accedi,
  logout,
  aggiornaProfilo,
  aggiornaPreferenze
};
