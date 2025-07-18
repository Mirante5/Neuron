(function() {
    'use strict';

    const SCRIPT_ID = 'tratarTriar';
    const CONFIG_KEY = 'neuronUserConfig';
    let observer = null;

    async function isScriptAtivo() {
        if (!chrome.runtime?.id) return false;
        try {
            const result = await chrome.storage.local.get(CONFIG_KEY);
            const config = result[CONFIG_KEY] || {};
            return config.masterEnableNeuron !== false && config.featureSettings?.[SCRIPT_ID]?.enabled !== false;
        } catch {
            return false;
        }
    }

    function showCopyNotification(text) {
        const notification = document.createElement('div');
        notification.innerText = text;
        Object.assign(notification.style, {
            position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
            backgroundColor: '#28a745', color: 'white', padding: '10px 20px',
            borderRadius: '5px', zIndex: '9999', transition: 'opacity 0.5s ease', opacity: '1'
        });
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 500);
        }, 2000);
    }

    function handleLinkClick(event) {
        event.preventDefault();
        const numeroParaCopiar = event.target.innerText;
        navigator.clipboard.writeText(numeroParaCopiar).then(() => {
            showCopyNotification(`Número ${numeroParaCopiar} copiado!`);
        });
    }

    const gerenciarComportamentoDosLinks = async (forceRemove = false) => {
        const deveAtivar = !forceRemove && await isScriptAtivo();
        const links = document.querySelectorAll('a[id*="lvwTriagem_lnkNumero_"]');
        
        links.forEach(link => {
            link.removeEventListener('click', handleLinkClick);
            if (deveAtivar) {
                link.addEventListener('click', handleLinkClick);
                link.style.cursor = 'copy';
            } else {
                link.style.cursor = 'pointer';
            }
        });
    };

    async function gerenciarEstado() {
        if (await isScriptAtivo()) {
            if (observer) return;
            const alvo = document.getElementById('ConteudoForm_ConteudoGeral_ConteudoFormComAjax_upTriagem');
            if (alvo) {
                observer = new MutationObserver(() => gerenciarComportamentoDosLinks());
                observer.observe(alvo, { childList: true, subtree: true });
                gerenciarComportamentoDosLinks();
            }
        } else {
            if (observer) {
                observer.disconnect();
                observer = null;
            }
            gerenciarComportamentoDosLinks(true);
        }
    }

    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (!chrome.runtime?.id) return;
        if (namespace === 'local' && changes[CONFIG_KEY]) {
            gerenciarEstado();
        }
    });

    gerenciarEstado();
})();