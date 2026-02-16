/*
  Costanti condivise nel progetto.
  Le definisco qui così modifico in un solo posto se cambiano.
*/

const TIPI_INTERVALLO = ['daily', 'monthly', 'yearly'];
const BCRYPT_ROUNDS = 10;
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const PASSWORD_MIN_LENGTH = 6;

module.exports = {
  TIPI_INTERVALLO,
  BCRYPT_ROUNDS,
  SESSION_MAX_AGE_MS,
  PASSWORD_MIN_LENGTH
};
