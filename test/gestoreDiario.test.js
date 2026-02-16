const { expect } = require('chai');
const sinon = require('sinon');
const db = require('../config/database');
const gestore = require('../controllers/gestoreDiario');

/*
  Test per il gestore del diario.
  Verifico le operazioni sulle voci del diario, le sessioni
  di meditazione e le donazioni. Ogni test simula il database
  con sinon per isolare la logica del controller.
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
  session: opzioni.session || { user: { id: 1, coins: 100 } }
});

describe('Gestore Diario', () => {

  afterEach(() => {
    sinon.restore();
  });

  // ===== GET - Ottenere le voci del diario =====
  describe('ottieniVociDiario', () => {
    it('dovrebbe restituire le voci del diario dell\'utente', async () => {
      const voci = [
        { id: 1, title: 'Giornata serena', content: 'Oggi mi sono sentito in pace', mood: '😌' },
        { id: 2, title: 'Riflessioni', content: 'Ho meditato 20 minuti', mood: '🙏' }
      ];
      sinon.stub(db, 'query').resolves(voci);

      const req = creaReq();
      const res = creaRes();

      await gestore.ottieniVociDiario(req, res);

      expect(res.statusCode).to.equal(200);
      expect(res.datiInviati).to.have.lengthOf(2);
    });

    it('dovrebbe restituire 500 in caso di errore', async () => {
      sinon.stub(db, 'query').rejects(new Error('Errore database'));

      const req = creaReq();
      const res = creaRes();

      await gestore.ottieniVociDiario(req, res);

      expect(res.statusCode).to.equal(500);
    });
  });

  // ===== POST - Creare una voce nel diario =====
  describe('creaVoce', () => {
    it('dovrebbe creare una nuova voce e restituire 201', async () => {
      const nuovaVoce = { id: 5, title: 'Oggi', content: 'Bella giornata', mood: '😊', user_id: 1 };
      sinon.stub(db, 'insert').resolves(5);
      sinon.stub(db, 'queryOne').resolves(nuovaVoce);

      const req = creaReq({
        body: { title: 'Oggi', content: 'Bella giornata', mood: '😊' }
      });
      const res = creaRes();

      await gestore.creaVoce(req, res);

      expect(res.statusCode).to.equal(201);
      expect(res.datiInviati.title).to.equal('Oggi');
    });

    it('dovrebbe restituire 400 se manca il contenuto', async () => {
      const req = creaReq({ body: { title: 'Test' } }); // manca content
      const res = creaRes();

      await gestore.creaVoce(req, res);

      expect(res.statusCode).to.equal(400);
    });
  });

  // ===== PUT - Aggiornare una voce =====
  describe('aggiornaVoce', () => {
    it('dovrebbe aggiornare la voce e restituire i dati aggiornati', async () => {
      const voceAggiornata = { id: 1, title: 'Titolo modificato', content: 'Contenuto aggiornato', user_id: 1 };
      sinon.stub(db, 'queryOne')
        .onFirstCall().resolves({ id: 1, user_id: 1 }) // voce esiste e appartiene all'utente
        .onSecondCall().resolves(voceAggiornata);
      sinon.stub(db, 'execute').resolves(1);

      const req = creaReq({
        params: { id: 1 },
        body: { title: 'Titolo modificato', content: 'Contenuto aggiornato' }
      });
      const res = creaRes();

      await gestore.aggiornaVoce(req, res);

      expect(res.statusCode).to.equal(200);
      expect(res.datiInviati.title).to.equal('Titolo modificato');
    });

    it('dovrebbe restituire 404 se la voce non esiste', async () => {
      sinon.stub(db, 'queryOne').resolves(null);

      const req = creaReq({ params: { id: 999 }, body: { content: 'Test' } });
      const res = creaRes();

      await gestore.aggiornaVoce(req, res);

      expect(res.statusCode).to.equal(404);
    });
  });

  // ===== DELETE - Eliminare una voce =====
  describe('eliminaVoce', () => {
    it('dovrebbe eliminare la voce e restituire 204', async () => {
      sinon.stub(db, 'queryOne').resolves({ id: 1, user_id: 1 }); // voce dell'utente
      sinon.stub(db, 'execute').resolves(1);

      const req = creaReq({ params: { id: 1 } });
      const res = creaRes();

      await gestore.eliminaVoce(req, res);

      expect(res.statusCode).to.equal(204);
    });

    it('dovrebbe restituire 404 se la voce non appartiene all\'utente', async () => {
      sinon.stub(db, 'execute').resolves(0); // nessuna riga eliminata (voce non dell'utente)

      const req = creaReq({ params: { id: 1 } });
      const res = creaRes();

      await gestore.eliminaVoce(req, res);

      expect(res.statusCode).to.equal(404);
    });
  });

  // ===== POST - Salvare una sessione di meditazione =====
  describe('salvaSessione', () => {
    it('dovrebbe salvare la sessione e assegnare le monete', async () => {
      sinon.stub(db, 'insert').resolves(10);
      sinon.stub(db, 'execute').resolves(1);
      sinon.stub(db, 'queryOne').resolves({ coins: 115 });

      const req = creaReq({
        body: { duration_minutes: 15 },
        session: { user: { id: 1, coins: 100 } }
      });
      const res = creaRes();

      await gestore.salvaSessione(req, res);

      expect(res.statusCode).to.equal(201);
      // 15 minuti = 15 monete
      expect(res.datiInviati.coins_earned).to.equal(15);
    });

    it('dovrebbe restituire 400 se manca la durata', async () => {
      const req = creaReq({ body: {} });
      const res = creaRes();

      await gestore.salvaSessione(req, res);

      expect(res.statusCode).to.equal(400);
    });
  });

  // ===== GET - Statistiche di meditazione =====
  describe('ottieniStatistiche', () => {
    it('dovrebbe restituire le statistiche dell\'utente', async () => {
      sinon.stub(db, 'queryOne').resolves({ total_sessions: 25, total_minutes: 350 });
      sinon.stub(db, 'query').resolves([
        { giorno: '2026-02-08', minuti: 20 },
        { giorno: '2026-02-09', minuti: 15 }
      ]);

      const req = creaReq();
      const res = creaRes();

      await gestore.ottieniStatistiche(req, res);

      expect(res.statusCode).to.equal(200);
      expect(res.datiInviati.total_sessions).to.equal(25);
      expect(res.datiInviati.total_minutes).to.equal(350);
    });
  });

  // ===== POST - Creare una donazione =====
  describe('creaDonazione', () => {
    it('dovrebbe creare una donazione e sottrarre le monete', async () => {
      const donazioneFinta = { id: 5, type: 'tree', coins_spent: 50, project_name: 'Foresta Amazzonica' };
      sinon.stub(db, 'withTransaction').callsFake(async (callback) => {
        const conn = {
          execute: sinon.stub()
            .onFirstCall().resolves([[{ coins: 100 }]])
            .onSecondCall().resolves([{ affectedRows: 1 }])
            .onThirdCall().resolves([{ insertId: 5 }])
        };
        return callback(conn);
      });
      sinon.stub(db, 'queryOne')
        .onFirstCall().resolves({ coins: 50 })
        .onSecondCall().resolves(donazioneFinta);

      const req = creaReq({
        body: { type: 'tree', coins_spent: 50, project_name: 'Foresta Amazzonica' },
        session: { user: { id: 1, coins: 100 } }
      });
      const res = creaRes();

      await gestore.creaDonazione(req, res);

      expect(res.statusCode).to.equal(201);
      expect(req.session.user.coins).to.equal(50);
    });

    it('dovrebbe restituire 400 se le monete sono insufficienti', async () => {
      // Stubo la transazione: la prima execute restituisce 10 monete, il controller deve rifiutare
      sinon.stub(db, 'withTransaction').callsFake(async (callback) => {
        const conn = {
          execute: sinon.stub().onFirstCall().resolves([[{ coins: 10 }]])
        };
        return callback(conn);
      });

      const req = creaReq({
        body: { type: 'tree', coins_spent: 50, project_name: 'Foresta' },
        session: { user: { id: 1, coins: 10 } }
      });
      const res = creaRes();

      await gestore.creaDonazione(req, res);

      expect(res.statusCode).to.equal(400);
      expect(res.datiInviati.error).to.include('insufficienti');
    });
  });

  // ===== GET - Storico donazioni =====
  describe('ottieniDonazioni', () => {
    it('dovrebbe restituire lo storico delle donazioni', async () => {
      const donazioni = [
        { id: 1, type: 'tree', coins_spent: 50, project_name: 'Foresta Amazzonica' }
      ];
      const stats = { total_donated: 50, trees_planted: 1 };
      sinon.stub(db, 'query').resolves(donazioni);
      sinon.stub(db, 'queryOne').resolves(stats);

      const req = creaReq();
      const res = creaRes();

      await gestore.ottieniDonazioni(req, res);

      expect(res.statusCode).to.equal(200);
      expect(res.datiInviati.donations).to.have.lengthOf(1);
    });
  });
});
