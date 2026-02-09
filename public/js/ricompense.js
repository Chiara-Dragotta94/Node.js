/*
  MeditActive - Ricompense e donazioni
  Qui gestisco le donazioni: l'utente spende monete virtuali 
  per piantare alberi o sostenere progetti sociali.
*/

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.donate-btn').forEach(btn => {
    btn.addEventListener('click', gestisciDonazione);
  });
});

// Processo la donazione: controllo le monete, confermo e invio al server
async function gestisciDonazione(e) {
  const btn = e.target;
  const nomeProgetto = btn.dataset.projectName;
  const tipoProgetto = btn.dataset.projectType;
  const costoProgetto = parseInt(btn.dataset.projectCost);
  
  // Verifico che l'utente abbia monete sufficienti
  if (userCoins < costoProgetto) {
    window.MeditActive.showNotification('Monete insufficienti! Continua a meditare per guadagnarne di più.', 'error');
    return;
  }
  
  // Chiedo conferma prima di procedere
  const etichettaTipo = tipoProgetto === 'tree' ? 'piantare un albero' : 'donare';
  if (!confirm(`Vuoi usare ${costoProgetto} monete per ${etichettaTipo} con "${nomeProgetto}"?`)) {
    return;
  }
  
  try {
    const risposta = await fetch('/api/diary/donations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: tipoProgetto,
        coins_spent: costoProgetto,
        project_name: nomeProgetto
      })
    });
    
    if (risposta.ok) {
      userCoins -= costoProgetto;
      
      // Aggiorno il saldo mostrato
      document.querySelector('.balance-amount').textContent = userCoins;
      
      const mostraMoneteNav = document.querySelector('.user-coins');
      if (mostraMoneteNav) mostraMoneteNav.textContent = `💰 ${userCoins}`;
      
      // Disabilito i bottoni per i progetti che non posso più permettermi
      document.querySelectorAll('.donate-btn').forEach(bottone => {
        const costo = parseInt(bottone.dataset.projectCost);
        if (userCoins < costo) {
          bottone.disabled = true;
          bottone.textContent = 'Monete insufficienti';
        }
      });
      
      const messaggio = tipoProgetto === 'tree' 
        ? '🌳 Albero piantato con successo! Grazie per il tuo contributo!' 
        : '💚 Donazione effettuata con successo! Grazie per il tuo contributo!';
      
      window.MeditActive.showNotification(messaggio, 'success');
      setTimeout(() => window.location.reload(), 2000);
    } else {
      const errore = await risposta.json();
      throw new Error(errore.error);
    }
  } catch (errore) {
    window.MeditActive.showNotification(errore.message, 'error');
  }
}
