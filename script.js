document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const dashboard = document.getElementById('main-dashboard');
    const ecoScore = document.getElementById('eco-score');
    const styleScore = document.getElementById('style-score');

    // Click to upload
    dropZone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', handleFiles);

    // Simple drag and drop logic
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = "#00FF41";
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.style.borderColor = "#30363d";
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        handleFiles({ target: { files: e.dataTransfer.files } });
    });

    async function handleFiles(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const code = event.target.result;

            // Visual Feedback
            dropZone.innerHTML = `<h3><i class="fas fa-spinner fa-spin"></i> Analyzing ${file.name}...</h3>`;

            try {
                const response = await fetch('http://localhost:8000/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code: code, filename: file.name })
                });

                if (!response.ok) throw new Error('API Error');

                const result = await response.json();

                // Common render function for both single file and projects
                renderProjectData({
                    ...result,
                    is_project: false
                }, file.name);

            } catch (err) {
                console.error(err);
                alert('Connection to backend failed. Please ensure backend/main.py is running.');
                dropZone.innerHTML = `<h3><i class="fas fa-exclamation-triangle"></i> Connection Failed</h3><p>Click to retry</p>`;
            }
        };
        reader.readAsText(file);
    }

    const analyzeRepoBtn = document.getElementById('analyze-repo-btn');
    const githubUrlInput = document.getElementById('github-url-input');

    analyzeRepoBtn.addEventListener('click', async () => {
        const url = githubUrlInput.value.trim();
        if(!url) return;
        
        // Visual feedback
        dropZone.innerHTML = `<h3><i class="fas fa-spinner fa-spin"></i> Clonging and analyzing GitHub repository...</h3><p>This may take up to a minute depending on repository size. Please wait.</p>`;
        
        try {
            const response = await fetch('http://localhost:8000/analyze-repo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ repo_url: url })
            });
            
            if (!response.ok) throw new Error('API Error');
            
            const result = await response.json();
            renderProjectData(result);
            
        } catch (err) {
            console.error(err);
            alert('Analysis failed. Check your link or ensure the backend is running.');
            dropZone.innerHTML = `<h3><i class="fas fa-exclamation-triangle"></i> Analysis Failed</h3><p>Click to retry</p>`;
        }
    });

    let currentAnalyzedFiles = [];

    function renderProjectData(data, singleFilename = null) {
        showDashboard();
        
        const ecoScoreToUse = data.is_project ? data.project_eco_score : data.eco_score;
        const styleScoreToUse = data.is_project ? data.project_style_score : data.style_score;
        
        animateScores(ecoScoreToUse, styleScoreToUse);
        handleGamification(ecoScoreToUse, styleScoreToUse, data);
        renderImpactCards(data.impact);
        updateStatsOverview(data.stats);
        
        const fileContainer = document.getElementById('project-files-container');
        if (data.is_project && data.analyzed_files && data.analyzed_files.length > 0) {
            currentAnalyzedFiles = data.analyzed_files;
            const fileList = document.getElementById('file-list');
            fileContainer.style.display = 'block';
            
            fileList.innerHTML = '';
            data.analyzed_files.forEach((file, index) => {
                const btn = document.createElement('button');
                btn.className = 'btn';
                btn.style.padding = '0.5rem 1rem';
                btn.style.fontSize = '0.9rem';
                btn.style.background = index === 0 ? 'var(--neon-green)' : 'rgba(0,0,0,0.3)';
                btn.style.color = index === 0 ? '#000' : '#fff';
                btn.innerText = file.filename;
                
                btn.addEventListener('click', () => {
                    // Update active state
                    Array.from(fileList.children).forEach(b => {
                        b.style.background = 'rgba(0,0,0,0.3)';
                        b.style.color = '#fff';
                    });
                    btn.style.background = 'var(--neon-green)';
                    btn.style.color = '#000';
                    
                    // Update diff view
                    renderFileDiff(file);
                });
                fileList.appendChild(btn);
            });
            
            // Render the first file by default
            renderFileDiff(data.analyzed_files[0]);
        } else {
            fileContainer.style.display = 'none';
            // It's a single file
            data.filename = singleFilename || "uploaded_file";
            renderFileDiff(data);
        }
    }

    function renderFileDiff(fileData) {
        // Reset the expand state when a new file is shown
        const diffWrapper = document.getElementById('diff-wrapper');
        const expandBtn = document.getElementById('expand-diff-btn');
        if (diffWrapper && expandBtn) {
            diffWrapper.classList.remove('expanded');
            expandBtn.innerHTML = '<i class="fas fa-chevron-down"></i> 展开全部代码';
        }

        updateMockDiff(fileData.diff_lines, fileData.refactored_code, fileData.filename);
        document.getElementById('why-green-text').innerText = fileData.summary;
    }

    // Expand Diff Button Logic
    const expandBtn = document.getElementById('expand-diff-btn');
    if (expandBtn) {
        expandBtn.addEventListener('click', () => {
            const wrapper = document.getElementById('diff-wrapper');
            if (wrapper.classList.contains('expanded')) {
                wrapper.classList.remove('expanded');
                expandBtn.innerHTML = '<i class="fas fa-chevron-down"></i> Expand Full Code';
                // Scroll back to the top of the diff view
                wrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                wrapper.classList.add('expanded');
                expandBtn.innerHTML = '<i class="fas fa-chevron-up"></i> Collapse Code';
            }
        });
    }

    function showDashboard() {
        dashboard.style.display = 'grid';
        window.scrollTo({ top: dashboard.offsetTop - 100, behavior: 'smooth' });
    }

    function animateScores(targetEco, targetStyle) {
        let currentEco = 0;
        let currentStyle = 0;

        const interval = setInterval(() => {
            if (currentEco < targetEco) currentEco++;
            if (currentStyle < targetStyle) currentStyle++;

            ecoScore.innerText = currentEco;
            styleScore.innerText = currentStyle;

            if (currentEco >= targetEco && currentStyle >= targetStyle) {
                clearInterval(interval);
            }
        }, 20);
    }

    function handleGamification(ecoScore, styleScore, data) {
        if (ecoScore >= 95 && styleScore >= 95) {
            triggerConfetti();
        }

        const avg = (ecoScore + styleScore) / 2;
        let badgeInfo = getBadgeTier(avg);

        saveBadge(badgeInfo.name);

        let unlockedSpecial = [];
        if (data && data.radar_original) {
            let ro = data.radar_original;
            if (ro.documentation >= 95) unlockedSpecial.push("Comment Poet");
            if (ro.modularity >= 95) unlockedSpecial.push("Code Architect");
            if (ro.readability >= 95) unlockedSpecial.push("Zen Coder");
            if (ro.efficiency >= 95) unlockedSpecial.push("Time Weaver");
            if (ro.formatting >= 95) unlockedSpecial.push("Style Purist");
        }

        if (data && data.stats) {
            if (data.stats.lines_removed > 5 && data.stats.lines_removed > data.stats.lines_added * 1.5) unlockedSpecial.push("The Lumberjack");
        }

        if (data && data.impact && data.impact.carbon_saved_g >= 10000) unlockedSpecial.push("Forest Guardian");

        if (data && data.radar_original && data.radar_refactored) {
            let rr = data.radar_refactored;
            let refEco = rr.efficiency || 0;
            let refStyle = ((rr.formatting||0) + (rr.documentation||0) + (rr.readability||0) + (rr.modularity||0)) / 4;
            let refAvg = (refEco + refStyle) / 2;
            if (avg < 50 && (refAvg - avg) >= 40) unlockedSpecial.push("The Phoenix");
        }

        unlockedSpecial.forEach(saveBadge);
        
        renderBadge(badgeInfo, unlockedSpecial);
    }

    function saveBadge(badgeName) {
        let unlocked = JSON.parse(localStorage.getItem('codeGreenBadges')) || {};
        unlocked[badgeName] = true;
        localStorage.setItem('codeGreenBadges', JSON.stringify(unlocked));
    }

    function getBadgeTier(avgScore) {
        if (avgScore >= 90) return { name: "Zero-Carbon Architect", icon: "fa-crown", color: "FFD700", glow: "var(--neon-green-glow)" };
        if (avgScore >= 80) return { name: "Efficiency Master", icon: "fa-bolt", color: "00FF41", glow: "var(--neon-green-glow)" };
        if (avgScore >= 70) return { name: "Carbon-Aware Coder", icon: "fa-leaf", color: "00CC33", glow: "transparent" };
        if (avgScore >= 60) return { name: "Sprout Developer", icon: "fa-seedling", color: "90EE90", glow: "transparent" };
        return { name: "Emission Heavy", icon: "fa-industry", color: "FF4444", glow: "rgba(255, 68, 68, 0.3)" };
    }

    function renderBadge(badgeInfo, unlockedSpecial = []) {
        const gallery = document.querySelector('.badge-gallery');
        gallery.innerHTML = `
            <div class="badge" title="Click to export for GitHub README!" style="border-color: #${badgeInfo.color}; box-shadow: 0 0 15px ${badgeInfo.glow}; cursor: pointer;" onclick="exportBadge('${badgeInfo.name}', '${badgeInfo.color}')">
                <i class="fas ${badgeInfo.icon}" style="color: #${badgeInfo.color}; font-size: 1.5rem;"></i>
            </div>
            <div style="display: flex; flex-direction: column; justify-content: center; margin-left: 1rem; text-align: left;">
                <span style="font-weight: bold; color: #${badgeInfo.color};">${badgeInfo.name}</span>
                <span style="font-size: 0.8rem; color: var(--text-muted);">Click badge to export markdown</span>
                ${unlockedSpecial.length > 0 ? `<span style="font-size: 0.8rem; color: var(--neon-green); margin-top:0.4rem; font-weight: 600;"><i class="fas fa-unlock"></i> Unlocked ${unlockedSpecial.length} new special badges!</br>Go to Honor Wall to view</span>` : ''}
            </div>
        `;
    }

    // Make export globally accessible for inline onclick
    window.exportBadge = function (badgeName, color) {
        const encodedName = encodeURIComponent(badgeName);
        const snippet = `[![CodeGreen Status](https://img.shields.io/badge/CodeGreen-${encodedName}-${color}?style=for-the-badge&logo=leaf)](https://codegreen.app)`;

        navigator.clipboard.writeText(snippet).then(() => {
            alert('🎉 Markdown badge copied to clipboard!\n\nPaste this in your GitHub README.md: \n' + snippet);
        });
    };

    function triggerConfetti() {
        var duration = 3 * 1000;
        var end = Date.now() + duration;

        (function frame() {
            confetti({
                particleCount: 5,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: ['#34D399', '#FFD700', '#FFFFFF']
            });
            confetti({
                particleCount: 5,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: ['#34D399', '#FFD700', '#FFFFFF']
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        }());
    }

    function updateStatsOverview(stats) {
        if (!stats) return;

        let statsHtml = `
            <div style="display: flex; gap: 2rem; margin-top: 1rem; padding: 1rem; background: var(--bg-card); border-radius: 8px; border: 1px solid var(--border-color);">
                <div>
                    <span style="color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase;">Optimization Rate</span>
                    <div style="font-size: 1.5rem; color: var(--neon-green); font-weight: bold;">+${stats.optimized_pct}%</div>
                </div>
                <div>
                    <span style="color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase;">Refactoring Overview</span>
                    <div style="font-size: 1.2rem;">
                        <span style="color: #ffafaf;">-${stats.lines_removed} lines</span> / 
                        <span style="color: #afffaf;">+${stats.lines_added} lines</span>
                    </div>
                </div>
            </div>
        `;

        // Check if stats container exists, if not prepend it to suggestion box
        let statsContainer = document.getElementById('stats-container');
        const suggestionBox = document.getElementById('suggestion-box');

        if (!statsContainer) {
            statsContainer = document.createElement('div');
            statsContainer.id = 'stats-container';
            suggestionBox.parentNode.insertBefore(statsContainer, suggestionBox);
        }
        statsContainer.innerHTML = statsHtml;
    }

    function updateMockDiff(diffLines, optimizedCode, filename) {
        const originalCode = document.getElementById('original-code-view');
        const refactoredCode = document.getElementById('refactored-code-view');

        let originalHtml = '';
        let optimizedHtml = '';

        if (diffLines && Array.isArray(diffLines)) {
            diffLines.forEach(line => {
                const prefix = line.substring(0, 2);
                const content = line.substring(2).replace(/</g, "&lt;").replace(/>/g, "&gt;");

                if (prefix === '- ') {
                    originalHtml += `<div class="line-removed">${content}</div>\n`;
                } else if (prefix === '+ ') {
                    optimizedHtml += `<div class="line-added">${content}</div>\n`;
                } else if (prefix === '  ') {
                    originalHtml += `<div>${content}</div>\n`;
                    optimizedHtml += `<div>${content}</div>\n`;
                }
            });
            originalCode.innerHTML = originalHtml;
            refactoredCode.innerHTML = optimizedHtml;
        } else {
            // Fallback just in case
            originalCode.innerText = "Error parsing diff lines.";
            refactoredCode.innerText = optimizedCode;
        }

        // Implementation of Download Button
        const downloadBtn = document.getElementById('download-btn');
        const newBtn = downloadBtn.cloneNode(true);
        downloadBtn.parentNode.replaceChild(newBtn, downloadBtn);

        newBtn.addEventListener('click', () => {
            const blob = new Blob([optimizedCode], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'green_' + filename;
            a.click();
        });
    }

    let currentRadarChart = null;

    function renderRadarChart(originalData, refactoredData) {
        if (!originalData || !refactoredData) return;

        const ctx = document.getElementById('radarChart').getContext('2d');
        
        if (currentRadarChart) {
            currentRadarChart.destroy();
        }

        const labels = ['Formatting', 'Documentation', 'Modularity', 'Readability', 'Efficiency'];
        
        const dataOrig = [
            originalData.formatting || 0,
            originalData.documentation || 0,
            originalData.modularity || 0,
            originalData.readability || 0,
            originalData.efficiency || 0
        ];

        const dataRefactored = [
            refactoredData.formatting || 0,
            refactoredData.documentation || 0,
            refactoredData.modularity || 0,
            refactoredData.readability || 0,
            refactoredData.efficiency || 0
        ];

        currentRadarChart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Original Code',
                    data: dataOrig,
                    fill: true,
                    backgroundColor: 'rgba(255, 68, 68, 0.2)',
                    borderColor: 'rgb(255, 68, 68)',
                    pointBackgroundColor: 'rgb(255, 68, 68)',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgb(255, 68, 68)'
                }, {
                    label: 'Green Optimized',
                    data: dataRefactored,
                    fill: true,
                    backgroundColor: 'rgba(52, 211, 153, 0.4)',
                    borderColor: 'rgb(52, 211, 153)',
                    pointBackgroundColor: 'rgb(52, 211, 153)',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgb(52, 211, 153)'
                }]
            },
            options: {
                elements: {
                    line: { tension: 0 }
                },
                scales: {
                    r: {
                        angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        pointLabels: { color: '#c9d1d9', font: { size: 12, family: 'Inter' } },
                        ticks: { display: false, min: 0, max: 100 }
                    }
                },
                plugins: {
                    legend: { labels: { color: '#fff' } }
                }
            }
        });
    }

    function renderImpactCards(impactObj) {
        if (!impactObj) return;
        
        animateValue(document.getElementById("impact-cpu"), 0, impactObj.cpu_saved_pct || 0, 1500, "-", "%");
        animateValue(document.getElementById("impact-carbon"), 0, impactObj.carbon_saved_g || 0, 1500, "", "");
        
        // A mature tree absorbs ~21kg (21,000g) of CO2 per year. 
        // We divide by 21,000 to show equivalent trees planted per year.
        const trees = ((impactObj.carbon_saved_g || 0) / 21000).toFixed(4);
        document.getElementById("impact-trees").innerText = trees;
    }

    // Helper for increasing numbers
    function animateValue(obj, start, end, duration, prefix = "", suffix = "") {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            let val = progress * (end - start) + start;
            if (val % 1 !== 0 && end % 1 === 0) val = Math.floor(val); 
            else if (val % 1 !== 0) val = val.toFixed(1);
            obj.innerHTML = prefix + val + suffix;
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }
});
