/*
  MeditActive - Diario personale
  Gestisco la creazione, modifica e cancellazione
  delle voci del diario dell'utente.
*/

document.addEventListener('DOMContentLoaded', () => {
  // Form per nuova voce
  const formDiario = document.getElementById('diaryForm');
  if (formDiario) formDiario.addEventListener('submit', creaVoce);
  
  // Spunti di scrittura
  document.querySelectorAll('.prompt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const spunto = btn.dataset.prompt;
      const areaContenuto = document.getElementById('entryContent');
      if (areaContenuto) {
        areaContenuto.value = spunto + ' ';
        areaContenuto.focus();
      }
    });
  });
  
  // Bottoni modifica e cancellazione
  document.querySelectorAll('.edit-entry').forEach(btn => {
    btn.addEventListener('click', () => apriModalModifica(btn.dataset.entryId));
  });
  document.querySelectorAll('.delete-entry').forEach(btn => {
    btn.addEventListener('click', () => eliminaVoce(btn.dataset.entryId));
  });
  
  // Form di modifica
  const formModifica = document.getElementById('editForm');
  if (formModifica) formModifica.addEventListener('submit', aggiornaVoce);
});

// Creo una nuova voce nel diario
async function creaVoce(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const dati = {
    title: formData.get('title'),
    content: formData.get('content'),
    mood: formData.get('mood'),
    meditation_minutes: parseInt(formData.get('meditation_minutes')) || 0
  };
  
  if (!dati.content.trim()) {
    window.MeditActive.showNotification('Il contenuto è obbligatorio', 'error');
    return;
  }
  
  try {
    const risposta = await fetch('/api/diary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dati)
    });
    
    if (risposta.ok) {
      window.MeditActive.showNotification('Voce aggiunta al diario! 📝', 'success');
      setTimeout(() => window.location.reload(), 1000);
    } else {
      const errore = await risposta.json();
      throw new Error(errore.error);
    }
  } catch (errore) {
    window.MeditActive.showNotification(errore.message, 'error');
  }
}

// Apro il modale con i dati della voce da modificare
async function apriModalModifica(idVoce) {
  try {
    const risposta = await fetch(`/api/diary/${idVoce}`);
    if (!risposta.ok) throw new Error('Errore nel caricamento');
    
    const voce = await risposta.json();
    
    document.getElementById('editEntryId').value = voce.id;
    document.getElementById('editTitle').value = voce.title || '';
    document.getElementById('editContent').value = voce.content;
    document.getElementById('editMood').value = voce.mood || '';
    document.getElementById('editMeditationMinutes').value = voce.meditation_minutes || 0;
    
    document.getElementById('editModal').classList.remove('hidden');
  } catch (errore) {
    window.MeditActive.showNotification(errore.message, 'error');
  }
}

function chiudiModalModifica() {
  document.getElementById('editModal').classList.add('hidden');
}

document.querySelector('#editModal .modal-overlay')?.addEventListener('click', chiudiModalModifica);

// Salvo le modifiche a una voce del diario
async function aggiornaVoce(e) {
  e.preventDefault();
  
  const idVoce = document.getElementById('editEntryId').value;
  const dati = {
    title: document.getElementById('editTitle').value,
    content: document.getElementById('editContent').value,
    mood: document.getElementById('editMood').value || null,
    meditation_minutes: parseInt(document.getElementById('editMeditationMinutes').value) || 0
  };
  
  try {
    const risposta = await fetch(`/api/diary/${idVoce}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dati)
    });
    
    if (risposta.ok) {
      window.MeditActive.showNotification('Voce aggiornata!', 'success');
      chiudiModalModifica();
      setTimeout(() => window.location.reload(), 1000);
    } else {
      const errore = await risposta.json();
      throw new Error(errore.error);
    }
  } catch (errore) {
    window.MeditActive.showNotification(errore.message, 'error');
  }
}

// Elimino una voce dopo conferma dell'utente
async function eliminaVoce(idVoce) {
  if (!confirm('Sei sicuro di voler eliminare questa voce?')) return;
  
  try {
    const risposta = await fetch(`/api/diary/${idVoce}`, { method: 'DELETE' });
    
    if (risposta.ok || risposta.status === 204) {
      window.MeditActive.showNotification('Voce eliminata', 'success');
      document.querySelector(`[data-entry-id="${idVoce}"]`)?.remove();
    } else {
      throw new Error('Errore nell\'eliminazione');
    }
  } catch (errore) {
    window.MeditActive.showNotification(errore.message, 'error');
  }
}
