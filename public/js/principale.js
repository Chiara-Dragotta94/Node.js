/*
  MeditActive - Script principale
  Qui gestisco le funzionalità comuni a tutte le pagine:
  navigazione mobile, notifiche, tooltip e utility per le API.
*/

document.addEventListener('DOMContentLoaded', () => {
  inizializzaNavMobile();
  nascondiAvvisiAutomaticamente();
  inizializzaTooltip();
});

// Gestisco il menu hamburger su mobile
function inizializzaNavMobile() {
  const toggleBtn = document.getElementById('navToggle');
  const menu = document.getElementById('navMenu');
  
  if (toggleBtn && menu) {
    toggleBtn.addEventListener('click', () => {
      menu.classList.toggle('active');
      toggleBtn.classList.toggle('active');
    });
    
    // Chiudo il menu se clicco fuori
    document.addEventListener('click', (e) => {
      if (!toggleBtn.contains(e.target) && !menu.contains(e.target)) {
        menu.classList.remove('active');
        toggleBtn.classList.remove('active');
      }
    });
    
    // Chiudo il menu quando clicco su un link
    menu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        menu.classList.remove('active');
        toggleBtn.classList.remove('active');
      });
    });
  }
}

// Nascondo gli avvisi automaticamente dopo 5 secondi
function nascondiAvvisiAutomaticamente() {
  const avvisi = document.querySelectorAll('.alert');
  avvisi.forEach(avviso => {
    setTimeout(() => {
      avviso.style.opacity = '0';
      avviso.style.transform = 'translateY(-10px)';
      setTimeout(() => avviso.remove(), 300);
    }, 5000);
  });
}

// Inizializzo i tooltip sugli elementi con data-tooltip
function inizializzaTooltip() {
  const elementi = document.querySelectorAll('[data-tooltip]');
  elementi.forEach(el => {
    el.addEventListener('mouseenter', mostraTooltip);
    el.addEventListener('mouseleave', nascondiTooltip);
  });
}

function mostraTooltip(e) {
  const testo = e.target.getAttribute('data-tooltip');
  const tooltip = document.createElement('div');
  tooltip.className = 'tooltip';
  tooltip.textContent = testo;
  tooltip.style.cssText = `
    position: absolute;
    background: #3D3A36;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    font-size: 0.875rem;
    z-index: 1000;
    pointer-events: none;
  `;
  document.body.appendChild(tooltip);
  
  const rect = e.target.getBoundingClientRect();
  tooltip.style.top = (rect.top - tooltip.offsetHeight - 8) + 'px';
  tooltip.style.left = (rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2)) + 'px';
  
  e.target._tooltip = tooltip;
}

function nascondiTooltip(e) {
  if (e.target._tooltip) {
    e.target._tooltip.remove();
    delete e.target._tooltip;
  }
}

/*
  Helper per le chiamate API.
  Centralizzo qui tutte le fetch per non ripetere 
  la stessa logica in ogni pagina.
*/
const api = {
  async get(url) {
    const risposta = await fetch(url);
    if (!risposta.ok) throw new Error(await risposta.text());
    return risposta.json();
  },
  
  async post(url, dati) {
    const risposta = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dati)
    });
    if (!risposta.ok) {
      const errore = await risposta.json();
      throw new Error(errore.error || 'Errore nella richiesta');
    }
    return risposta.json();
  },
  
  async put(url, dati) {
    const risposta = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dati)
    });
    if (!risposta.ok) {
      const errore = await risposta.json();
      throw new Error(errore.error || 'Errore nella richiesta');
    }
    return risposta.json();
  },
  
  async delete(url) {
    const risposta = await fetch(url, { method: 'DELETE' });
    if (!risposta.ok && risposta.status !== 204) {
      const errore = await risposta.json();
      throw new Error(errore.error || 'Errore nella richiesta');
    }
    return true;
  }
};

// Mostro una notifica temporanea in alto a destra
function mostraNotifica(messaggio, tipo = 'success') {
  const notifica = document.createElement('div');
  notifica.className = `alert alert-${tipo} animate-slide`;
  notifica.style.cssText = `
    position: fixed;
    top: 100px;
    right: 20px;
    z-index: 1000;
    max-width: 400px;
  `;
  notifica.innerHTML = `
    <span class="alert-icon">${tipo === 'success' ? '✓' : '!'}</span>
    ${messaggio}
    <button class="alert-close" onclick="this.parentElement.remove()">×</button>
  `;
  document.body.appendChild(notifica);
  
  setTimeout(() => {
    notifica.style.opacity = '0';
    notifica.style.transform = 'translateX(100px)';
    setTimeout(() => notifica.remove(), 300);
  }, 4000);
}

// Formatto una data in italiano (es: "5 febbraio 2026")
function formattaData(stringaData) {
  const opzioni = { day: 'numeric', month: 'long', year: 'numeric' };
  return new Date(stringaData).toLocaleDateString('it-IT', opzioni);
}

// Formatto i secondi in MM:SS
function formattaTempo(secondi) {
  const min = Math.floor(secondi / 60);
  const sec = secondi % 60;
  return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

// Espongo le funzioni globalmente per gli altri script
window.MeditActive = {
  api,
  showNotification: mostraNotifica,
  formatDate: formattaData,
  formatTime: formattaTempo
};
