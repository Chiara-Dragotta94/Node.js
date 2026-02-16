/*
  Middleware di autenticazione.
  Lo uso per proteggere le rotte che richiedono il login
  e per impedire l'accesso a login/registrazione se già loggati.
*/

// Controllo se l'utente ha una sessione attiva
const verificaLogin = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  
  // Se è una richiesta API, rispondo con 401
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'Non autorizzato. Effettua il login.' });
  }
  
  // Altrimenti reindirizzo alla pagina di login
  req.flash('error_msg', 'Devi effettuare il login per accedere a questa pagina');
  res.redirect('/accesso');
};

// Impedisco l'accesso a login/registrazione se già loggati
const reindirizzaSeLoggato = (req, res, next) => {
  if (req.session && req.session.user) {
    return res.redirect('/pannello');
  }
  next();
};

// Verifico che l'utente stia modificando solo il proprio profilo
const soloProprioProfilo = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Non autorizzato' });
  }
  if (String(req.session.user.id) !== String(req.params.id)) {
    return res.status(403).json({ error: 'Puoi modificare solo il tuo profilo' });
  }
  next();
};

module.exports = {
  verificaLogin,
  reindirizzaSeLoggato,
  soloProprioProfilo
};
