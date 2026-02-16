const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const gestore = require('../../controllers/gestoreObiettivi');
const { verificaLogin } = require('../../middleware/autenticazione');
const validaRichiesta = require('../../utils/validaRichiesta');
const { TIPI_INTERVALLO } = require('../../constants/costanti');

/*
  Rotte API per gli obiettivi predefiniti.
  Le GET restano pubbliche; creazione, modifica ed eliminazione richiedono login.
*/

router.get('/', gestore.ottieniTutti);
router.get('/categories', gestore.ottieniPerCategoria);
router.get('/:id', gestore.ottieniPerId);

router.post(
  '/',
  verificaLogin,
  [
    body('name').notEmpty().withMessage('Il nome è obbligatorio'),
    body('category')
      .optional()
      .isIn(TIPI_INTERVALLO)
      .withMessage('Categoria non valida')
  ],
  validaRichiesta,
  gestore.crea
);
router.put('/:id', verificaLogin, gestore.aggiorna);
router.patch('/:id', verificaLogin, gestore.aggiorna);
router.delete('/:id', verificaLogin, gestore.elimina);

module.exports = router;
