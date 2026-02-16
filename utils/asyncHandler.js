/*
  Wrapper per funzioni async usate come middleware/route handler.
  Se la promise viene rifiutata, passo l'errore al middleware di errore di Express
  così non devo ripetere try-catch in ogni controller.
*/

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
