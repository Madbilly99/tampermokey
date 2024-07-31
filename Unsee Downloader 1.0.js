// ==UserScript==
// @name         Unsee Downloader Ok
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Log image links to the console only once per URL and save specific URLs to a ZIP file on button click, only if files are larger than 50KB
// @author       You
// @match        *://unsee.cc/*
// @grant        none
// @require      https://cdnjs.cloudflare.com/ajax/libs/jszip/3.7.1/jszip.min.js
// ==/UserScript==

(function() {
    'use strict';

    let loggedImages = new Set();
    let specificUrls = [];
    let zip = new JSZip();
    const MIN_FILE_SIZE = 50 * 1024; // 50KB in bytes

    function logImageLinks() {
        // Get all image elements on the page
        const images = document.querySelectorAll('img');

        // Loop through all image elements and log their src attributes to the console if not already logged
        images.forEach(img => {
            if (!loggedImages.has(img.src)) {
                console.log(img.src);
                loggedImages.add(img.src);
                if (img.src.includes("https://unsee.cc/image?id=")) {
                    specificUrls.push(img.src);
                }
            }
        });

        // Optionally, you can also log background images
        const elements = document.querySelectorAll('*');
        elements.forEach(element => {
            const backgroundImage = window.getComputedStyle(element).backgroundImage;
            if (backgroundImage && backgroundImage !== 'none') {
                // Extract the URL from the backgroundImage string
                const urlMatch = backgroundImage.match(/url\("?(.+?)"?\)/);
                if (urlMatch && !loggedImages.has(urlMatch[1])) {
                    console.log(urlMatch[1]);
                    loggedImages.add(urlMatch[1]);
                    if (urlMatch[1].includes("https://unsee.cc/image?id=")) {
                        specificUrls.push(urlMatch[1]);
                    }
                }
            }
        });

        // Print the specificUrls array to the console as a unique variable
        console.log("Specific URLs:", specificUrls);
    }

    // Function to create and download a ZIP file with specific URLs
    async function downloadSpecificUrls() {
        const downloadPromises = specificUrls.map(async (url, index) => {
            const response = await fetch(url);
            const blob = await response.blob();
            if (blob.size > MIN_FILE_SIZE) {
                zip.file(`image${index}.jpg`, blob);
            }
        });

        await Promise.all(downloadPromises);

        // Extract the album name from the page using the specific class
        const albumNameElement = document.querySelector('.MuiTypography-root.MuiTypography-body1.jss19.css-9l3uo3[aria-label=""]');
        const albumName = albumNameElement ? albumNameElement.textContent.trim() : 'album';

        zip.generateAsync({ type: 'blob' }).then(function(content) {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = `${albumName}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    // Function to reset and start the process again
    function startProcess() {
        loggedImages.clear();
        specificUrls = [];
        zip = new JSZip();
        logImageLinks();
        setTimeout(downloadSpecificUrls, 5000);
    }

    // Create and style the download button
    const downloadButton = document.createElement('button');
    downloadButton.textContent = 'Download Specific URLs';
    downloadButton.style.position = 'fixed';
    downloadButton.style.top = '0';
    downloadButton.style.left = '50%';
    downloadButton.style.transform = 'translateX(-50%)';
    downloadButton.style.zIndex = '10000';
    downloadButton.style.padding = '10px 20px';
    downloadButton.style.backgroundColor = '#007BFF';
    downloadButton.style.color = '#FFF';
    downloadButton.style.border = 'none';
    downloadButton.style.borderRadius = '5px';
    downloadButton.style.cursor = 'pointer';

    // Attach event listener to the download button
    downloadButton.addEventListener('click', startProcess);

    // Add the download button to the document body
    document.body.appendChild(downloadButton);

    // Run the logImageLinks function when the page has loaded
    window.addEventListener('load', logImageLinks);
})();
