const express = require('express');
const router = express.Router();
const gestore = require('../../controllers/gestoreIntervalli');
const { verificaLogin } = require('../../middleware/autenticazione');

/*
  Rotte API per gli intervalli di obiettivi.
  La GET principale supporta filtri: user_id, start_date, end_date, goal_id, interval_type.
  Il completamento di un obiettivo richiede autenticazione perché assegna monete.
*/

router.get('/', gestore.ottieniTutti);                     // Ottengo tutti gli intervalli (con filtri opzionali)
router.get('/:id', gestore.ottieniPerId);                  // Ottengo un singolo intervallo per ID
router.get('/user/:userId', gestore.ottieniPerUtente);     // Ottengo gli intervalli di uno specifico utente
router.post('/', gestore.crea);                            // Creo un nuovo intervallo di obiettivi
router.put('/:id', gestore.aggiorna);                      // Aggiorno un intervallo esistente
router.patch('/:id', gestore.aggiorna);                    // Aggiorno parzialmente un intervallo
router.delete('/:id', gestore.elimina);                    // Elimino un intervallo
router.post('/:id/goals', gestore.aggiungiObiettivo);     // Associo un obiettivo a un intervallo
router.delete('/:id/goals/:goalId', gestore.rimuoviObiettivo);  // Rimuovo un obiettivo da un intervallo
router.post('/:id/goals/:goalId/complete', verificaLogin, gestore.completaObiettivo); // Segno un obiettivo come completato

module.exports = router;
