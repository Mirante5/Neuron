/**
 * @file popup.js
 * @description Lógica e animação para o popup do Neuron. As folhas caem imediatamente.
 */
document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    // --- Seletores e Configurações ---
    const CONFIG_KEY = 'neuronUserConfig';
    const masterSwitch = document.getElementById('masterEnableNeuron');
    const itemsInput = document.getElementById('qtdItensTratarTriar');
    const itemsCard = document.getElementById('items-per-page-card');
    const canvas = document.getElementById('falling-leaves-canvas');
    const ctx = canvas.getContext('2d');

    let userConfig = {};
    let debounceTimer;
    let leaves = [];
    const numberOfLeaves = 50;
    const LEAF_COLOR = '#ffd401';

    // --- LÓGICA DE CONTROLO ---

    async function carregarConfiguracoes() {
        if (!chrome?.storage?.local) return {};
        try {
            const result = await chrome.storage.local.get(CONFIG_KEY);
            return result?.[CONFIG_KEY] || {};
        } catch (error) {
            console.error("Neuron (Popup): Erro ao carregar configurações.", error);
            return {};
        }
    }

    async function salvarConfiguracoes() {
        if (!chrome?.storage?.local) return;
        try {
            await chrome.storage.local.set({ [CONFIG_KEY]: userConfig });
        } catch (error) {
            console.error("Neuron (Popup): Erro ao salvar configurações.", error);
        }
    }

    function atualizarUI() {
        const isEnabled = masterSwitch.checked;
        itemsCard.style.opacity = isEnabled ? '1' : '0.6';
        itemsCard.style.pointerEvents = isEnabled ? 'auto' : 'none';
        itemsInput.disabled = !isEnabled;
    }

    async function handleMasterSwitchChange() {
        userConfig.masterEnableNeuron = masterSwitch.checked;
        atualizarUI();
        await salvarConfiguracoes();
    }

    function handleItemsInputChange() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
            if (!userConfig.generalSettings) {
                userConfig.generalSettings = {};
            }
            userConfig.generalSettings.qtdItensTratarTriar = parseInt(itemsInput.value, 10) || 50;
            await salvarConfiguracoes();
        }, 500);
    }

    async function inicializarControlos() {
        userConfig = await carregarConfiguracoes();
        masterSwitch.checked = userConfig.masterEnableNeuron !== false;
        itemsInput.value = userConfig.generalSettings?.qtdItensTratarTriar || 50;
        
        atualizarUI();

        masterSwitch.addEventListener('change', handleMasterSwitchChange);
        itemsInput.addEventListener('input', handleItemsInputChange);
    }

    // --- LÓGICA DA ANIMAÇÃO DAS FOLHAS ---

    function redimensionarCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function criarFolhas() {
        leaves = [];
        for (let i = 0; i < numberOfLeaves; i++) {
            leaves.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height - canvas.height,
                size: Math.random() * 10 + 8,
                speedY: Math.random() * 1.2 + 0.6,
                speedX: (Math.random() - 0.5) * 0.5,
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 0.4,
                opacity: Math.random() * 0.7 + 0.3
            });
        }
    }

    function desenharFolha(leaf) {
        ctx.save();
        ctx.translate(leaf.x, leaf.y);
        ctx.rotate(leaf.rotation * Math.PI / 180);
        
        ctx.beginPath();
        ctx.moveTo(0, 0);
        const size = leaf.size;
        ctx.quadraticCurveTo(size * 0.5, -size * 0.4, size, 0);
        ctx.quadraticCurveTo(size * 0.5, size * 0.4, 0, 0);
        
        ctx.fillStyle = `${LEAF_COLOR}${Math.floor(leaf.opacity * 255).toString(16).padStart(2, '0')}`;
        ctx.fill();
        ctx.restore();
    }

    function animarCena() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        leaves.forEach(leaf => {
            leaf.y += leaf.speedY;
            leaf.x += leaf.speedX;
            leaf.rotation += leaf.rotationSpeed;
            desenharFolha(leaf);

            if (leaf.y > canvas.height + 20) {
                leaf.y = -20;
                leaf.x = Math.random() * canvas.width;
            }
            if (leaf.x > canvas.width + 20) {
                leaf.x = -20;
            } else if (leaf.x < -20) {
                leaf.x = canvas.width + 20;
            }
        });

        requestAnimationFrame(animarCena);
    }

    function inicializarAnimacao() {
        redimensionarCanvas();
        criarFolhas();
        requestAnimationFrame(animarCena);
    }

    // --- PONTO DE ENTRADA ---
    inicializarControlos();
    inicializarAnimacao(); // A ANIMAÇÃO COMEÇA AQUI, IMEDIATAMENTE
});