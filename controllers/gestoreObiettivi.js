const db = require('../config/database');
const { TIPI_INTERVALLO } = require('../constants/costanti');
const buildUpdateQuery = require('../utils/buildUpdateQuery');

/*
  Gestore degli obiettivi predefiniti.
  Qui gestisco la lettura, creazione, modifica e cancellazione
  degli obiettivi (giornalieri, mensili, annuali).
*/

// Restituisco tutti gli obiettivi, con filtro opzionale per categoria
const ottieniTutti = async (req, res) => {
  try {
    const { category } = req.query;
    
    let sql = 'SELECT * FROM goals';
    const parametri = [];
    
    // Valido la categoria per evitare valori inattesi
    if (category && TIPI_INTERVALLO.includes(category)) {
      sql += ' WHERE category = ?';
      parametri.push(category);
    }
    sql += ' ORDER BY category, name';
    
    const obiettivi = await db.query(sql, parametri);
    res.json(obiettivi);
  } catch (errore) {
    console.error('Errore recupero obiettivi:', errore);
    res.status(500).json({ error: 'Errore nel recupero degli obiettivi' });
  }
};

// Restituisco un singolo obiettivo per id
const ottieniPerId = async (req, res) => {
  try {
    const obiettivo = await db.queryOne('SELECT * FROM goals WHERE id = ?', [req.params.id]);
    if (!obiettivo) {
      return res.status(404).json({ error: 'Obiettivo non trovato' });
    }
    res.json(obiettivo);
  } catch (errore) {
    console.error('Errore recupero obiettivo:', errore);
    res.status(500).json({ error: 'Errore nel recupero dell\'obiettivo' });
  }
};

// Creo un nuovo obiettivo dopo aver validato i dati
const crea = async (req, res) => {
  try {
    const { name, description, category, coins_reward } = req.body;
    
    if (!name || !category) {
      return res.status(400).json({ error: 'Nome e categoria sono obbligatori' });
    }
    if (!TIPI_INTERVALLO.includes(category)) {
      return res.status(400).json({ error: 'Categoria non valida. Usa: daily, monthly, yearly' });
    }
    
    const idObiettivo = await db.insert(
      'INSERT INTO goals (name, description, category, coins_reward) VALUES (?, ?, ?, ?)',
      [name, description || '', category, coins_reward || 10]
    );
    
    const nuovo = await db.queryOne('SELECT * FROM goals WHERE id = ?', [idObiettivo]);
    res.status(201).json(nuovo);
  } catch (errore) {
    console.error('Errore creazione obiettivo:', errore);
    res.status(500).json({ error: 'Errore nella creazione dell\'obiettivo' });
  }
};

// Aggiorno un obiettivo esistente
const aggiorna = async (req, res) => {
  try {
    const { name, description, category, coins_reward } = req.body;
    const idObiettivo = req.params.id;
    
    const obiettivo = await db.queryOne('SELECT id FROM goals WHERE id = ?', [idObiettivo]);
    if (!obiettivo) {
      return res.status(404).json({ error: 'Obiettivo non trovato' });
    }
    
    if (category && !TIPI_INTERVALLO.includes(category)) {
      return res.status(400).json({ error: 'Categoria non valida' });
    }
    
    // Costruisco in modo riutilizzabile la UPDATE invece di ripetere array di campi/valori
    const datiAggiornati = {};
    if (name) datiAggiornati.name = name;
    if (description !== undefined) datiAggiornati.description = description;
    if (category) datiAggiornati.category = category;
    if (coins_reward !== undefined) datiAggiornati.coins_reward = coins_reward;

    const update = buildUpdateQuery('goals', datiAggiornati, 'WHERE id = ?', [idObiettivo]);
    if (!update) {
      return res.status(400).json({ error: 'Nessun campo da aggiornare' });
    }
    await db.execute(update.sql, update.values);
    
    const aggiornato = await db.queryOne('SELECT * FROM goals WHERE id = ?', [idObiettivo]);
    res.json(aggiornato);
  } catch (errore) {
    console.error('Errore aggiornamento obiettivo:', errore);
    res.status(500).json({ error: 'Errore nell\'aggiornamento dell\'obiettivo' });
  }
};

// Elimino un obiettivo
const elimina = async (req, res) => {
  try {
    const righe = await db.execute('DELETE FROM goals WHERE id = ?', [req.params.id]);
    if (righe === 0) {
      return res.status(404).json({ error: 'Obiettivo non trovato' });
    }
    res.status(204).send();
  } catch (errore) {
    console.error('Errore eliminazione obiettivo:', errore);
    res.status(500).json({ error: 'Errore nella cancellazione dell\'obiettivo' });
  }
};

// Restituisco gli obiettivi raggruppati per categoria
const ottieniPerCategoria = async (req, res) => {
  try {
    const obiettivi = await db.query('SELECT * FROM goals ORDER BY category, name');
    
    const raggruppati = {
      daily: obiettivi.filter(o => o.category === 'daily'),
      monthly: obiettivi.filter(o => o.category === 'monthly'),
      yearly: obiettivi.filter(o => o.category === 'yearly')
    };
    res.json(raggruppati);
  } catch (errore) {
    console.error('Errore raggruppamento obiettivi:', errore);
    res.status(500).json({ error: 'Errore nel recupero degli obiettivi' });
  }
};

module.exports = {
  ottieniTutti,
  ottieniPerId,
  crea,
  aggiorna,
  elimina,
  ottieniPerCategoria
};
