const wordFrequencies = new Map();
const processedRepos = new Set();
let totalWordsMatched = 0;

// Configuration for common words to ignore
const STOP_WORDS = new Set([
    'get', 'set', 'is', 'has', 'to', 'init', 'create', 'update', 'delete', 
    'add', 'remove', 'find', 'make', 'build', 'run', 'start', 'stop', 'test',
    'self', 'args', 'kwargs', 'init', 'main', 'impl', 'value', 'data', 'id'
]);

// Initialize Chart.js
const ctx = document.getElementById('wordChart').getContext('2d');
const gradient = ctx.createLinearGradient(0, 0, 0, 400);
gradient.addColorStop(0, 'rgba(59, 130, 246, 0.8)'); // blue-500
gradient.addColorStop(1, 'rgba(139, 92, 246, 0.8)'); // violet-500

const chartConfig = {
    type: 'bar',
    data: {
        labels: [],
        datasets: [{
            label: 'Word Frequency',
            data: [],
            backgroundColor: gradient,
            borderRadius: 6,
            borderSkipped: false,
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            duration: 500, // Smooth transition for live updates
        },
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                titleFont: { size: 14, family: 'Inter' },
                bodyFont: { size: 14, family: 'Inter' },
                padding: 12,
                cornerRadius: 8,
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(255, 255, 255, 0.05)',
                },
                ticks: {
                    color: '#94a3b8',
                    font: { family: 'Inter' }
                }
            },
            x: {
                grid: {
                    display: false
                },
                ticks: {
                    color: '#e2e8f0',
                    font: { family: 'Inter', weight: 600 }
                }
            }
        }
    }
};

const wordChart = new Chart(ctx, chartConfig);

// Update Chart Logic
function updateChart() {
    // Sort words by frequency
    const sortedWords = Array.from(wordFrequencies.entries())
        .filter(([word, count]) => !STOP_WORDS.has(word) && word.length > 2)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20); // Top 20

    const labels = sortedWords.map(item => item[0]);
    const data = sortedWords.map(item => item[1]);

    wordChart.data.labels = labels;
    wordChart.data.datasets[0].data = data;
    wordChart.update();
}

// Throttle chart updates to max once per second to prevent UI freeze during high throughput
let updateTimeout = null;
function scheduleUpdate() {
    if (!updateTimeout) {
        updateTimeout = setTimeout(() => {
            updateChart();
            updateTimeout = null;
        }, 1000);
    }
}

// UI Elements
const totalWordsEl = document.getElementById('totalWords');
const totalReposEl = document.getElementById('totalRepos');
const feedEl = document.getElementById('liveFeed');

function addFeedItem(word, repo, lang) {
    const el = document.createElement('div');
    el.className = `feed-item ${lang}`;
    el.innerHTML = `<span><strong style="color: #fff">${word}</strong></span> <span style="color: #64748b; font-size: 0.8rem">in ${repo}</span>`;

    feedEl.prepend(el);

    // Keep only last 50 items
    if (feedEl.children.length > 50) {
        feedEl.removeChild(feedEl.lastChild);
    }
}

// Setup EventSource (SSE)
const eventSource = new EventSource('/stream');

eventSource.onmessage = function(event) {
    try {
        const data = JSON.parse(event.data);
        const { word, repo, language } = data;

        // Update Stats
        totalWordsMatched++;
        processedRepos.add(repo);

        // Update Frequency Map
        const count = wordFrequencies.get(word) || 0;
        wordFrequencies.set(word, count + 1);

        // Update UI every 100 events for raw counters
        if (totalWordsMatched % 50 === 0) {
            totalWordsEl.textContent = totalWordsMatched.toLocaleString();
            totalReposEl.textContent = processedRepos.size.toLocaleString();
        }

        // Randomly sample items for feed to not overwhelm DOM
        if (Math.random() < 0.1) {
            addFeedItem(word, repo, language);
        }

        scheduleUpdate();

    } catch (e) {
        console.error("Error parsing event data", e);
    }
};

eventSource.onerror = function(err) {
    console.error("EventSource failed:", err);
};

// Control logic
const controlBtn = document.getElementById('controlBtn');
const controlMessage = document.getElementById('controlMessage');
const pulseIndicator = document.getElementById('pulse');
let isPaused = false;

controlBtn.addEventListener('click', async () => {
    isPaused = !isPaused;
    const action = isPaused ? 'pause' : 'resume';

    // Update UI immediately
    if (isPaused) {
        controlBtn.textContent = 'Resume Scan';
        controlBtn.className = 'paused';
        controlMessage.textContent = 'Pausing... The scan will end after downloading the current repository.';
        pulseIndicator.style.animation = 'none';
        pulseIndicator.style.backgroundColor = '#f59e0b'; // warning/yellow
    } else {
        controlBtn.textContent = 'Pause Scan';
        controlBtn.className = 'running';
        controlMessage.textContent = 'Resuming scan with the next repository...';
        pulseIndicator.style.animation = 'pulse 1.5s infinite';
        pulseIndicator.style.backgroundColor = '#10b981';

        // Clear message after a short delay
        setTimeout(() => {
            if (!isPaused) controlMessage.textContent = '';
        }, 3000);
    }

    try {
        await fetch('/api/control', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action })
        });
    } catch (e) {
        console.error('Failed to send control command', e);
    }
});
