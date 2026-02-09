const express = require('express');
const router = express.Router();
const gestore = require('../../controllers/gestoreUtenti');
const { verificaLogin } = require('../../middleware/autenticazione');

/*
  Rotte API per gli utenti.
  Seguo l'architettura REST: nomi al plurale, metodi HTTP appropriati, status code corretti.
*/

router.get('/', gestore.ottieniTutti);              // Ottengo la lista di tutti gli utenti
router.get('/:id', gestore.ottieniPerId);           // Ottengo un singolo utente per ID
router.post('/', gestore.crea);                     // Creo un nuovo utente (registrazione)
router.put('/:id', gestore.aggiorna);               // Aggiorno tutti i dati di un utente
router.patch('/:id', gestore.aggiorna);             // Aggiorno parzialmente un utente
router.delete('/:id', gestore.elimina);             // Elimino un utente
router.post('/login', gestore.login);               // Gestisco il login
router.post('/logout', gestore.logout);             // Gestisco il logout
router.patch('/:id/coins', verificaLogin, gestore.aggiornaMonete);  // Aggiorno le monete dell'utente

module.exports = router;
