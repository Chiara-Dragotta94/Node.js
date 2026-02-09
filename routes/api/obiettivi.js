const express = require('express');
const router = express.Router();
const gestore = require('../../controllers/gestoreObiettivi');

/*
  Rotte API per gli obiettivi predefiniti.
  GET supporta il filtro per categoria tramite query string: ?category=daily|monthly|yearly
*/

router.get('/', gestore.ottieniTutti);                   // Ottengo tutti gli obiettivi (filtro opzionale ?category=)
router.get('/categories', gestore.ottieniPerCategoria);   // Ottengo gli obiettivi raggruppati per categoria
router.get('/:id', gestore.ottieniPerId);                // Ottengo un singolo obiettivo per ID
router.post('/', gestore.crea);                          // Creo un nuovo obiettivo
router.put('/:id', gestore.aggiorna);                    // Aggiorno un obiettivo esistente
router.patch('/:id', gestore.aggiorna);                  // Aggiorno parzialmente un obiettivo
router.delete('/:id', gestore.elimina);                  // Elimino un obiettivo

module.exports = router;
