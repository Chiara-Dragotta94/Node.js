const express = require('express');
const router = express.Router();
const gestore = require('../../controllers/gestoreDiario');
const { verificaLogin } = require('../../middleware/autenticazione');

/*
  Rotte API per il diario personale, le sessioni di meditazione e le donazioni.
  Tutte le rotte richiedono autenticazione perché operano sui dati privati dell'utente.
*/

router.use(verificaLogin);

router.get('/', gestore.ottieniVociDiario);            // Ottengo tutte le voci del diario dell'utente
router.get('/:id', gestore.ottieniVoce);               // Ottengo una singola voce per ID
router.post('/', gestore.creaVoce);                    // Creo una nuova voce nel diario
router.put('/:id', gestore.aggiornaVoce);              // Aggiorno completamente una voce
router.patch('/:id', gestore.aggiornaVoce);            // Aggiorno parzialmente una voce
router.delete('/:id', gestore.eliminaVoce);            // Elimino una voce dal diario
router.post('/meditation', gestore.salvaSessione);     // Salvo una sessione di meditazione completata
router.get('/meditation/stats', gestore.ottieniStatistiche); // Ottengo le statistiche di meditazione
router.post('/donations', gestore.creaDonazione);      // Effettuo una nuova donazione
router.get('/donations/list', gestore.ottieniDonazioni); // Ottengo lo storico delle donazioni

module.exports = router;
