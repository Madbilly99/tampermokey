// ==UserScript==
// @name         Synology Media Downloader
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Fetch media URL using Synology API and add a download button that directly downloads the media whenever the URL changes and matches the expected pattern, ensuring the button is not obstructed by other elements. Handles pagination to include all items, and uses the IP in the URL to make the request, including videos and images.
// @author       Your Name
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let timeoutId;
    let downloadButton;

    // Create and style the download button
    function createDownloadButton() {
        if (!downloadButton) {
            downloadButton = document.createElement('a');
            downloadButton.textContent = 'Download Media';
            downloadButton.style.position = 'fixed';
            downloadButton.style.bottom = '10px';
            downloadButton.style.right = '10px';
            downloadButton.style.padding = '10px';
            downloadButton.style.backgroundColor = '#007bff';
            downloadButton.style.color = '#fff';
            downloadButton.style.border = 'none';
            downloadButton.style.borderRadius = '5px';
            downloadButton.style.textDecoration = 'none';
            downloadButton.style.zIndex = '10000'; // Ensure button is on top
            downloadButton.download = ''; // Set the download attribute
            document.body.appendChild(downloadButton);
        }
    }

    // Function to update the download button link
    function updateDownloadButton(url, filename) {
        if (!downloadButton) {
            createDownloadButton();
        }
        downloadButton.href = url;
        downloadButton.download = filename; // Set the filename for download
        downloadButton.style.display = 'block';
    }

    // Function to fetch all items from the API, handling pagination
    async function fetchAllItems(ipAddress, folderId) {
        let allItems = [];
        let offset = 0;
        const limit = 100;
        let hasMoreItems = true;

        while (hasMoreItems) {
            try {
                const response = await fetch(`http://${ipAddress}/photo/webapi/entry.cgi/SYNO.FotoTeam.Browse.Item`, {
                    headers: {
                        "accept": "*/*",
                        "accept-language": "it-IT,it;q=0.9",
                        "content-type": "application/x-www-form-urlencoded; charset=UTF-8"
                    },
                    referrer: `http://${ipAddress}/photo/`,
                    referrerPolicy: "strict-origin-when-cross-origin",
                    body: `api=SYNO.FotoTeam.Browse.Item&method=list&version=1&folder_id=${folderId}&additional=%5B%22thumbnail%22%2C%22resolution%22%2C%22orientation%22%2C%22video_convert%22%2C%22video_meta%22%5D&sort_by=%22takentime%22&sort_direction=%22asc%22&offset=${offset}&limit=${limit}`,
                    method: "POST",
                    mode: "cors",
                    credentials: "include"
                });

                const data = await response.json();
                allItems = allItems.concat(data.data.list);

                if (data.data.list.length < limit) {
                    hasMoreItems = false;
                } else {
                    offset += limit;
                }
            } catch (error) {
                console.error('Error fetching items:', error);
                hasMoreItems = false; // stop fetching if there's an error
            }
        }

        return allItems;
    }

    // Function to fetch and log the media URL using Synology API
    async function fetchAndLogMediaUrl(ipAddress, folderId, itemNumber) {
        try {
            const items = await fetchAllItems(ipAddress, folderId);
            console.log('All Items:', items);
            const matchedItem = items.find(item => item.id === parseInt(itemNumber));
            console.log('Matched Item:', matchedItem);

            if (matchedItem) {
                let mediaUrl;
                if (matchedItem.type === 'video') {
                    mediaUrl = `http://${ipAddress}/photo/webapi/entry.cgi/${matchedItem.filename}?id=${matchedItem.id}&cache_key=${matchedItem.additional.thumbnail.cache_key}&type=unit&size=xl&api=SYNO.FotoTeam.Thumbnail&method=get&version=2`;
                } else {
                    mediaUrl = `http://${ipAddress}/photo/webapi/entry.cgi/${matchedItem.filename}?id=${matchedItem.id}&cache_key=${matchedItem.additional.thumbnail.cache_key}&type=unit&size=xl&api=SYNO.FotoTeam.Thumbnail&method=get&version=2`;
                }
                console.log('Fetched Media URL:', mediaUrl);
                updateDownloadButton(mediaUrl, matchedItem.filename);
            } else {
                console.log('Item not found');
                if (downloadButton) {
                    downloadButton.style.display = 'none';
                }
            }
        } catch (error) {
            console.error('Error fetching media:', error);
            if (downloadButton) {
                downloadButton.style.display = 'none';
            }
        }
    }

    // Function to format and log the current URL to the console
    function formatAndLogUrl() {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
            const currentUrl = window.location.href;
            const formattedUrl = convertUrl(currentUrl);
            console.log('Converted URL:', formattedUrl);

            const { ipAddress, folderId, itemNumber } = extractIpFolderIdAndItemNumber(currentUrl);
            if (ipAddress && folderId && itemNumber) {
                fetchAndLogMediaUrl(ipAddress, folderId, itemNumber);
            } else {
                if (downloadButton) {
                    downloadButton.style.display = 'none';
                }
            }
        }, 100);
    }

    // Function to extract IP address, folder ID, and item number from the URL
    function extractIpFolderIdAndItemNumber(url) {
        const ipAddressRegex = /\/\/([\d.]+)\//;
        const folderIdRegex = /folder\/(\d+)/;
        const itemNumberRegex = /item_(\d+)/;
        const ipAddressMatch = url.match(ipAddressRegex);
        const folderIdMatch = url.match(folderIdRegex);
        const itemNumberMatch = url.match(itemNumberRegex);
        return {
            ipAddress: ipAddressMatch ? ipAddressMatch[1] : null,
            folderId: folderIdMatch ? folderIdMatch[1] : null,
            itemNumber: itemNumberMatch ? itemNumberMatch[1] : null
        };
    }

    // Function to convert the URL to the desired format
    function convertUrl(url) {
        // Use regular expressions to extract the relevant parts of the URL
        const photoUrlRegex = /\/\/([\d.]+)\/photo\/#\/shared_space\/folder\/(\d+)\/item_(\d+)/;
        const apiUrlRegex = /\/\/([\d.]+)\/photo\/webapi\/entry.cgi\/([\w.]+)\?(.+)/;

        let match = url.match(photoUrlRegex);
        if (match) {
            const ipAddress = match[1];
            const folderNumber = match[2];
            const itemNumber = match[3];
            return `IP Address: ${ipAddress}, Folder Number: ${folderNumber}, Item Number: ${itemNumber}`;
        }

        match = url.match(apiUrlRegex);
        if (match) {
            const ipAddress = match[1];
            const fileName = match[2];
            const params = new URLSearchParams(match[3]);
            const id = params.get('id') || 'N/A';
            const cacheKey = params.get('cache_key') || 'N/A';
            const type = params.get('type') || 'N/A';
            const size = params.get('size') || 'N/A';
            const api = params.get('api') || 'N/A';
            const method = params.get('method') || 'N/A';
            const version = params.get('version') || 'N/A';

            return `IP Address: ${ipAddress}, File Name: ${fileName}, ID: ${id}, Cache Key: ${cacheKey}, Type: ${type}, Size: ${size}, API: ${api}, Method: ${method}, Version: ${version}`;
        }

        return 'URL format does not match expected patterns';
    }

    // Log the initial URL
    formatAndLogUrl();

    // Observe changes to the history state
    const pushState = history.pushState;
    const replaceState = history.replaceState;

    history.pushState = function() {
        pushState.apply(history, arguments);
        formatAndLogUrl();
    };

    history.replaceState = function() {
        replaceState.apply(history, arguments);
        formatAndLogUrl();
    };

    // Listen for the popstate event
    window.addEventListener('popstate', formatAndLogUrl);

    // Listen for hash changes
    window.addEventListener('hashchange', formatAndLogUrl);
})();
