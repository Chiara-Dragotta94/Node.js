const { expect } = require('chai');
const sinon = require('sinon');
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const gestore = require('../controllers/gestoreUtenti');

/*
  Test per il gestore degli utenti.
  Uso sinon per creare stub sulle funzioni del database,
  così verifico la logica dei controller senza bisogno di MySQL attivo.
*/

// Creo degli oggetti finti per simulare req e res di Express
const creaRes = () => {
  const res = {
    statusCode: 200,
    datiInviati: null,
    status: function (code) { this.statusCode = code; return this; },
    json: function (dati) { this.datiInviati = dati; return this; },
    send: function () { return this; }
  };
  return res;
};

const creaReq = (opzioni = {}) => ({
  params: opzioni.params || {},
  body: opzioni.body || {},
  query: opzioni.query || {},
  session: opzioni.session || {},
  flash: sinon.stub()
});

describe('Gestore Utenti', () => {

  // Dopo ogni test ripristino tutti gli stub
  afterEach(() => {
    sinon.restore();
  });

  // ===== GET - Ottenere tutti gli utenti =====
  describe('ottieniTutti', () => {
    it('dovrebbe restituire la lista degli utenti con status 200', async () => {
      const utentiFinti = [
        { id: 1, email: 'marco@test.it', nome: 'Marco', cognome: 'Rossi', coins: 50 },
        { id: 2, email: 'laura@test.it', nome: 'Laura', cognome: 'Bianchi', coins: 120 }
      ];
      sinon.stub(db, 'query').resolves(utentiFinti);

      const req = creaReq();
      const res = creaRes();

      await gestore.ottieniTutti(req, res);

      expect(res.statusCode).to.equal(200);
      expect(res.datiInviati).to.deep.equal(utentiFinti);
      expect(db.query.calledOnce).to.be.true;
    });

    it('dovrebbe restituire 500 se il database fallisce', async () => {
      sinon.stub(db, 'query').rejects(new Error('Connessione persa'));

      const req = creaReq();
      const res = creaRes();

      await gestore.ottieniTutti(req, res);

      expect(res.statusCode).to.equal(500);
      expect(res.datiInviati.error).to.exist;
    });
  });

  // ===== GET - Ottenere un utente per ID =====
  describe('ottieniPerId', () => {
    it('dovrebbe restituire l\'utente se esiste', async () => {
      const utente = { id: 1, email: 'marco@test.it', nome: 'Marco', cognome: 'Rossi' };
      sinon.stub(db, 'queryOne').resolves(utente);

      const req = creaReq({ params: { id: 1 } });
      const res = creaRes();

      await gestore.ottieniPerId(req, res);

      expect(res.statusCode).to.equal(200);
      expect(res.datiInviati).to.deep.equal(utente);
    });

    it('dovrebbe restituire 404 se l\'utente non esiste', async () => {
      sinon.stub(db, 'queryOne').resolves(null);

      const req = creaReq({ params: { id: 999 } });
      const res = creaRes();

      await gestore.ottieniPerId(req, res);

      expect(res.statusCode).to.equal(404);
      expect(res.datiInviati.error).to.include('non trovato');
    });
  });

  // ===== POST - Creare un nuovo utente =====
  describe('crea', () => {
    it('dovrebbe creare un utente e restituire 201', async () => {
      const nuovoUtente = { id: 3, email: 'anna@test.it', nome: 'Anna', cognome: 'Verdi', coins: 0 };

      sinon.stub(db, 'queryOne')
        .onFirstCall().resolves(null)       // email non esiste ancora
        .onSecondCall().resolves(nuovoUtente); // utente appena creato
      sinon.stub(db, 'insert').resolves(3);
      sinon.stub(bcrypt, 'hash').resolves('password_cifrata');

      const req = creaReq({
        body: { email: 'anna@test.it', password: 'test123', nome: 'Anna', cognome: 'Verdi' }
      });
      const res = creaRes();

      await gestore.crea(req, res);

      expect(res.statusCode).to.equal(201);
      expect(res.datiInviati.nome).to.equal('Anna');
      expect(bcrypt.hash.calledOnce).to.be.true;
    });

    it('dovrebbe restituire 400 se mancano dei campi obbligatori', async () => {
      const req = creaReq({
        body: { email: 'anna@test.it' } // mancano password, nome, cognome
      });
      const res = creaRes();

      await gestore.crea(req, res);

      expect(res.statusCode).to.equal(400);
      expect(res.datiInviati.error).to.include('obbligatori');
    });

    it('dovrebbe restituire 409 se l\'email è già registrata', async () => {
      sinon.stub(db, 'queryOne').resolves({ id: 1 }); // email già presente

      const req = creaReq({
        body: { email: 'marco@test.it', password: 'test123', nome: 'Marco', cognome: 'Rossi' }
      });
      const res = creaRes();

      await gestore.crea(req, res);

      expect(res.statusCode).to.equal(409);
      expect(res.datiInviati.error).to.include('già registrata');
    });
  });

  // ===== PUT - Aggiornare un utente =====
  describe('aggiorna', () => {
    it('dovrebbe aggiornare i dati e restituire l\'utente aggiornato', async () => {
      const utenteAggiornato = { id: 1, email: 'marco@test.it', nome: 'Marco', cognome: 'Neri' };

      sinon.stub(db, 'queryOne')
        .onFirstCall().resolves({ id: 1 })           // utente esiste
        .onSecondCall().resolves(utenteAggiornato);   // utente dopo l'aggiornamento
      sinon.stub(db, 'execute').resolves(1);

      const req = creaReq({
        params: { id: 1 },
        body: { cognome: 'Neri' }
      });
      const res = creaRes();

      await gestore.aggiorna(req, res);

      expect(res.statusCode).to.equal(200);
      expect(res.datiInviati.cognome).to.equal('Neri');
    });

    it('dovrebbe restituire 404 se l\'utente non esiste', async () => {
      sinon.stub(db, 'queryOne').resolves(null);

      const req = creaReq({ params: { id: 999 }, body: { nome: 'Test' } });
      const res = creaRes();

      await gestore.aggiorna(req, res);

      expect(res.statusCode).to.equal(404);
    });

    it('dovrebbe restituire 400 se non ci sono campi da aggiornare', async () => {
      sinon.stub(db, 'queryOne').resolves({ id: 1 });

      const req = creaReq({ params: { id: 1 }, body: {} });
      const res = creaRes();

      await gestore.aggiorna(req, res);

      expect(res.statusCode).to.equal(400);
    });
  });

  // ===== DELETE - Eliminare un utente =====
  describe('elimina', () => {
    it('dovrebbe eliminare l\'utente e restituire 204', async () => {
      sinon.stub(db, 'execute').resolves(1); // 1 riga eliminata

      const req = creaReq({ params: { id: 1 } });
      const res = creaRes();

      await gestore.elimina(req, res);

      expect(res.statusCode).to.equal(204);
    });

    it('dovrebbe restituire 404 se l\'utente non esiste', async () => {
      sinon.stub(db, 'execute').resolves(0); // nessuna riga eliminata

      const req = creaReq({ params: { id: 999 } });
      const res = creaRes();

      await gestore.elimina(req, res);

      expect(res.statusCode).to.equal(404);
    });
  });

  // ===== POST - Login =====
  describe('login', () => {
    it('dovrebbe effettuare il login con credenziali valide', async () => {
      const utente = { id: 1, email: 'marco@test.it', password: 'hash_password', nome: 'Marco', cognome: 'Rossi', coins: 50 };
      sinon.stub(db, 'queryOne').resolves(utente);
      sinon.stub(bcrypt, 'compare').resolves(true);

      const req = creaReq({
        body: { email: 'marco@test.it', password: 'password123' },
        session: {}
      });
      const res = creaRes();

      await gestore.login(req, res);

      expect(res.statusCode).to.equal(200);
      expect(res.datiInviati.message).to.include('successo');
      expect(req.session.user).to.exist;
      expect(req.session.user.nome).to.equal('Marco');
    });

    it('dovrebbe restituire 401 con credenziali errate', async () => {
      sinon.stub(db, 'queryOne').resolves(null); // utente non trovato

      const req = creaReq({
        body: { email: 'falso@test.it', password: 'sbagliata' },
        session: {}
      });
      const res = creaRes();

      await gestore.login(req, res);

      expect(res.statusCode).to.equal(401);
      expect(res.datiInviati.error).to.include('non valide');
    });

    it('dovrebbe restituire 400 se manca email o password', async () => {
      const req = creaReq({ body: { email: 'marco@test.it' }, session: {} });
      const res = creaRes();

      await gestore.login(req, res);

      expect(res.statusCode).to.equal(400);
    });
  });

  // ===== POST - Logout =====
  describe('logout', () => {
    it('dovrebbe distruggere la sessione e restituire un messaggio', () => {
      const req = creaReq({
        session: { destroy: (cb) => cb(null) }
      });
      const res = creaRes();

      gestore.logout(req, res);

      expect(res.datiInviati.message).to.include('Logout');
    });
  });

  // ===== PATCH - Aggiornare le monete =====
  describe('aggiornaMonete', () => {
    it('dovrebbe aggiungere monete all\'utente', async () => {
      sinon.stub(db, 'queryOne').resolves({ coins: 50 });
      sinon.stub(db, 'execute').resolves(1);

      const req = creaReq({
        params: { id: 1 },
        body: { coins: 20, operation: 'add' },
        session: { user: { id: 1, coins: 50 } }
      });
      const res = creaRes();

      await gestore.aggiornaMonete(req, res);

      expect(res.statusCode).to.equal(200);
      expect(res.datiInviati.coins).to.equal(70);
    });

    it('dovrebbe restituire 400 se le monete sono insufficienti per la sottrazione', async () => {
      sinon.stub(db, 'queryOne').resolves({ coins: 10 });

      const req = creaReq({
        params: { id: 1 },
        body: { coins: 50, operation: 'subtract' },
        session: {}
      });
      const res = creaRes();

      await gestore.aggiornaMonete(req, res);

      expect(res.statusCode).to.equal(400);
      expect(res.datiInviati.error).to.include('insufficienti');
    });
  });
});
