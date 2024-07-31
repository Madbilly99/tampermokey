// ==UserScript==
// @name         Rajce Album Downloader
// @namespace    http://tampermonkey.net/
// @version      0.7
// @description  Log .jpg image links to the console, one per row, on album pages of rajce.idnes.cz and download them as a zip file when a button is clicked
// @author       Your Name
// @match        https://www.rajce.idnes.cz/*/album/*
// @require      https://cdnjs.cloudflare.com/ajax/libs/jszip/3.7.1/jszip.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js
// @grant        GM_xmlhttpRequest
// @connect      *
// ==/UserScript==

(function() {
    'use strict';

    // Function to log image links
    async function logImageLinks() {
        const images = document.querySelectorAll('img');
        let imageUrls = [];

        // Collect src attributes of .jpg images and modify the URL
        images.forEach(img => {
            if (img.src.endsWith('.jpg')) {
                imageUrls.push(img.src.replace('/thumb/', '/images/'));
            }
        });

        // Collect background images and modify the URL
        const elements = document.querySelectorAll('*');
        elements.forEach(element => {
            const backgroundImage = window.getComputedStyle(element).backgroundImage;
            if (backgroundImage && backgroundImage !== 'none') {
                const urlMatch = backgroundImage.match(/url\("?(.+?\.jpg)"?\)/);
                if (urlMatch) {
                    imageUrls.push(urlMatch[1].replace('/thumb/', '/images/'));
                }
            }
        });

        if (imageUrls.length > 0) {
            console.log(imageUrls.join('\n'));
            await downloadFilesAndZip(imageUrls);
        } else {
            console.log('No .jpg images found.');
        }
    }

    // Function to fetch a file as a blob
    function fetchFile(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                responseType: 'blob',
                onload: function(response) {
                    if (response.status === 200) {
                        resolve({ url: url, blob: response.response });
                    } else {
                        reject(new Error(`Failed to download ${url}`));
                    }
                },
                onerror: function() {
                    reject(new Error(`Network error while downloading ${url}`));
                }
            });
        });
    }

    // Function to download all files and create a zip
    async function downloadFilesAndZip(urls) {
        const zip = new JSZip();
        try {
            const files = await Promise.all(urls.map(fetchFile));
            files.forEach(file => {
                const fileName = file.url.split('/').pop();
                zip.file(fileName, file.blob);
            });

            const content = await zip.generateAsync({ type: 'blob' });
            const pageTitle = document.title || 'downloaded_images';
            saveAs(content, `${pageTitle}.zip`);
            alert('Files have been downloaded and zipped successfully!');
        } catch (error) {
            console.error(error);
            alert('An error occurred while downloading files.');
        }
    }

    // Function to create and style the button
    function createButton() {
        const button = document.createElement('button');
        button.textContent = 'Download Album as ZIP';
        button.style.position = 'fixed';
        button.style.top = '10px';
        button.style.left = '50%';
        button.style.transform = 'translateX(-50%)';
        button.style.zIndex = '10000';
        button.style.padding = '10px 20px';
        button.style.backgroundColor = '#007BFF';
        button.style.color = '#FFF';
        button.style.border = 'none';
        button.style.borderRadius = '5px';
        button.style.cursor = 'pointer';

        // Attach event listener to the button
        button.addEventListener('click', logImageLinks);

        // Add the button to the document body
        document.body.appendChild(button);
    }

    // Run the createButton function when the page has loaded
    window.addEventListener('load', createButton);

})();
