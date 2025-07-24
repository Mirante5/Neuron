(function() {
    'use strict';

    const BUTTONS_SELECTOR = '.row.justify-content-center.my-3';
    const DESTINATION_SELECTOR = '#sections';

    // Utiliza um MutationObserver para aguardar o aparecimento dos elementos na página.
    const observer = new MutationObserver((mutations, obs) => {
        const buttonContainer = document.querySelector(BUTTONS_SELECTOR);
        const sectionsDiv = document.getElementById(DESTINATION_SELECTOR.substring(1));

        // Verifica se ambos os elementos estão presentes e se o contêiner de botões ainda não foi movido.
        if (buttonContainer && sectionsDiv && !buttonContainer.dataset.neuronMoved) {
            
            // Move o contêiner de botões para antes da div de seções.
            sectionsDiv.parentNode.insertBefore(buttonContainer, sectionsDiv);

            // Adiciona um atributo para marcar que o elemento já foi movido e evitar processamento repetido.
            buttonContainer.dataset.neuronMoved = 'true';

            // Desconecta o observer após a conclusão da tarefa para otimizar a performance.
            obs.disconnect(); 
        }
    });

    // Inicia a observação de mudanças no corpo do documento.
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

})();