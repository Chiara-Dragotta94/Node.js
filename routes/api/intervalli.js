const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const gestore = require('../../controllers/gestoreIntervalli');
const { verificaLogin } = require('../../middleware/autenticazione');
const validaRichiesta = require('../../utils/validaRichiesta');
const { TIPI_INTERVALLO } = require('../../constants/costanti');

/*
  Rotte API per gli intervalli. Le GET restano pubbliche;
  creazione, modifica, eliminazione e associazioni obiettivi richiedono login.
*/

router.get('/', gestore.ottieniTutti);
router.get('/user/:userId', gestore.ottieniPerUtente);
router.get('/:id', gestore.ottieniPerId);

router.post(
  '/',
  verificaLogin,
  [
    body('user_id').isInt().withMessage('user_id è obbligatorio'),
    body('start_date').notEmpty().withMessage('La data di inizio è obbligatoria'),
    body('end_date').notEmpty().withMessage('La data di fine è obbligatoria'),
    body('interval_type')
      .isIn(TIPI_INTERVALLO)
      .withMessage('Tipo di intervallo non valido')
  ],
  validaRichiesta,
  gestore.crea
);
router.put('/:id', verificaLogin, gestore.aggiorna);
router.patch('/:id', verificaLogin, gestore.aggiorna);
router.delete('/:id', verificaLogin, gestore.elimina);
router.post('/:id/goals', verificaLogin, gestore.aggiungiObiettivo);
router.delete('/:id/goals/:goalId', verificaLogin, gestore.rimuoviObiettivo);
router.post('/:id/goals/:goalId/complete', verificaLogin, gestore.completaObiettivo);

module.exports = router;
