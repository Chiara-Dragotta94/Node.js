# MeditActive

App di meditazione e crescita personale che aiuta gli utenti a raggiungere i propri obiettivi attraverso la pratica quotidiana della meditazione.

## Funzionalità

- **Registrazione e login** con sessioni sicure e password cifrate
- **Timer di meditazione** con guida respiratoria e durate configurabili (5-30 minuti)
- **Sistema di obiettivi** giornalieri, mensili e annuali con intervalli personalizzabili
- **Habit tracker** per monitorare il completamento degli obiettivi
- **Diario personale** con umore e spunti di scrittura
- **Monete virtuali** guadagnate meditando e completando obiettivi
- **Donazioni** per piantare alberi e sostenere progetti a impatto sociale
- **API RESTful** con prepared statement per la sicurezza

## Prerequisiti

- **Node.js** (v14 o superiore)
- **MySQL** (v5.7 o superiore) - consiglio XAMPP con phpMyAdmin

## Installazione

1. Clona il repository e installa le dipendenze:
```bash
npm install
```

2. Crea il file `.env` nella root del progetto:
```
PORT=3000
SESSION_SECRET=una_chiave_segreta_a_tua_scelta
NODE_ENV=development
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=meditactive
DB_PORT=3306
```

3. Importa lo schema del database:
   - Apri **phpMyAdmin** (http://localhost/phpmyadmin)
   - Vai nella scheda **Importa**
   - Seleziona il file `migrations.sql`
   - Clicca **Esegui**

4. Avvia l'applicazione:
```bash
npm run dev
```

5. Apri il browser su **http://localhost:3000**

## Struttura del progetto

```
├── server.js                    # Punto di ingresso dell'applicazione
├── config/
│   └── database.js              # Connessione MySQL, transazioni, prepared statement
├── constants/
│   └── costanti.js              # Costanti condivise (bcrypt, sessione, tipi intervallo)
├── middleware/
│   └── autenticazione.js        # verificaLogin, soloProprioProfilo, reindirizzaSeLoggato
├── controllers/
│   ├── gestoreUtenti.js         # CRUD utenti e autenticazione API
│   ├── gestoreAutenticazione.js # Registrazione, login e aggiornamento profilo (form)
│   ├── gestoreObiettivi.js      # CRUD obiettivi predefiniti
│   ├── gestoreIntervalli.js     # CRUD intervalli, N+1 evitato con query batch
│   └── gestoreDiario.js         # Diario, sessioni, donazioni (con transazioni)
├── services/
│   └── ObiettiviService.js      # Logica business complessa per obiettivi (completamento)
├── utils/
│   ├── asyncHandler.js         # Wrapper per gestione errori async
│   ├── buildUpdateQuery.js     # Helper per costruire query UPDATE dinamiche
│   └── validaRichiesta.js      # Middleware per express-validator
├── routes/
│   ├── pagine.js                # Rotte delle pagine (viste)
│   └── api/
│       ├── utenti.js            # API utenti
│       ├── obiettivi.js         # API obiettivi
│       ├── intervalli.js        # API intervalli
│       └── diario.js            # API diario e sessioni
├── views/                       # Template EJS
│   ├── partials/                # Componenti riutilizzabili
│   │   ├── navbar.ejs
│   │   ├── footer.ejs
│   │   └── messaggi.ejs
│   ├── home.ejs
│   ├── registrazione.ejs
│   ├── accesso.ejs
│   ├── pannello.ejs             # Dashboard
│   ├── timer.ejs
│   ├── obiettivi.ejs
│   ├── abitudini.ejs            # Habit tracker
│   ├── ricompense.ejs
│   ├── diario.ejs
│   ├── profilo.ejs
│   └── 404.ejs
├── public/
│   ├── favicon.svg              # Favicon del sito
│   ├── css/stile.css            # Stile ispirato a Headspace
│   └── js/
│       ├── principale.js        # Funzionalità comuni
│       ├── timer.js
│       ├── obiettivi.js
│       ├── abitudini.js
│       ├── ricompense.js
│       └── diario.js
├── test/                        # Unit test
│   ├── gestoreUtenti.test.js
│   ├── gestoreObiettivi.test.js
│   ├── gestoreIntervalli.test.js
│   └── gestoreDiario.test.js
├── migrations.sql               # Schema database MySQL
└── .env                         # Variabili d'ambiente (da creare)
```

## Unit Test

Il progetto include 66 test automatici scritti con **Mocha**, **Chai** e **Sinon**. I test verificano la logica di tutti i controller senza bisogno di un database attivo, grazie agli stub di Sinon che simulano le risposte del database.

Per lanciare i test:
```bash
npm test
```

I test coprono:
- **Utenti**: CRUD completo, login, logout, gestione monete
- **Obiettivi**: CRUD, filtro per categoria, raggruppamento
- **Intervalli**: CRUD, associazione obiettivi, completamento, filtri per data e obiettivo
- **Diario**: voci del diario, sessioni di meditazione, donazioni, statistiche

## API RESTful

### Utenti
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/api/users` | Lista tutti gli utenti |
| GET | `/api/users/:id` | Dettaglio utente |
| POST | `/api/users` | Crea utente |
| PUT | `/api/users/:id` | Aggiorna utente |
| DELETE | `/api/users/:id` | Elimina utente |
| POST | `/api/users/login` | Login |
| POST | `/api/users/logout` | Logout |

### Obiettivi
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/api/goals` | Lista obiettivi (filtro: `?category=daily\|monthly\|yearly`) |
| GET | `/api/goals/:id` | Dettaglio obiettivo |
| POST | `/api/goals` | Crea obiettivo |
| PUT | `/api/goals/:id` | Aggiorna obiettivo |
| DELETE | `/api/goals/:id` | Elimina obiettivo |

### Intervalli
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/api/intervals` | Lista intervalli (filtri: `user_id`, `start_date`, `end_date`, `goal_id`, `interval_type`) |
| GET | `/api/intervals/:id` | Dettaglio intervallo |
| POST | `/api/intervals` | Crea intervallo |
| PUT | `/api/intervals/:id` | Aggiorna intervallo |
| DELETE | `/api/intervals/:id` | Elimina intervallo |
| POST | `/api/intervals/:id/goals` | Associa obiettivo a intervallo |
| DELETE | `/api/intervals/:id/goals/:goalId` | Rimuovi associazione |
| POST | `/api/intervals/:id/goals/:goalId/complete` | Completa obiettivo |

### Diario e sessioni
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/api/diary` | Lista voci diario |
| POST | `/api/diary` | Nuova voce |
| PUT | `/api/diary/:id` | Aggiorna voce |
| DELETE | `/api/diary/:id` | Elimina voce |
| POST | `/api/diary/meditation` | Salva sessione meditazione |
| POST | `/api/diary/donations` | Effettua donazione |

## Sicurezza

- Password cifrate con **bcrypt** (round configurabili in `constants/costanti.js`)
- Tutte le query usano **prepared statement** per prevenire SQL Injection
- Sessioni gestite lato server con cookie sicuri
- **PUT/PATCH utenti**: solo l'utente può modificare il proprio profilo (middleware `soloProprioProfilo`)
- **Diario, statistiche, donazioni**: l'ID utente viene preso solo dalla sessione, mai da parametri
- **Obiettivi e intervalli**: creazione, modifica ed eliminazione richiedono login
- **Donazioni e completamento obiettivi**: operazioni in **transazione** (tutto o niente)
- **Validazione input** con **express-validator** sulle principali rotte API (`users`, `goals`, `intervals`, `diary`)
- **Service layer** per logica business complessa: `ObiettiviService` orchestra il completamento degli obiettivi (verifica, aggiornamento stato, assegnazione monete)

## Tecnologie

- **Node.js** + **Express** - Backend
- **MySQL** + **mysql2/promise** - Database
- **EJS** - Template engine
- **bcryptjs** - Cifratura password
- **express-session** - Gestione sessioni
- **express-validator** - Validazione dei dati in ingresso
- **Mocha** + **Chai** + **Sinon** - Unit testing
