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
│   └── database.js              # Connessione MySQL e helper per le query
├── middleware/
│   └── autenticazione.js        # Middleware di autenticazione
├── controllers/
│   ├── gestoreUtenti.js         # CRUD utenti e autenticazione
│   ├── gestoreObiettivi.js      # CRUD obiettivi predefiniti
│   ├── gestoreIntervalli.js     # CRUD intervalli e associazioni
│   └── gestoreDiario.js         # Diario, sessioni e donazioni
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
├── migrations.sql               # Schema database MySQL
└── .env                         # Variabili d'ambiente (da creare)
```

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

- Password cifrate con **bcrypt** (10 round di salt)
- Tutte le query usano **prepared statement** per prevenire SQL Injection
- Sessioni gestite lato server con cookie sicuri
- Validazione input su tutti gli endpoint

## Tecnologie

- **Node.js** + **Express** - Backend
- **MySQL** + **mysql2/promise** - Database
- **EJS** - Template engine
- **bcryptjs** - Cifratura password
- **express-session** - Gestione sessioni
