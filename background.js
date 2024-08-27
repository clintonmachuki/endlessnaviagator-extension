let browsing = false;
let visitedLinks = new Set();

let browsingInterval;

function startBrowsing() {
    browsing = true;
    browsingInterval = setInterval(() => {
        if (browsing) {
            refreshPage();
        }
    }, 10000); // Check every 10 seconds
}

function stopBrowsing() {
    browsing = false;
    clearInterval(browsingInterval);
}

function refreshPage() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        const currentTab = tabs[0];
        if (!currentTab) {
            console.error("No active tab found.");
            return;
        }

        const tabId = currentTab.id;

        chrome.tabs.reload(tabId, {}, function() {
            setTimeout(() => {
                browseCurrentPage(tabId);
            }, 3000); // Wait 3 seconds to ensure the page fully reloads
        });
    });
}

function logError(message, error) {
    console.error(message, error);
}

function browseCurrentPage(tabId) {
    if (!browsing) return;

    chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError || !tab) {
            logError("Error fetching tab details.", chrome.runtime.lastError);
            return;
        }

        if (tab.url.startsWith('chrome://')) {
            console.log("Cannot access chrome:// URL. Redirecting to Reddit.");
            chrome.tabs.update(tabId, { url: 'https://www.reddit.com/' }, function() {
                if (chrome.runtime.lastError) {
                    logError("Error updating tab URL.", chrome.runtime.lastError);
                    return;
                }
                setTimeout(() => browseCurrentPage(tabId), 3000);
            });
            return;
        }

        chrome.scripting.executeScript({
            target: { tabId: tabId },
            function: getNavigableLinks,
            args: [Array.from(visitedLinks)]
        }).then((results) => {
            const links = results[0]?.result;
            if (links && links.length > 0) {
                const link = getRandomLink(links);
                visitedLinks.add(link);
                navigateToLink(tabId, link);
            } else {
                goBack(tabId);
            }
        }).catch(err => {
            logError("Error executing script on the tab.", err);
        });
    });
}

function getNavigableLinks(visitedLinks) {
    const allLinks = Array.from(document.links);
    const visitedSet = new Set(visitedLinks);
    
    return allLinks
        .map(link => link.href)
        .filter(href => {
            try {
                const url = new URL(href);
                const extension = url.pathname.split('.').pop().toLowerCase();
                return !visitedSet.has(href) &&
                       !['pdf', 'jpg', 'jpeg', 'png', 'gif', 'zip', 'exe'].includes(extension) &&
                       href.startsWith('http');
            } catch (e) {
                return false;
            }
        });
}


function getRandomLink(links) {
    const index = Math.floor(Math.random() * links.length);
    return links[index];
}

function navigateToLink(tabId, link) {
    chrome.tabs.update(tabId, { url: link }, function(tab) {
        setTimeout(() => {
            if (chrome.runtime.lastError || !tab) {
                console.error("Failed to navigate to link. Tab might have been closed.");
                return;
            }

            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: checkIfPageLoadedAndHasLinks
            }).then((results) => {
                if (results[0]?.result) {
                    browseCurrentPage(tab.id);
                } else {
                    goBack(tab.id);
                }
            }).catch(err => {
                console.error("Error executing script on the tab:", err);
            });
        }, 5000); // Wait 5 seconds to ensure the page loads
    });
}

function checkIfPageLoadedAndHasLinks() {
    return document.readyState === 'complete' && document.links.length > 0;
}

function goBack(tabId) {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        const currentTab = tabs[0];
        if (currentTab && currentTab.id === tabId) {
            chrome.tabs.goBack(() => {
                setTimeout(() => {
                    browseCurrentPage(tabId);
                }, 3000); // Wait 3 seconds after going back
            });
        } else {
            console.error("Failed to go back. Tab might have been closed.");
        }
    });
}

function saveVisitedLinksToFile() {
    const linksArray = Array.from(visitedLinks).join('\n');
    const blob = new Blob([linksArray], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    chrome.downloads.download({
        url: url,
        filename: 'visited_links.txt',
        saveAs: true
    }, function(downloadId) {
        console.log(`Download started with ID: ${downloadId}`);
    });
}
function getVisitedLinks() {
    return Array.from(visitedLinks);
}

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    switch (message.action) {
        case "start":
            startBrowsing();
            break;
        case "stop":
            stopBrowsing();
            break;
        case "saveLinks":
            saveVisitedLinksToFile();
            break;
        case "getVisitedLinks":
            sendResponse({ links: getVisitedLinks() });
            break;
    }
});

function handleInfiniteScroll() {
    if (!browsing) return;

    chrome.scripting.executeScript({
        target: { tabId: tabId },
        function: scrollPage
    }).then(() => {
        setTimeout(() => browseCurrentPage(tabId), 3000); // Wait for content to load
    }).catch(err => {
        logError("Error scrolling page.", err);
    });
}

function scrollPage() {
    window.scrollBy(0, window.innerHeight);
}