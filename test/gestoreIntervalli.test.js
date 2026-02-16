const { expect } = require('chai');
const sinon = require('sinon');
const db = require('../config/database');
const gestore = require('../controllers/gestoreIntervalli');
const obiettiviService = require('../services/ObiettiviService');

/*
  Test per il gestore degli intervalli.
  Verifico il CRUD, l'associazione di obiettivi agli intervalli,
  il completamento con assegnazione monete e i filtri di ricerca.
*/

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
  session: opzioni.session || {}
});

describe('Gestore Intervalli', () => {

  afterEach(() => {
    sinon.restore();
  });

  // ===== GET - Ottenere tutti gli intervalli =====
  describe('ottieniTutti', () => {
    it('dovrebbe restituire tutti gli intervalli con i relativi obiettivi', async () => {
      const intervalli = [
        { id: 1, user_id: 1, start_date: '2026-02-01', end_date: '2026-02-28', interval_type: 'monthly' }
      ];
      // La helper _obiettiviPerIntervalli raggruppa per interval_id: serve quel campo
      const obiettivi = [
        { id: 1, name: 'Meditazione', completed: 0, interval_id: 1 }
      ];
      sinon.stub(db, 'query')
        .onFirstCall().resolves(intervalli)
        .onSecondCall().resolves(obiettivi);

      const req = creaReq({ query: {} });
      const res = creaRes();

      await gestore.ottieniTutti(req, res);

      expect(res.statusCode).to.equal(200);
      expect(res.datiInviati).to.have.lengthOf(1);
      expect(res.datiInviati[0].goals).to.have.lengthOf(1);
    });

    it('dovrebbe filtrare per user_id', async () => {
      sinon.stub(db, 'query')
        .onFirstCall().resolves([])
      const req = creaReq({ query: { user_id: '1' } });
      const res = creaRes();

      await gestore.ottieniTutti(req, res);

      // Verifico che il parametro user_id sia stato incluso nella query
      const queryChiamata = db.query.firstCall.args[0];
      expect(queryChiamata).to.include('user_id');
    });

    it('dovrebbe filtrare per data di inizio e fine', async () => {
      sinon.stub(db, 'query').onFirstCall().resolves([]);

      const req = creaReq({ query: { start_date: '2026-01-01', end_date: '2026-12-31' } });
      const res = creaRes();

      await gestore.ottieniTutti(req, res);

      const queryChiamata = db.query.firstCall.args[0];
      expect(queryChiamata).to.include('start_date');
      expect(queryChiamata).to.include('end_date');
    });

    it('dovrebbe filtrare per obiettivo incluso (goal_id)', async () => {
      sinon.stub(db, 'query').onFirstCall().resolves([]);

      const req = creaReq({ query: { goal_id: '3' } });
      const res = creaRes();

      await gestore.ottieniTutti(req, res);

      // Quando filtro per goal_id, la query deve contenere un JOIN
      const queryChiamata = db.query.firstCall.args[0];
      expect(queryChiamata).to.include('interval_goals');
      expect(db.query.firstCall.args[1]).to.include('3');
    });
  });

  // ===== GET - Ottenere un intervallo per ID =====
  describe('ottieniPerId', () => {
    it('dovrebbe restituire l\'intervallo con gli obiettivi associati', async () => {
      const intervallo = { id: 1, user_id: 1, start_date: '2026-02-01', end_date: '2026-02-28' };
      // _obiettiviPerIntervalli si aspetta righe con interval_id per raggruppare
      const obiettivi = [{ id: 1, name: 'Meditazione', completed: 0, interval_id: 1 }];

      sinon.stub(db, 'queryOne').resolves(intervallo);
      sinon.stub(db, 'query').resolves(obiettivi);

      const req = creaReq({ params: { id: 1 } });
      const res = creaRes();

      await gestore.ottieniPerId(req, res);

      expect(res.statusCode).to.equal(200);
      expect(res.datiInviati.goals).to.have.lengthOf(1);
    });

    it('dovrebbe restituire 404 se l\'intervallo non esiste', async () => {
      sinon.stub(db, 'queryOne').resolves(null);

      const req = creaReq({ params: { id: 999 } });
      const res = creaRes();

      await gestore.ottieniPerId(req, res);

      expect(res.statusCode).to.equal(404);
    });
  });

  // ===== POST - Creare un intervallo =====
  describe('crea', () => {
    it('dovrebbe creare un intervallo e restituire 201', async () => {
      const nuovo = { id: 5, user_id: 1, start_date: '2026-03-01', end_date: '2026-03-31' };

      sinon.stub(db, 'queryOne')
        .onFirstCall().resolves({ id: 1 })   // utente esiste
        .onSecondCall().resolves(nuovo);      // intervallo appena creato
      sinon.stub(db, 'insert').resolves(5);
      sinon.stub(db, 'query').resolves([]);

      const req = creaReq({
        body: { user_id: 1, start_date: '2026-03-01', end_date: '2026-03-31', interval_type: 'monthly' }
      });
      const res = creaRes();

      await gestore.crea(req, res);

      expect(res.statusCode).to.equal(201);
    });

    it('dovrebbe restituire 400 se mancano campi obbligatori', async () => {
      const req = creaReq({ body: { user_id: 1 } }); // mancano le date
      const res = creaRes();

      await gestore.crea(req, res);

      expect(res.statusCode).to.equal(400);
      expect(res.datiInviati.error).to.include('obbligatori');
    });

    it('dovrebbe restituire 400 se il tipo di intervallo non è valido', async () => {
      const req = creaReq({
        body: { user_id: 1, start_date: '2026-03-01', end_date: '2026-03-31', interval_type: 'weekly' }
      });
      const res = creaRes();

      await gestore.crea(req, res);

      expect(res.statusCode).to.equal(400);
      expect(res.datiInviati.error).to.include('non valido');
    });

    it('dovrebbe restituire 404 se l\'utente non esiste', async () => {
      sinon.stub(db, 'queryOne').resolves(null);

      const req = creaReq({
        body: { user_id: 999, start_date: '2026-03-01', end_date: '2026-03-31', interval_type: 'monthly' }
      });
      const res = creaRes();

      await gestore.crea(req, res);

      expect(res.statusCode).to.equal(404);
    });

    it('dovrebbe restituire 400 se la data di inizio è dopo la data di fine', async () => {
      sinon.stub(db, 'queryOne').resolves({ id: 1 }); // utente esiste

      const req = creaReq({
        body: { user_id: 1, start_date: '2026-12-31', end_date: '2026-01-01', interval_type: 'monthly' }
      });
      const res = creaRes();

      await gestore.crea(req, res);

      expect(res.statusCode).to.equal(400);
      expect(res.datiInviati.error).to.include('precedente');
    });
  });

  // ===== DELETE - Eliminare un intervallo =====
  describe('elimina', () => {
    it('dovrebbe eliminare l\'intervallo e restituire 204', async () => {
      sinon.stub(db, 'execute').resolves(1);

      const req = creaReq({ params: { id: 1 } });
      const res = creaRes();

      await gestore.elimina(req, res);

      expect(res.statusCode).to.equal(204);
    });

    it('dovrebbe restituire 404 se l\'intervallo non esiste', async () => {
      sinon.stub(db, 'execute').resolves(0);

      const req = creaReq({ params: { id: 999 } });
      const res = creaRes();

      await gestore.elimina(req, res);

      expect(res.statusCode).to.equal(404);
    });
  });

  // ===== POST - Associare un obiettivo a un intervallo =====
  describe('aggiungiObiettivo', () => {
    it('dovrebbe associare l\'obiettivo e restituire 201', async () => {
      sinon.stub(db, 'queryOne')
        .onFirstCall().resolves({ id: 1 })    // intervallo esiste
        .onSecondCall().resolves({ id: 3 })   // obiettivo esiste
        .onThirdCall().resolves(null);         // non è già associato
      sinon.stub(db, 'insert').resolves(10);

      const req = creaReq({ params: { id: 1 }, body: { goal_id: 3 } });
      const res = creaRes();

      await gestore.aggiungiObiettivo(req, res);

      expect(res.statusCode).to.equal(201);
      expect(res.datiInviati.message).to.include('successo');
    });

    it('dovrebbe restituire 409 se l\'obiettivo è già associato', async () => {
      sinon.stub(db, 'queryOne')
        .onFirstCall().resolves({ id: 1 })
        .onSecondCall().resolves({ id: 3 })
        .onThirdCall().resolves({ id: 10 }); // già associato
      
      const req = creaReq({ params: { id: 1 }, body: { goal_id: 3 } });
      const res = creaRes();

      await gestore.aggiungiObiettivo(req, res);

      expect(res.statusCode).to.equal(409);
      expect(res.datiInviati.error).to.include('già associato');
    });

    it('dovrebbe restituire 400 se manca il goal_id', async () => {
      const req = creaReq({ params: { id: 1 }, body: {} });
      const res = creaRes();

      await gestore.aggiungiObiettivo(req, res);

      expect(res.statusCode).to.equal(400);
    });
  });

  // ===== DELETE - Rimuovere un obiettivo da un intervallo =====
  describe('rimuoviObiettivo', () => {
    it('dovrebbe rimuovere l\'associazione e restituire 204', async () => {
      sinon.stub(db, 'execute').resolves(1);

      const req = creaReq({ params: { id: 1, goalId: 3 } });
      const res = creaRes();

      await gestore.rimuoviObiettivo(req, res);

      expect(res.statusCode).to.equal(204);
    });

    it('dovrebbe restituire 404 se l\'associazione non esiste', async () => {
      sinon.stub(db, 'execute').resolves(0);

      const req = creaReq({ params: { id: 1, goalId: 999 } });
      const res = creaRes();

      await gestore.rimuoviObiettivo(req, res);

      expect(res.statusCode).to.equal(404);
    });
  });

  // ===== POST - Completare un obiettivo =====
  describe('completaObiettivo', () => {
    it('dovrebbe completare l\'obiettivo e assegnare le monete', async () => {
      // Ora il controller delega al service: stubo il service invece del database
      sinon.stub(obiettiviService, 'completaObiettivo').resolves({
        user_id: 1,
        coins_reward: 10
      });

      const req = creaReq({
        params: { id: 1, goalId: 3 },
        session: { user: { id: 1, coins: 50 } }
      });
      const res = creaRes();

      await gestore.completaObiettivo(req, res);

      expect(res.statusCode).to.equal(200);
      expect(res.datiInviati.coins_earned).to.equal(10);
      expect(req.session.user.coins).to.equal(60);
      // Verifico che il service sia stato chiamato con i parametri corretti
      expect(obiettiviService.completaObiettivo.calledWith(1, 3)).to.be.true;
    });

    it('dovrebbe restituire 400 se l\'obiettivo è già completato', async () => {
      const err = new Error('Obiettivo già completato');
      err.statusCode = 400;
      sinon.stub(obiettiviService, 'completaObiettivo').rejects(err);

      const req = creaReq({ params: { id: 1, goalId: 3 }, session: {} });
      const res = creaRes();

      await gestore.completaObiettivo(req, res);

      expect(res.statusCode).to.equal(400);
      expect(res.datiInviati.error).to.include('già completato');
    });

    it('dovrebbe restituire 404 se l\'associazione non esiste', async () => {
      const err = new Error('Associazione non trovata');
      err.statusCode = 404;
      sinon.stub(obiettiviService, 'completaObiettivo').rejects(err);

      const req = creaReq({ params: { id: 1, goalId: 999 }, session: {} });
      const res = creaRes();

      await gestore.completaObiettivo(req, res);

      expect(res.statusCode).to.equal(404);
    });
  });
});
