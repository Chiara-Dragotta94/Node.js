const db = require('../config/database');
const bcrypt = require('bcryptjs');

/*
  Gestore degli utenti.
  Mi occupo di tutte le operazioni CRUD sugli utenti.
  Ogni query utilizza prepared statement per prevenire SQL Injection.
*/

// Restituisco la lista completa degli utenti (senza password)
const ottieniTutti = async (req, res) => {
  try {
    const utenti = await db.query(
      'SELECT id, email, nome, cognome, coins, created_at, updated_at FROM users'
    );
    res.json(utenti);
  } catch (errore) {
    console.error('Errore recupero utenti:', errore);
    res.status(500).json({ error: 'Errore nel recupero degli utenti' });
  }
};

// Restituisco un singolo utente cercandolo per id
const ottieniPerId = async (req, res) => {
  try {
    const utente = await db.queryOne(
      'SELECT id, email, nome, cognome, coins, created_at, updated_at FROM users WHERE id = ?',
      [req.params.id]
    );
    
    if (!utente) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }
    res.json(utente);
  } catch (errore) {
    console.error('Errore recupero utente:', errore);
    res.status(500).json({ error: 'Errore nel recupero dell\'utente' });
  }
};

// Creo un nuovo utente dopo aver validato i dati e cifrato la password
const crea = async (req, res) => {
  try {
    const { email, password, nome, cognome } = req.body;
    
    if (!email || !password || !nome || !cognome) {
      return res.status(400).json({ error: 'Tutti i campi sono obbligatori' });
    }
    
    // Verifico che l'email non sia già registrata
    const emailEsistente = await db.queryOne(
      'SELECT id FROM users WHERE email = ?', [email]
    );
    if (emailEsistente) {
      return res.status(409).json({ error: 'Email già registrata' });
    }
    
    // Cifro la password prima di salvarla
    const passwordCifrata = await bcrypt.hash(password, 10);
    
    const idUtente = await db.insert(
      'INSERT INTO users (email, password, nome, cognome) VALUES (?, ?, ?, ?)',
      [email, passwordCifrata, nome, cognome]
    );
    
    const nuovoUtente = await db.queryOne(
      'SELECT id, email, nome, cognome, coins, created_at FROM users WHERE id = ?',
      [idUtente]
    );
    res.status(201).json(nuovoUtente);
  } catch (errore) {
    console.error('Errore creazione utente:', errore);
    res.status(500).json({ error: 'Errore nella creazione dell\'utente' });
  }
};

// Aggiorno i dati di un utente esistente
const aggiorna = async (req, res) => {
  try {
    const { email, nome, cognome, password } = req.body;
    const idUtente = req.params.id;
    
    const utente = await db.queryOne('SELECT id FROM users WHERE id = ?', [idUtente]);
    if (!utente) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }
    
    // Se sta cambiando email, verifico che non sia già usata da altri
    if (email) {
      const emailOccupata = await db.queryOne(
        'SELECT id FROM users WHERE email = ? AND id != ?', [email, idUtente]
      );
      if (emailOccupata) {
        return res.status(409).json({ error: 'Email già in uso' });
      }
    }
    
    // Costruisco la query di aggiornamento in base ai campi ricevuti
    const campiDaAggiornare = [];
    const valori = [];
    
    if (email) { campiDaAggiornare.push('email = ?'); valori.push(email); }
    if (nome) { campiDaAggiornare.push('nome = ?'); valori.push(nome); }
    if (cognome) { campiDaAggiornare.push('cognome = ?'); valori.push(cognome); }
    if (password) { 
      const passwordCifrata = await bcrypt.hash(password, 10);
      campiDaAggiornare.push('password = ?'); 
      valori.push(passwordCifrata); 
    }
    
    if (campiDaAggiornare.length === 0) {
      return res.status(400).json({ error: 'Nessun campo da aggiornare' });
    }
    
    valori.push(idUtente);
    await db.execute(
      `UPDATE users SET ${campiDaAggiornare.join(', ')} WHERE id = ?`, valori
    );
    
    const utenteAggiornato = await db.queryOne(
      'SELECT id, email, nome, cognome, coins, created_at, updated_at FROM users WHERE id = ?',
      [idUtente]
    );
    res.json(utenteAggiornato);
  } catch (errore) {
    console.error('Errore aggiornamento utente:', errore);
    res.status(500).json({ error: 'Errore nell\'aggiornamento dell\'utente' });
  }
};

// Elimino un utente (CASCADE elimina anche i dati collegati)
const elimina = async (req, res) => {
  try {
    const righeModificate = await db.execute(
      'DELETE FROM users WHERE id = ?', [req.params.id]
    );
    if (righeModificate === 0) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }
    res.status(204).send();
  } catch (errore) {
    console.error('Errore eliminazione utente:', errore);
    res.status(500).json({ error: 'Errore nella cancellazione dell\'utente' });
  }
};

// Gestisco il login: verifico email e password, creo la sessione
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e password sono obbligatori' });
    }
    
    const utente = await db.queryOne('SELECT * FROM users WHERE email = ?', [email]);
    
    if (!utente) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }
    
    const passwordValida = await bcrypt.compare(password, utente.password);
    if (!passwordValida) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }
    
    // Salvo i dati essenziali dell'utente nella sessione
    req.session.user = {
      id: utente.id,
      email: utente.email,
      nome: utente.nome,
      cognome: utente.cognome,
      coins: utente.coins
    };
    
    res.json({ message: 'Login effettuato con successo', user: req.session.user });
  } catch (errore) {
    console.error('Errore login:', errore);
    res.status(500).json({ error: 'Errore durante il login' });
  }
};

// Distruggo la sessione per il logout
const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: 'Errore durante il logout' });
    res.json({ message: 'Logout effettuato con successo' });
  });
};

// Aggiorno le monete dell'utente (aggiunta o sottrazione)
const aggiornaMonete = async (req, res) => {
  try {
    const { coins, operation } = req.body;
    const idUtente = req.params.id;
    
    const utente = await db.queryOne('SELECT coins FROM users WHERE id = ?', [idUtente]);
    if (!utente) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }
    
    let nuoveMonete;
    if (operation === 'add') {
      nuoveMonete = utente.coins + coins;
    } else if (operation === 'subtract') {
      if (utente.coins < coins) {
        return res.status(400).json({ error: 'Monete insufficienti' });
      }
      nuoveMonete = utente.coins - coins;
    } else {
      nuoveMonete = coins;
    }
    
    await db.execute('UPDATE users SET coins = ? WHERE id = ?', [nuoveMonete, idUtente]);
    
    // Aggiorno anche la sessione se è l'utente corrente
    if (req.session.user && req.session.user.id == idUtente) {
      req.session.user.coins = nuoveMonete;
    }
    res.json({ coins: nuoveMonete });
  } catch (errore) {
    console.error('Errore aggiornamento monete:', errore);
    res.status(500).json({ error: 'Errore nell\'aggiornamento delle monete' });
  }
};

module.exports = {
  ottieniTutti,
  ottieniPerId,
  crea,
  aggiorna,
  elimina,
  login,
  logout,
  aggiornaMonete
};
