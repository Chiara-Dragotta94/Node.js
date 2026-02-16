require('dotenv').config();
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const { SESSION_MAX_AGE_MS } = require('./constants/costanti');

// Importo la configurazione del database
const db = require('./config/database');

// Importo le rotte
const rotteViste = require('./routes/pagine');
const rotteUtenti = require('./routes/api/utenti');
const rotteObiettivi = require('./routes/api/obiettivi');
const rotteIntervalli = require('./routes/api/intervalli');
const rotteDiario = require('./routes/api/diario');

const app = express();
const PORTA = process.env.PORT || 3000;

// Configuro il motore dei template
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware per il parsing delle richieste
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Configuro le sessioni utente
app.use(session({
  secret: process.env.SESSION_SECRET || 'meditactive_chiave_segreta',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MAX_AGE_MS
  }
}));

// Messaggi flash per feedback all'utente
app.use(flash());

// Variabili globali disponibili in tutte le viste
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.user = req.session.user || null;
  next();
});

// Registro le rotte
app.use('/', rotteViste);
app.use('/api/users', rotteUtenti);
app.use('/api/goals', rotteObiettivi);
app.use('/api/intervals', rotteIntervalli);
app.use('/api/diary', rotteDiario);

// Gestisco le pagine non trovate
app.use((req, res) => {
  res.status(404).render('404', { title: 'Pagina non trovata' });
});

// Gestisco gli errori generici del server
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Errore interno del server' });
});

// Avvio il server dopo aver verificato la connessione al database
const avviaServer = async () => {
  const dbConnesso = await db.testConnection();
  
  if (!dbConnesso) {
    console.log('\n⚠️  Il server partirà comunque, ma il database non è connesso.');
    console.log('   Assicurati che MySQL sia attivo e di aver eseguito migrations.sql\n');
  }
  
  app.listen(PORTA, () => {
    console.log(`\n🧘 MeditActive avviato su http://localhost:${PORTA}\n`);
  });
};

avviaServer();

module.exports = app;
