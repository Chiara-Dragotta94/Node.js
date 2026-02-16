const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const gestore = require('../../controllers/gestoreUtenti');
const { verificaLogin, soloProprioProfilo } = require('../../middleware/autenticazione');
const validaRichiesta = require('../../utils/validaRichiesta');
const { PASSWORD_MIN_LENGTH } = require('../../constants/costanti');

/*
  Rotte API per gli utenti.
  PUT e PATCH su /:id richiedono che l'utente modifichi solo sé stesso.
*/

router.get('/', gestore.ottieniTutti);
router.get('/:id', gestore.ottieniPerId);

// Validazione creazione utente (API)
router.post('/',
  [
    body('email').isEmail().withMessage('Email non valida'),
    body('password')
      .isLength({ min: PASSWORD_MIN_LENGTH })
      .withMessage(`La password deve essere di almeno ${PASSWORD_MIN_LENGTH} caratteri`),
    body('nome').notEmpty().withMessage('Il nome è obbligatorio'),
    body('cognome').notEmpty().withMessage('Il cognome è obbligatorio')
  ],
  validaRichiesta,
  gestore.crea
);
router.put('/:id', verificaLogin, soloProprioProfilo, gestore.aggiorna);
router.patch('/:id', verificaLogin, soloProprioProfilo, gestore.aggiorna);
router.delete('/:id', gestore.elimina);
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Email non valida'),
    body('password').notEmpty().withMessage('La password è obbligatoria')
  ],
  validaRichiesta,
  gestore.login
);
router.post('/logout', gestore.logout);
router.patch('/:id/coins', verificaLogin, gestore.aggiornaMonete);

module.exports = router;
