/*
  MeditActive - Gestione obiettivi
  Qui gestisco la creazione di intervalli, l'associazione
  degli obiettivi e l'eliminazione degli intervalli.
*/

document.addEventListener('DOMContentLoaded', () => {
  // Imposto le date di default
  const oggi = new Date().toISOString().split('T')[0];
  const inputInizio = document.getElementById('startDate');
  const inputFine = document.getElementById('endDate');
  
  if (inputInizio) inputInizio.value = oggi;
  if (inputFine) {
    const fineMese = new Date();
    fineMese.setMonth(fineMese.getMonth() + 1);
    fineMese.setDate(0);
    inputFine.value = fineMese.toISOString().split('T')[0];
  }
  
  // Aggiorno la data di fine in base al tipo di intervallo selezionato
  const selectTipo = document.getElementById('intervalType');
  if (selectTipo) {
    selectTipo.addEventListener('change', (e) => {
      const tipo = e.target.value;
      let dataFine = new Date();
      
      switch (tipo) {
        case 'daily': dataFine = new Date(); break;
        case 'monthly':
          dataFine.setMonth(dataFine.getMonth() + 1);
          dataFine.setDate(0);
          break;
        case 'yearly':
          dataFine.setFullYear(dataFine.getFullYear() + 1);
          dataFine.setDate(dataFine.getDate() - 1);
          break;
      }
      if (inputFine) inputFine.value = dataFine.toISOString().split('T')[0];
    });
  }
  
  // Form per creare un nuovo intervallo
  const formIntervallo = document.getElementById('createIntervalForm');
  if (formIntervallo) formIntervallo.addEventListener('submit', creaIntervallo);
  
  // Bottoni per aggiungere obiettivi ad un intervallo
  document.querySelectorAll('.add-goal-btn').forEach(btn => {
    btn.addEventListener('click', () => mostraModalObiettivo(btn.dataset.goalId));
  });
  
  // Bottoni per eliminare un intervallo
  document.querySelectorAll('.delete-interval').forEach(btn => {
    btn.addEventListener('click', () => eliminaIntervallo(btn.dataset.intervalId));
  });
});

// Creo un nuovo intervallo di obiettivi
async function creaIntervallo(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const dati = {
    user_id: userId,
    start_date: formData.get('start_date'),
    end_date: formData.get('end_date'),
    interval_type: formData.get('interval_type')
  };
  
  try {
    const risposta = await fetch('/api/intervals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dati)
    });
    
    if (risposta.ok) {
      window.MeditActive.showNotification('Intervallo creato con successo!', 'success');
      setTimeout(() => window.location.reload(), 1000);
    } else {
      const errore = await risposta.json();
      throw new Error(errore.error);
    }
  } catch (errore) {
    window.MeditActive.showNotification(errore.message, 'error');
  }
}

// Mostro il modale per scegliere a quale intervallo associare l'obiettivo
let idObiettivoSelezionato = null;

function mostraModalObiettivo(idObiettivo) {
  idObiettivoSelezionato = idObiettivo;
  const modal = document.getElementById('addGoalModal');
  const listaIntervalli = document.getElementById('modalIntervals');
  
  if (!userIntervals || userIntervals.length === 0) {
    window.MeditActive.showNotification('Crea prima un intervallo per aggiungere obiettivi', 'error');
    return;
  }
  
  listaIntervalli.innerHTML = userIntervals.map(intervallo => `
    <button class="btn btn-outline" onclick="aggiungiObiettivoAIntervallo(${intervallo.id})" style="margin: 5px; width: 100%;">
      ${ottieniEtichettaTipo(intervallo.interval_type)} - 
      ${new Date(intervallo.start_date).toLocaleDateString('it-IT')} - 
      ${new Date(intervallo.end_date).toLocaleDateString('it-IT')}
    </button>
  `).join('');
  
  modal.classList.remove('hidden');
}

function chiudiModal() {
  document.getElementById('addGoalModal').classList.add('hidden');
  idObiettivoSelezionato = null;
}

document.querySelector('.modal-overlay')?.addEventListener('click', chiudiModal);

// Associo l'obiettivo selezionato all'intervallo scelto
async function aggiungiObiettivoAIntervallo(idIntervallo) {
  if (!idObiettivoSelezionato) return;
  
  try {
    const risposta = await fetch(`/api/intervals/${idIntervallo}/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal_id: idObiettivoSelezionato })
    });
    
    if (risposta.ok) {
      window.MeditActive.showNotification('Obiettivo aggiunto!', 'success');
      chiudiModal();
      setTimeout(() => window.location.reload(), 1000);
    } else {
      const errore = await risposta.json();
      throw new Error(errore.error);
    }
  } catch (errore) {
    window.MeditActive.showNotification(errore.message, 'error');
  }
}

// Elimino un intervallo dopo conferma
async function eliminaIntervallo(idIntervallo) {
  if (!confirm('Sei sicuro di voler eliminare questo intervallo?')) return;
  
  try {
    const risposta = await fetch(`/api/intervals/${idIntervallo}`, { method: 'DELETE' });
    
    if (risposta.ok || risposta.status === 204) {
      window.MeditActive.showNotification('Intervallo eliminato', 'success');
      document.querySelector(`[data-interval-id="${idIntervallo}"]`)?.remove();
    } else {
      throw new Error('Errore nell\'eliminazione');
    }
  } catch (errore) {
    window.MeditActive.showNotification(errore.message, 'error');
  }
}

// Traduco il tipo di intervallo in un'etichetta leggibile
function ottieniEtichettaTipo(tipo) {
  const etichette = {
    daily: '☀️ Giornaliero',
    monthly: '📅 Mensile',
    yearly: '🌟 Annuale'
  };
  return etichette[tipo] || tipo;
}
