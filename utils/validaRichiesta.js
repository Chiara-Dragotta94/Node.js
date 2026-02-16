/*
  Middleware di comodo per usare express-validator.
  Centralizzo qui l'estrazione degli errori così nei router
  posso solo definire le regole e lasciare a questo middleware
  la risposta 400 in caso di problemi.
*/

const { validationResult } = require('express-validator');

const validaRichiesta = (req, res, next) => {
  const errori = validationResult(req);

  if (!errori.isEmpty()) {
    // Se ci sono errori, li unisco in un unico messaggio in italiano
    const messaggi = errori.array().map(e => e.msg);
    return res.status(400).json({ error: messaggi.join(', ') });
  }

  next();
};

module.exports = validaRichiesta;

