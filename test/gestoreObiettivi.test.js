const { expect } = require('chai');
const sinon = require('sinon');
const db = require('../config/database');
const gestore = require('../controllers/gestoreObiettivi');

/*
  Test per il gestore degli obiettivi.
  Verifico che il CRUD funzioni correttamente e che i filtri
  per categoria restituiscano i risultati attesi.
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
  query: opzioni.query || {}
});

describe('Gestore Obiettivi', () => {

  afterEach(() => {
    sinon.restore();
  });

  // ===== GET - Ottenere tutti gli obiettivi =====
  describe('ottieniTutti', () => {
    it('dovrebbe restituire tutti gli obiettivi senza filtri', async () => {
      const obiettivi = [
        { id: 1, name: 'Meditazione mattutina', category: 'daily', coins_reward: 10 },
        { id: 2, name: 'Maratona meditazione', category: 'monthly', coins_reward: 100 }
      ];
      sinon.stub(db, 'query').resolves(obiettivi);

      const req = creaReq({ query: {} });
      const res = creaRes();

      await gestore.ottieniTutti(req, res);

      expect(res.statusCode).to.equal(200);
      expect(res.datiInviati).to.have.lengthOf(2);
      // Verifico che la query non contenga un filtro WHERE
      expect(db.query.firstCall.args[1]).to.have.lengthOf(0);
    });

    it('dovrebbe filtrare per categoria quando specificata', async () => {
      const obiettiviGiornalieri = [
        { id: 1, name: 'Meditazione mattutina', category: 'daily', coins_reward: 10 }
      ];
      sinon.stub(db, 'query').resolves(obiettiviGiornalieri);

      const req = creaReq({ query: { category: 'daily' } });
      const res = creaRes();

      await gestore.ottieniTutti(req, res);

      expect(res.statusCode).to.equal(200);
      // Verifico che il parametro 'daily' sia stato passato alla query
      expect(db.query.firstCall.args[1]).to.include('daily');
    });

    it('dovrebbe ignorare categorie non valide', async () => {
      sinon.stub(db, 'query').resolves([]);

      const req = creaReq({ query: { category: 'categoria_inventata' } });
      const res = creaRes();

      await gestore.ottieniTutti(req, res);

      // Non deve passare parametri se la categoria non è valida
      expect(db.query.firstCall.args[1]).to.have.lengthOf(0);
    });
  });

  // ===== GET - Ottenere un obiettivo per ID =====
  describe('ottieniPerId', () => {
    it('dovrebbe restituire l\'obiettivo se esiste', async () => {
      const obiettivo = { id: 1, name: 'Meditazione mattutina', category: 'daily' };
      sinon.stub(db, 'queryOne').resolves(obiettivo);

      const req = creaReq({ params: { id: 1 } });
      const res = creaRes();

      await gestore.ottieniPerId(req, res);

      expect(res.statusCode).to.equal(200);
      expect(res.datiInviati.name).to.equal('Meditazione mattutina');
    });

    it('dovrebbe restituire 404 se l\'obiettivo non esiste', async () => {
      sinon.stub(db, 'queryOne').resolves(null);

      const req = creaReq({ params: { id: 999 } });
      const res = creaRes();

      await gestore.ottieniPerId(req, res);

      expect(res.statusCode).to.equal(404);
    });
  });

  // ===== POST - Creare un nuovo obiettivo =====
  describe('crea', () => {
    it('dovrebbe creare un obiettivo e restituire 201', async () => {
      const nuovo = { id: 20, name: 'Yoga serale', category: 'daily', coins_reward: 15 };
      sinon.stub(db, 'insert').resolves(20);
      sinon.stub(db, 'queryOne').resolves(nuovo);

      const req = creaReq({
        body: { name: 'Yoga serale', description: 'Sessione di yoga rilassante', category: 'daily', coins_reward: 15 }
      });
      const res = creaRes();

      await gestore.crea(req, res);

      expect(res.statusCode).to.equal(201);
      expect(res.datiInviati.name).to.equal('Yoga serale');
    });

    it('dovrebbe restituire 400 se manca il nome', async () => {
      const req = creaReq({ body: { category: 'daily' } });
      const res = creaRes();

      await gestore.crea(req, res);

      expect(res.statusCode).to.equal(400);
    });

    it('dovrebbe restituire 400 se la categoria non è valida', async () => {
      const req = creaReq({ body: { name: 'Test', category: 'invalida' } });
      const res = creaRes();

      await gestore.crea(req, res);

      expect(res.statusCode).to.equal(400);
      expect(res.datiInviati.error).to.include('non valida');
    });
  });

  // ===== PUT - Aggiornare un obiettivo =====
  describe('aggiorna', () => {
    it('dovrebbe aggiornare e restituire l\'obiettivo modificato', async () => {
      const aggiornato = { id: 1, name: 'Meditazione pomeridiana', category: 'daily', coins_reward: 15 };
      sinon.stub(db, 'queryOne')
        .onFirstCall().resolves({ id: 1 })
        .onSecondCall().resolves(aggiornato);
      sinon.stub(db, 'execute').resolves(1);

      const req = creaReq({
        params: { id: 1 },
        body: { name: 'Meditazione pomeridiana', coins_reward: 15 }
      });
      const res = creaRes();

      await gestore.aggiorna(req, res);

      expect(res.statusCode).to.equal(200);
      expect(res.datiInviati.name).to.equal('Meditazione pomeridiana');
    });

    it('dovrebbe restituire 404 se l\'obiettivo non esiste', async () => {
      sinon.stub(db, 'queryOne').resolves(null);

      const req = creaReq({ params: { id: 999 }, body: { name: 'Test' } });
      const res = creaRes();

      await gestore.aggiorna(req, res);

      expect(res.statusCode).to.equal(404);
    });
  });

  // ===== DELETE - Eliminare un obiettivo =====
  describe('elimina', () => {
    it('dovrebbe eliminare l\'obiettivo e restituire 204', async () => {
      sinon.stub(db, 'execute').resolves(1);

      const req = creaReq({ params: { id: 1 } });
      const res = creaRes();

      await gestore.elimina(req, res);

      expect(res.statusCode).to.equal(204);
    });

    it('dovrebbe restituire 404 se l\'obiettivo non esiste', async () => {
      sinon.stub(db, 'execute').resolves(0);

      const req = creaReq({ params: { id: 999 } });
      const res = creaRes();

      await gestore.elimina(req, res);

      expect(res.statusCode).to.equal(404);
    });
  });

  // ===== GET - Obiettivi raggruppati per categoria =====
  describe('ottieniPerCategoria', () => {
    it('dovrebbe raggruppare gli obiettivi in daily, monthly, yearly', async () => {
      const tutti = [
        { id: 1, name: 'Meditazione', category: 'daily' },
        { id: 2, name: 'Maratona', category: 'monthly' },
        { id: 3, name: 'Maestro Zen', category: 'yearly' }
      ];
      sinon.stub(db, 'query').resolves(tutti);

      const req = creaReq();
      const res = creaRes();

      await gestore.ottieniPerCategoria(req, res);

      expect(res.statusCode).to.equal(200);
      expect(res.datiInviati.daily).to.have.lengthOf(1);
      expect(res.datiInviati.monthly).to.have.lengthOf(1);
      expect(res.datiInviati.yearly).to.have.lengthOf(1);
    });
  });
});
