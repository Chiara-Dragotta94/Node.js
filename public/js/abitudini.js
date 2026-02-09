/*
  MeditActive - Tracciamento abitudini
  Gestisco il completamento degli obiettivi e l'aggiornamento
  della barra di progresso nell'habit tracker.
*/

document.addEventListener('DOMContentLoaded', () => {
  // Associo l'evento change a tutte le checkbox degli obiettivi
  document.querySelectorAll('.complete-goal-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', gestisciCompletamento);
  });
});

// Gestisco il completamento di un obiettivo: invio la richiesta e aggiorno la UI
async function gestisciCompletamento(e) {
  const checkbox = e.target;
  const idIntervallo = checkbox.dataset.intervalId;
  const idObiettivo = checkbox.dataset.goalId;
  
  if (!checkbox.checked) return;
  
  try {
    const risposta = await fetch(`/api/intervals/${idIntervallo}/goals/${idObiettivo}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (risposta.ok) {
      const dati = await risposta.json();
      
      // Aggiorno l'aspetto dell'obiettivo completato
      const elementoObiettivo = checkbox.closest('.goal-item');
      elementoObiettivo.classList.add('completed');
      
      const divRicompensa = elementoObiettivo.querySelector('.goal-reward');
      if (divRicompensa && !divRicompensa.querySelector('.completed-badge')) {
        divRicompensa.innerHTML += '<span class="completed-badge">✓ Completato</span>';
      }
      
      checkbox.disabled = true;
      aggiornaProgressoIntervallo(idIntervallo);
      
      // Aggiorno le monete nella navbar
      const mostraMonete = document.querySelector('.user-coins');
      if (mostraMonete) {
        const moneteAttuali = parseInt(mostraMonete.textContent.replace(/\D/g, '')) || 0;
        mostraMonete.textContent = `💰 ${moneteAttuali + dati.coins_earned}`;
      }
      
      window.MeditActive.showNotification(`Obiettivo completato! +${dati.coins_earned} monete 🎉`, 'success');
    } else {
      const errore = await risposta.json();
      throw new Error(errore.error);
    }
  } catch (errore) {
    checkbox.checked = false;
    window.MeditActive.showNotification(errore.message, 'error');
  }
}

// Aggiorno la barra di progresso e il testo dell'intervallo
function aggiornaProgressoIntervallo(idIntervallo) {
  const card = document.querySelector(`.interval-tracker[data-interval-id="${idIntervallo}"]`);
  if (!card) return;
  
  const totale = card.querySelectorAll('.goal-item').length;
  const completati = card.querySelectorAll('.goal-item.completed').length;
  
  const testoProgresso = card.querySelector('.progress-text');
  if (testoProgresso) testoProgresso.textContent = `${completati}/${totale} completati`;
  
  const barraProgresso = card.querySelector('.progress-fill');
  if (barraProgresso) {
    const percentuale = totale > 0 ? (completati / totale * 100) : 0;
    barraProgresso.style.width = `${percentuale}%`;
  }
}
