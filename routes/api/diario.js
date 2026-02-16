const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const gestore = require('../../controllers/gestoreDiario');
const { verificaLogin } = require('../../middleware/autenticazione');
const validaRichiesta = require('../../utils/validaRichiesta');

/*
  Rotte API per il diario personale, le sessioni di meditazione e le donazioni.
  Tutte le rotte richiedono autenticazione perché operano sui dati privati dell'utente.
*/

router.use(verificaLogin);

// Metto prima le rotte con path specifici, così Express non scambia "meditation" per :id
router.get('/meditation/stats', gestore.ottieniStatistiche); // Ottengo le statistiche di meditazione
router.get('/donations/list', gestore.ottieniDonazioni);    // Ottengo lo storico delle donazioni
router.post(
  '/meditation',
  [
    body('duration_minutes')
      .isFloat({ gt: 0 })
      .withMessage('La durata in minuti è obbligatoria e deve essere maggiore di zero')
  ],
  validaRichiesta,
  gestore.salvaSessione
);          // Salvo una sessione di meditazione completata
router.post('/donations', gestore.creaDonazione);           // Effettuo una nuova donazione

router.get('/', gestore.ottieniVociDiario);   // Ottengo tutte le voci del diario dell'utente
router.get('/:id', gestore.ottieniVoce);      // Ottengo una singola voce per ID
router.post(
  '/',
  [
    body('content')
      .notEmpty()
      .withMessage('Il contenuto è obbligatorio')
  ],
  validaRichiesta,
  gestore.creaVoce
);           // Creo una nuova voce nel diario
router.put('/:id', gestore.aggiornaVoce);     // Aggiorno completamente una voce
router.patch('/:id', gestore.aggiornaVoce);   // Aggiorno parzialmente una voce
router.delete('/:id', gestore.eliminaVoce);   // Elimino una voce dal diario

module.exports = router;
