/*
  MeditActive - Timer di meditazione
  Gestisco il timer, le animazioni di respirazione e il salvataggio
  delle sessioni completate con l'assegnazione delle monete.
*/

document.addEventListener('DOMContentLoaded', () => {
  // Stato del timer
  let durata = 20 * 60;          // Default 20 minuti (in secondi)
  let tempoRimanente = durata;
  let intervalloTimer = null;
  let inCorso = false;
  let inPausa = false;
  
  // Riferimenti agli elementi del DOM
  const mostraTempo = document.getElementById('timerTime');
  const mostraStato = document.getElementById('timerStatus');
  const progressoAnello = document.getElementById('timerProgress');
  const cerchioTimer = document.getElementById('timerCircle');
  const btnAvvia = document.getElementById('startBtn');
  const btnPausa = document.getElementById('pauseBtn');
  const btnReset = document.getElementById('resetBtn');
  const selezioneDurata = document.getElementById('durationSelection');
  const guidaRespirazione = document.getElementById('breathingGuide');
  const modalCompletamento = document.getElementById('completionModal');
  const btnDurata = document.querySelectorAll('.duration-btn');
  const btnSuoni = document.querySelectorAll('.sound-btn');
  
  // Circonferenza per l'anello di progresso (2 * PI * raggio)
  const circonferenza = 2 * Math.PI * 90;
  
  if (progressoAnello) {
    progressoAnello.style.strokeDasharray = circonferenza;
    progressoAnello.style.strokeDashoffset = 0;
  }
  
  // Controllo se nella URL c'è un parametro durata
  const parametriUrl = new URLSearchParams(window.location.search);
  const durataUrl = parametriUrl.get('duration');
  if (durataUrl) {
    impostaDurata(parseInt(durataUrl));
    btnDurata.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.minutes === durataUrl);
    });
  }
  
  // Selezione della durata
  btnDurata.forEach(btn => {
    btn.addEventListener('click', () => {
      if (inCorso) return;
      btnDurata.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      impostaDurata(parseInt(btn.dataset.minutes));
    });
  });
  
  // Selezione del suono di sottofondo
  btnSuoni.forEach(btn => {
    btn.addEventListener('click', () => {
      btnSuoni.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      // In un'app reale qui attiverei il suono selezionato
    });
  });
  
  if (btnAvvia) btnAvvia.addEventListener('click', avviaTimer);
  if (btnPausa) btnPausa.addEventListener('click', mettiInPausa);
  if (btnReset) btnReset.addEventListener('click', resetTimer);
  
  const btnSalvaSessione = document.getElementById('saveSession');
  if (btnSalvaSessione) btnSalvaSessione.addEventListener('click', salvaSessione);
  
  const btnChiudiModal = document.getElementById('closeModal');
  if (btnChiudiModal) {
    btnChiudiModal.addEventListener('click', () => {
      modalCompletamento.classList.add('hidden');
      resetTimer();
    });
  }
  
  function impostaDurata(minuti) {
    durata = minuti * 60;
    tempoRimanente = durata;
    aggiornaMostraTempo();
  }
  
  function avviaTimer() {
    if (inCorso && !inPausa) return;
    
    inCorso = true;
    inPausa = false;
    
    btnAvvia.classList.add('hidden');
    btnPausa.classList.remove('hidden');
    btnReset.classList.remove('hidden');
    selezioneDurata.style.opacity = '0.5';
    selezioneDurata.style.pointerEvents = 'none';
    
    mostraStato.textContent = 'In corso...';
    guidaRespirazione.classList.remove('hidden');
    avviaAnimazioneRespirazione();
    
    intervalloTimer = setInterval(() => {
      tempoRimanente--;
      aggiornaMostraTempo();
      aggiornaProgresso();
      
      if (tempoRimanente <= 0) {
        completaSessione();
      }
    }, 1000);
  }
  
  function mettiInPausa() {
    inPausa = true;
    clearInterval(intervalloTimer);
    
    btnPausa.innerHTML = '<span class="btn-icon">▶</span><span class="btn-text">Riprendi</span>';
    btnPausa.classList.remove('timer-pause');
    btnPausa.classList.add('timer-start');
    mostraStato.textContent = 'In pausa';
    
    btnPausa.onclick = riprendi;
  }
  
  function riprendi() {
    inPausa = false;
    
    btnPausa.innerHTML = '<span class="btn-icon">⏸</span><span class="btn-text">Pausa</span>';
    btnPausa.classList.add('timer-pause');
    btnPausa.classList.remove('timer-start');
    mostraStato.textContent = 'In corso...';
    
    intervalloTimer = setInterval(() => {
      tempoRimanente--;
      aggiornaMostraTempo();
      aggiornaProgresso();
      if (tempoRimanente <= 0) completaSessione();
    }, 1000);
    
    btnPausa.onclick = mettiInPausa;
  }
  
  function resetTimer() {
    clearInterval(intervalloTimer);
    inCorso = false;
    inPausa = false;
    tempoRimanente = durata;
    
    btnAvvia.classList.remove('hidden');
    btnPausa.classList.add('hidden');
    btnReset.classList.add('hidden');
    btnPausa.innerHTML = '<span class="btn-icon">⏸</span><span class="btn-text">Pausa</span>';
    btnPausa.onclick = mettiInPausa;
    selezioneDurata.style.opacity = '1';
    selezioneDurata.style.pointerEvents = 'auto';
    guidaRespirazione.classList.add('hidden');
    
    mostraStato.textContent = 'Pronto';
    aggiornaMostraTempo();
    if (progressoAnello) progressoAnello.style.strokeDashoffset = 0;
  }
  
  function aggiornaMostraTempo() {
    const minuti = Math.floor(tempoRimanente / 60);
    const secondi = tempoRimanente % 60;
    mostraTempo.textContent = `${minuti.toString().padStart(2, '0')}:${secondi.toString().padStart(2, '0')}`;
  }
  
  function aggiornaProgresso() {
    const progresso = tempoRimanente / durata;
    const offset = circonferenza * progresso;
    if (progressoAnello) progressoAnello.style.strokeDashoffset = circonferenza - offset;
  }
  
  function completaSessione() {
    clearInterval(intervalloTimer);
    inCorso = false;
    
    mostraStato.textContent = 'Completato!';
    guidaRespirazione.classList.add('hidden');
    riproduciSuonoCompletamento();
    
    // Mostro il modale con i dettagli della sessione
    const minutiCompletati = Math.floor(durata / 60);
    document.getElementById('completedMinutes').textContent = minutiCompletati;
    document.getElementById('coinsEarned').textContent = minutiCompletati;
    modalCompletamento.classList.remove('hidden');
  }
  
  // Salvo la sessione nel database e aggiorno le monete
  async function salvaSessione() {
    try {
      const minutiCompletati = Math.floor(durata / 60);
      const risposta = await fetch('/api/diary/meditation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration_minutes: minutiCompletati })
      });
      
      if (risposta.ok) {
        const dati = await risposta.json();
        window.MeditActive.showNotification(`Sessione salvata! +${dati.coins_earned} monete`, 'success');
        
        // Aggiorno le monete mostrate nella navbar
        const mostraMonete = document.querySelector('.user-coins');
        if (mostraMonete) {
          const moneteAttuali = parseInt(mostraMonete.textContent.replace(/\D/g, '')) || 0;
          mostraMonete.textContent = `💰 ${moneteAttuali + dati.coins_earned}`;
        }
      } else {
        throw new Error('Errore nel salvataggio');
      }
    } catch (errore) {
      window.MeditActive.showNotification(errore.message, 'error');
    }
    
    modalCompletamento.classList.add('hidden');
    resetTimer();
  }
  
  // Animazione della guida respiratoria
  let faseRespirazione = 0;
  let intervalloRespirazione;
  
  function avviaAnimazioneRespirazione() {
    const testoRespiro = document.getElementById('breathText');
    const fasi = ['Inspira', 'Trattieni', 'Espira', 'Trattieni'];
    const durate = [4000, 2000, 4000, 2000];
    
    function aggiornaFase() {
      if (testoRespiro) testoRespiro.textContent = fasi[faseRespirazione];
      const prossima = (faseRespirazione + 1) % fasi.length;
      intervalloRespirazione = setTimeout(() => {
        faseRespirazione = prossima;
        aggiornaFase();
      }, durate[faseRespirazione]);
    }
    aggiornaFase();
  }
  
  // Feedback visivo al completamento (in un'app reale qui suonerebbe una campana)
  function riproduciSuonoCompletamento() {
    if (cerchioTimer) {
      cerchioTimer.style.animation = 'pulse 0.5s ease 3';
      setTimeout(() => { cerchioTimer.style.animation = ''; }, 1500);
    }
  }
  
  // Aggiungo il gradiente all'SVG del timer
  const svg = document.querySelector('.timer-svg');
  if (svg) {
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#FF8C42"/>
        <stop offset="100%" style="stop-color:#5A9E94"/>
      </linearGradient>
    `;
    svg.insertBefore(defs, svg.firstChild);
  }
});
