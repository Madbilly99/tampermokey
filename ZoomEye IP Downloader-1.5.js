// ==UserScript==
// @name         ZoomEye IP Downloader
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  Estrai tutti gli indirizzi IP da una pagina di ricerca IP e verifica l'URL
// @author       Il tuo nome
// @match        *https://www.zoomeye.hk/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Memorizza l'URL iniziale
    let initialUrl = window.location.href;
    // Memorizza gli URL già processati
    let processedUrls = new Set();
    // Flag per controllare se la ricerca è in esecuzione
    let isSearching = false;
    // Numero di IP da cercare e scaricare
    let numberOfIPsToFetch = 20;

    // Funzione per trovare gli indirizzi IP
    function findIPs(text) {
        // Regex per trovare gli indirizzi IP
        const ipRegex = /(\b25[0-5]|\b2[0-4][0-9]|\b[0-1]?[0-9]{1,2})(\.(25[0-5]|\b2[0-4][0-9]|\b[0-1]?[0-9]{1,2})){3}\b/g;
        return text.match(ipRegex) || [];
    }

    // Funzione per eseguire la ricerca degli IP
    function searchIPs() {
        // Estrarre il testo dalla pagina
        let pageText = document.body.innerText;

        // Trova gli IP nel testo della pagina
        let ips = findIPs(pageText);

        // Rimuovi i duplicati utilizzando un Set
        let uniqueIps = Array.from(new Set(ips));

        // Controlla se ci sono abbastanza IP sulla pagina
        if (uniqueIps.length < numberOfIPsToFetch) {
            console.log("IP insufficienti sulla pagina.");
            alert("IP insufficienti sulla pagina.");
            return;
        }

        // Crea il contenuto del file JSON
        let jsonContent = JSON.stringify(uniqueIps.map(ip => `${ip}`), null, 4);

        // Crea un oggetto Blob contenente il JSON
        let blob = new Blob([jsonContent], { type: "application/json" });

        // Crea un URL per il Blob
        let url = window.URL.createObjectURL(blob);

        // Crea un elemento <a> per scaricare il file
        let a = document.createElement("a");
        a.href = url;
        a.download = "zoomeye_ips.json";
        a.textContent = "Scarica gli indirizzi IP";

        // Aggiungi il link al corpo del documento
        document.body.appendChild(a);

        // Simula un click sul link per avviare il download
        a.click();

        // Rimuovi l'elemento <a> dal corpo del documento
        document.body.removeChild(a);

        // Aggiungi l'URL corrente agli URL processati
        processedUrls.add(window.location.href);

        // Scrivi un messaggio nella console quando il file è pronto e scaricato
        console.log("Il file è pronto ed è stato scaricato.");
    }

    // Funzione per controllare se l'URL è cambiato
    function checkUrlChange() {
        let currentUrl = window.location.href;
        if (currentUrl !== initialUrl) {
            console.log("Cambio di URL rilevato. Riavvio la ricerca degli indirizzi IP.");
            initialUrl = currentUrl;
            searchIPs();
        }

        // Controlla l'URL ogni 10 secondi
        setTimeout(checkUrlChange, 10000);
    }

    // Funzione per avviare la ricerca
    function startSearch() {
        isSearching = true;
        console.log("Ricerca degli indirizzi IP avviata.");
        searchIPs();
        checkUrlChange();
    }

    // Funzione per creare il bottone
    function createButton(text, onClick) {
        let button = document.createElement("button");
        button.textContent = text;
        button.style.position = "fixed";
        button.style.bottom = "10px";
        button.style.left = text === "10" ? "10px" : text === "20" ? "60px" : "110px";
        button.style.zIndex = 10000; // Portalo in primissimo piano
        button.style.backgroundColor = "#007bff";
        button.style.color = "#fff";
        button.style.border = "none";
        button.style.padding = "10px 20px";
        button.style.borderRadius = "5px";
        button.style.cursor = "pointer";
        button.addEventListener("click", onClick);
        document.body.appendChild(button);
    }

    // Funzione per aggiornare il numero di IP da cercare e scaricare
    function updateNumberOfIPs(number) {
        return function() {
            numberOfIPsToFetch = number;
            console.log(`Numero di IP da cercare aggiornato a ${numberOfIPsToFetch}.`);
            startSearch();
        };
    }

    // Scrivi un messaggio nella console all'avvio dello script
    console.log("Lo script è partito. Premi il bottone per avviare la ricerca degli indirizzi IP.");

    // Crea i bottoni sulla pagina
    createButton("10", updateNumberOfIPs(10));
    createButton("20", updateNumberOfIPs(20));
    createButton("50", updateNumberOfIPs(50));

})();
