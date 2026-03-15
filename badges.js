document.addEventListener('DOMContentLoaded', () => {
    const badgeGrid = document.getElementById('badge-grid');
    const loader = document.getElementById('badge-loader');

    const allBadges = [
        { name: "Zero-Carbon Architect", icon: "fa-crown", color: "FFD700", glow: "rgba(255, 215, 0, 0.4)", desc: "Avg Score ≥ 90 Ultimate Eco-Guardian" },
        { name: "Efficiency Master", icon: "fa-bolt", color: "34D399", glow: "rgba(52, 211, 153, 0.4)", desc: "Avg Score ≥ 80 Peak Performance Benchmark" },
        { name: "Carbon-Aware Coder", icon: "fa-leaf", color: "00CC33", glow: "rgba(0, 204, 51, 0.2)", desc: "Avg Score ≥ 70 Green Computing Practitioner" },
        { name: "Sprout Developer", icon: "fa-seedling", color: "90EE90", glow: "transparent", desc: "Avg Score ≥ 60 Eco-Consciousness Awakened" },
        { name: "Emission Heavy", icon: "fa-industry", color: "FF4444", glow: "transparent", desc: "Avg Score < 60 High Carbon Disaster Zone" },
        
        { name: "Comment Poet", icon: "fa-feather-alt", color: "00E5FF", glow: "rgba(0, 229, 255, 0.3)", desc: "Documentation ≥ 95 (Comment Poet)" },
        { name: "Code Architect", icon: "fa-cubes", color: "FF4500", glow: "rgba(255, 69, 0, 0.3)", desc: "Modularity ≥ 95 (Structure Builder)" },
        { name: "Zen Coder", icon: "fa-yin-yang", color: "9D00FF", glow: "rgba(157, 0, 255, 0.3)", desc: "Readability ≥ 95 (Zen Developer)" },
        { name: "Time Weaver", icon: "fa-hourglass-half", color: "FF1493", glow: "rgba(255, 20, 147, 0.3)", desc: "Efficiency ≥ 95 (Time Assassin)" },
        { name: "Style Purist", icon: "fa-gem", color: "00FA9A", glow: "rgba(0, 250, 154, 0.3)", desc: "Formatting ≥ 95 (Formatting Purist)" },
        
        { name: "The Lumberjack", icon: "fa-scissors", color: "8B4513", glow: "rgba(139, 69, 19, 0.3)", desc: "Massively reduced redundant code (Code Lumberjack)" },
        { name: "Forest Guardian", icon: "fa-tree", color: "228B22", glow: "rgba(34, 139, 34, 0.5)", desc: "Reduced >10,000g of carbon in a single refactor" },
        { name: "The Phoenix", icon: "fa-fire", color: "FF8C00", glow: "rgba(255, 140, 0, 0.6)", desc: "From terrible to great (+40 points improvement)" }
    ];

    // Read unlocked badges from localStorage
    const unlockedBadges = JSON.parse(localStorage.getItem('codeGreenBadges')) || {};

    // Simulate a slight loading delay for effect
    setTimeout(() => {
        loader.style.display = 'none';
        badgeGrid.style.display = 'grid';

        allBadges.forEach(badge => {
            const isUnlocked = unlockedBadges[badge.name] === true;
            
            const card = document.createElement('div');
            card.className = `badge-card ${isUnlocked ? 'unlocked' : 'locked'}`;
            
            if (isUnlocked) {
                card.style.borderColor = `#${badge.color}`;
                card.style.boxShadow = `0 0 15px ${badge.glow}`;
            }

            const iconHtml = `
            <div class="badge-icon-wrapper" style="${isUnlocked ? `color: #${badge.color}; border-color: #${badge.color};` : ''}">
                <i class="fas ${badge.icon}"></i>
            </div>`;

            card.innerHTML = `
                <i class="fas fa-lock lock-overlay"></i>
                ${iconHtml}
                <h3 style="color: ${isUnlocked ? `#${badge.color}` : 'var(--text-main)'}; margin-bottom: 0.5rem;">${badge.name}</h3>
                <p style="color: var(--text-muted); font-size: 0.9rem;">${badge.desc}</p>
                <div style="margin-top: 1rem; font-size: 0.8rem; font-weight: bold; color: ${isUnlocked ? 'var(--neon-green)' : '#666'};">
                    ${isUnlocked ? '✅ UNLOCKED' : '🔒 LOCKED'}
                </div>
                <button class="badge-export-btn" onclick="exportBadge('${badge.name}', '${badge.color}')">
                    <i class="fab fa-github"></i> Export for GitHub
                </button>
            `;
            badgeGrid.appendChild(card);
        });
    }, 500);

    // Make export globally accessible for inline onclick
    window.exportBadge = function (badgeName, color) {
        const encodedName = encodeURIComponent(badgeName);
        const snippet = `[![CodeGreen Status](https://img.shields.io/badge/CodeGreen-${encodedName}-${color}?style=for-the-badge&logo=leaf)](https://codegreen.app)`;

        navigator.clipboard.writeText(snippet).then(() => {
            alert('🎉 Markdown badge copied to clipboard!\n\nPaste this in your GitHub README.md: \n' + snippet);
        });
    };
});
