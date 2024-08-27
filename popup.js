function updatePopupStatus(message) {
    document.getElementById('status').textContent = message;
}

document.getElementById('startButton').addEventListener('click', function() {
    chrome.runtime.sendMessage({ action: "start" });
    updatePopupStatus('Browsing started...');
    document.getElementById('startButton').style.display = 'none';
    document.getElementById('stopButton').style.display = 'block';
});

document.getElementById('stopButton').addEventListener('click', function() {
    chrome.runtime.sendMessage({ action: "stop" });
    updatePopupStatus('Browsing stopped.');
    document.getElementById('startButton').style.display = 'block';
    document.getElementById('stopButton').style.display = 'none';
});

document.getElementById('saveLinks').addEventListener('click', function() {
    chrome.runtime.sendMessage({ action: 'saveLinks' });
});
document.getElementById('viewLinks').addEventListener('click', function() {
    chrome.runtime.sendMessage({ action: 'getVisitedLinks' }, function(response) {
        const linksContainer = document.getElementById('linksContainer');
        const linkCount = document.getElementById('linkCount');
        linksContainer.innerHTML = ''; // Clear previous content

        if (response && response.links) {
            const numberOfLinks = response.links.length;
            linkCount.textContent = `Visited Links: ${numberOfLinks}`;

            if (numberOfLinks === 0) {
                linksContainer.textContent = 'No links visited yet.';
            } else {
                response.links.forEach(link => {
                    const linkElement = document.createElement('div');
                    linkElement.className = 'linkItem';
                    const linkAnchor = document.createElement('a');
                    linkAnchor.href = link;
                    linkAnchor.textContent = link;
                    linkAnchor.target = '_blank'; // Open link in a new tab
                    linkElement.appendChild(linkAnchor);
                    linksContainer.appendChild(linkElement);
                });
            }
        } else {
            linkCount.textContent = 'Visited Links: 0';
            linksContainer.textContent = 'No links visited yet.';
        }
    });
});

