// Neuron/scripts/content.js
'use strict';

// Responde a pings do background script.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'ping') {
    // Verifica 'masterEnableNeuron' da configuração centralizada no storage.
    chrome.storage.local.get('masterEnableNeuron', (result) => {
      if (chrome.runtime.lastError) {
        console.warn(
          `Neuron (content.js): Erro ao ler 'masterEnableNeuron': ${chrome.runtime.lastError.message}`
        );
        // Resposta padrão em caso de erro para manter consistência.
        sendResponse({ status: 'alive', masterEnabled: true });
        return;
      }
      // 'masterEnableNeuron' define o estado global da extensão.
      const masterEnabled = result.masterEnableNeuron !== false;
      sendResponse({ status: 'alive', masterEnabled: masterEnabled });
    });
    return true; // Resposta assíncrona.
  }
  return false;
});

// Reage a mudanças na configuração centralizada.
chrome.storage.onChanged.addListener((changes, namespace) => {
  // Se 'masterEnableNeuron' mudou, notifica o background para atualizar o ícone.
  if (namespace === 'local' && changes.masterEnableNeuron) {
    console.log(
      "Neuron (content.js): 'masterEnableNeuron' (config central) alterado. Notificando background."
    );
    try {
      chrome.runtime.sendMessage({ action: 'updateIcon' });
    } catch (error) {
      // Adicionado para robustez, embora incomum para msg ao background.
      console.warn(
        `Neuron (content.js): Falha ao enviar 'updateIcon'. Erro: ${error.message}`
      );
    }
  }
});

// Log para depuração, confirma que o script foi carregado.
// Desempenho: Este log é mínimo e útil para desenvolvimento.
console.log('Neuron (content.js): Script de conteúdo carregado.');