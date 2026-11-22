/* =====================================================
   REACTION ARENA — COMPLETE SCRIPT (script.js v4.5)
===================================================== */
(function () {
    'use strict';

    const STATE_KEY = 'reactionArenaState_v4';
    const XP_PER_LEVEL = 300;

    function getDefaultState() {
        return {
            username: 'Player',
            sound: 'on',
            animation: 'on',
            duelKeyP1: 'a',
            duelKeyP2: 'l',
            totalXP: 0,
            dailyCompleted: false,
            aimRunsCompleted: 0,
            cpsRunsCompleted: 0,
            typingRunsCompleted: 0,
            stroopRunsCompleted: 0,
            driveRunsCompleted: 0,
            surgeRunsCompleted: 0,
            bestWPM: 0,
            bestStroopScore: 0,
            bestDriveStreak: 0,
            bestSurgeScore: 0,
            bestSurgeWave: 0,
            lastRecordNote: '',
            earlyClicks: 0,
            bestStreak: 0,
            duelsWon: 0,
            bestAimScore: 0,
            bestCPS: 0,
            modesPlayed: [],
            games: [],
            ownedItems: [],
            equippedTheme: null,
            skinRing: false,
            arenaGrid: false,
            signalPulse: false,
            sonicWave: false,
            rainbowBar: false,
            crosshairDot: false,
            targetSolar: false,
            clickRipple: false,
            equippedTitle: null,
            achievements: {
                firstGame: false,
                speedDemon: false,
                lightning: false,
                mythicReflex: false,
                veteran: false,
                streakMaster: false,
                marathon: false,
                duelChampion: false,
                aimHunter: false,
                apexAim: false,
                clickSprinter: false,
                godspeedClicker: false,
                precisionMaster: false,
                modeExplorer: false
            }
        };
    }

    function readState() {
        try {
            const raw = JSON.parse(localStorage.getItem(STATE_KEY) || 'null');
            const def = getDefaultState();
            if (!raw || typeof raw !== 'object') return def;
            return {
                ...def,
                ...raw,
                duelKeyP1: raw.duelKeyP1 || 'a',
                duelKeyP2: raw.duelKeyP2 || 'l',
                totalXP: Math.max(0, Number(raw.totalXP) || 0),
                aimRunsCompleted: Math.max(0, Number(raw.aimRunsCompleted) || 0),
                cpsRunsCompleted: Math.max(0, Number(raw.cpsRunsCompleted) || 0),
                typingRunsCompleted: Math.max(0, Number(raw.typingRunsCompleted) || 0),
                stroopRunsCompleted: Math.max(0, Number(raw.stroopRunsCompleted) || 0),
                driveRunsCompleted: Math.max(0, Number(raw.driveRunsCompleted) || 0),
                surgeRunsCompleted: Math.max(0, Number(raw.surgeRunsCompleted) || 0),
                bestWPM: Math.max(0, Number(raw.bestWPM) || 0),
                bestStroopScore: Math.max(0, Number(raw.bestStroopScore) || 0),
                bestDriveStreak: Math.max(0, Number(raw.bestDriveStreak) || 0),
                bestSurgeScore: Math.max(0, Number(raw.bestSurgeScore) || 0),
                bestSurgeWave: Math.max(0, Number(raw.bestSurgeWave) || 0),
                earlyClicks: Math.max(0, Number(raw.earlyClicks) || 0),
                bestStreak: Math.max(0, Number(raw.bestStreak) || 0),
                duelsWon: Math.max(0, Number(raw.duelsWon) || 0),
                bestAimScore: Math.max(0, Number(raw.bestAimScore) || 0),
                bestCPS: Math.max(0, Number(raw.bestCPS) || 0),
                modesPlayed: Array.isArray(raw.modesPlayed) ? raw.modesPlayed : [],
                games: Array.isArray(raw.games) ? raw.games : [],
                ownedItems: Array.isArray(raw.ownedItems) ? raw.ownedItems : [],
                achievements: {
                    ...def.achievements,
                    ...(raw.achievements && typeof raw.achievements === 'object' ? raw.achievements : {})
                }
            };
        } catch {
            return getDefaultState();
        }
    }

    function writeState(nextState) {
        const evaluated = evaluateAchievements(nextState);
        try {
            localStorage.setItem(STATE_KEY, JSON.stringify(evaluated));
        } catch {
            // Storage quota or restricted mode fallback
        }
        document.dispatchEvent(new CustomEvent('ra:state-updated', { detail: evaluated }));
    }

    function showToast(message) {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.textContent = message;
        toast.classList.remove('hidden');
        clearTimeout(showToast._timer);
        showToast._timer = setTimeout(() => {
            toast.classList.add('hidden');
        }, 2400);
    }

    function playTone(freq, durationMs = 110, type = 'sine', gainVal = 0.06) {
        const st = readState();
        if (st.sound === 'off') return;
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            if (!playTone._ctx) playTone._ctx = new AudioCtx();
            const ctx = playTone._ctx;
            if (ctx.state === 'suspended') ctx.resume();

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            gain.gain.setValueAtTime(gainVal, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + durationMs / 1000);
        } catch {
            // Audio context blocked before interaction
        }
    }

    const sfx = {
        start: () => playTone(520, 90, 'triangle', 0.05),
        go: () => playTone(880, 120, 'sine', 0.07),
        hit: () => playTone(660, 65, 'sine', 0.05),
        click: () => playTone(440, 35, 'triangle', 0.03),
        early: () => playTone(170, 210, 'sawtooth', 0.06),
        reward: () => {
            playTone(660, 90, 'triangle', 0.06);
            setTimeout(() => playTone(990, 140, 'sine', 0.06), 95);
        }
    };

    function parseNumericTime(val) {
        if (typeof val === 'number') return Number.isFinite(val) && val > 0 ? val : NaN;
        const match = String(val || '').match(/(\d+(?:\.\d+)?)\s*ms/i);
        if (!match) return NaN;
        const num = Number(match[1]);
        return Number.isFinite(num) && num > 0 ? num : NaN;
    }

    function recordMode(st, modeKey) {
        if (!modeKey) return;
        const normalized = String(modeKey).toUpperCase();
        if (!st.modesPlayed.includes(normalized)) {
            st.modesPlayed.push(normalized);
        }
    }

    function pushHistoryEntry(timeOrScore, rating, mode, xp) {
        const st = readState();
        const cleanMode = String(mode || 'CLASSIC').toUpperCase();
        const earned = Math.max(0, Math.round(Number(xp) || 0));
        const numericMs = parseNumericTime(timeOrScore);

        recordMode(st, cleanMode);
        st.totalXP += earned;
        if (Number.isFinite(numericMs) && numericMs > 0 && numericMs < 250) {
            st.dailyCompleted = true;
        }
        st.games.unshift({
            time: timeOrScore,
            rating: rating || 'Good',
            mode: cleanMode,
            xp: earned,
            date: new Date().toLocaleDateString()
        });
        writeState(st);
    }

    function showPage(pageName) {
        if (!pageName) return;
        document.querySelectorAll('.page').forEach(p => {
            p.classList.toggle('active', p.id === pageName);
        });
        document.querySelectorAll('.nav-button[data-page]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.page === pageName);
        });

        const titles = {
            home: ['Dashboard', 'Welcome back! Ready to improve your reaction speed?'],
            arena: ['Reaction Arena', 'Wait for the green signal and react as fast as possible.'],
            aim: ['Aim Trainer', 'Hit targets before they expire and earn your speed category + XP.'],
            clicker: ['Click Tester', 'Test how many clicks you can land in a set time window.'],
            typing: ['Typing Reflex', '30-second reflex typing run with live WPM and accuracy.'],
            stroop: ['Stroop Blitz', 'Match the ink color while ignoring the word meaning against the clock.'],
            drive: ['Turbo Drive Quiz 3D', 'Steer with A/D or arrow keys and answer timed mid-drive questions endlessly.'],
            surge: ['Surge Rush', 'Endurance wave mode with combo multipliers and precision pointer + keyboard play.'],
            levels: ['Levels & Ranks', 'Track your level progression and 12-tier competitive rank.'],
            history: ['Game History', 'Review your completed rounds and reaction times.'],
            achievements: ['Achievements', 'Complete challenges and collect rewards.'],
            shop: ['XP Shop', 'Spend your earned XP on profile titles and bonus XP crates.'],
            settings: ['Settings', 'Customize profile, duel keys, audio, and local backup data.']
        };

        const titleEl = document.getElementById('pageTitle');
        const subEl = document.getElementById('pageSubtitle');
        if (titles[pageName]) {
            if (titleEl) titleEl.textContent = titles[pageName][0];
            if (subEl) subEl.textContent = titles[pageName][1];
        }

        document.getElementById('sidebar')?.classList.remove('open');
        document.getElementById('sidebarOverlay')?.classList.remove('show');
        document.getElementById('profileDropdown')?.classList.add('hidden');
        document.getElementById('notificationPopover')?.classList.add('hidden');
        document.dispatchEvent(new CustomEvent('ra:page-changed', { detail: { page: pageName } }));
    }

    /* -------------------------------------------------
       12-RANK SYSTEM
    ------------------------------------------------- */
    const RANKS_12 = [
        { name: 'Iron I', div: 'DIV I', minXP: 0, icon: 'fa-shield' },
        { name: 'Iron II', div: 'DIV II', minXP: 250, icon: 'fa-shield' },
        { name: 'Bronze I', div: 'DIV III', minXP: 550, icon: 'fa-medal' },
        { name: 'Bronze II', div: 'DIV IV', minXP: 900, icon: 'fa-medal' },
        { name: 'Silver I', div: 'DIV V', minXP: 1300, icon: 'fa-award' },
        { name: 'Silver II', div: 'DIV VI', minXP: 1750, icon: 'fa-award' },
        { name: 'Gold I', div: 'DIV VII', minXP: 2250, icon: 'fa-crown' },
        { name: 'Gold II', div: 'DIV VIII', minXP: 2800, icon: 'fa-crown' },
        { name: 'Platinum I', div: 'DIV IX', minXP: 3400, icon: 'fa-gem' },
        { name: 'Diamond I', div: 'DIV X', minXP: 4100, icon: 'fa-gem' },
        { name: 'Master', div: 'DIV XI', minXP: 4900, icon: 'fa-bolt' },
        { name: 'Grandmaster', div: 'DIV XII', minXP: 5800, icon: 'fa-trophy' }
    ];

    function renderRanks() {
        const st = readState();
        const xp = st.totalXP;
        const level = Math.floor(xp / XP_PER_LEVEL) + 1;
        const xpInLevel = xp % XP_PER_LEVEL;
        const levelPct = Math.min(100, Math.round((xpInLevel / XP_PER_LEVEL) * 100));

        const sideLevel = document.getElementById('sideLevel');
        const sideXP = document.getElementById('sideXP');
        const totalXPEl = document.getElementById('totalXP');
        const xpToNext = document.getElementById('xpToNextLevel');
        const sideProgress = document.getElementById('sideProgress');
        const levelDisplay = document.getElementById('levelDisplay');
        const levelHeading = document.getElementById('levelHeading');
        const levelProgress = document.getElementById('levelProgress');
        const sideXPDisplay = document.getElementById('sideXPDisplay');

        if (sideLevel) sideLevel.textContent = level;
        if (sideXP) sideXP.textContent = xp;
        if (totalXPEl) totalXPEl.textContent = xp;
        if (xpToNext) xpToNext.textContent = XP_PER_LEVEL - xpInLevel;
        if (sideProgress) sideProgress.style.width = `${levelPct}%`;
        if (levelDisplay) levelDisplay.textContent = level;
        if (levelHeading) levelHeading.textContent = level;
        if (levelProgress) levelProgress.style.width = `${levelPct}%`;
        if (sideXPDisplay) sideXPDisplay.textContent = xp;

        const userName = st.username || 'Player';
        const initial = userName.charAt(0).toUpperCase() || 'P';
        ['sidebarAvatar', 'profileButton'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = initial;
        });
        const sUser = document.getElementById('sidebarUsername');
        const dUser = document.getElementById('dropdownUsername');
        if (sUser) sUser.textContent = userName;
        if (dUser) dUser.textContent = userName;

        let currentIdx = 0;
        for (let i = 0; i < RANKS_12.length; i++) {
            if (xp >= RANKS_12[i].minXP) currentIdx = i;
        }
        const curr = RANKS_12[currentIdx];
        const next = RANKS_12[currentIdx + 1] || null;

        const rankTitle = st.equippedTitle || curr.name;
        const sideRank = document.getElementById('sidebarRankTitle');
        const currRankStat = document.getElementById('currentRankStat');
        const levelRankLabel = document.getElementById('levelRankLabel');
        if (sideRank) sideRank.textContent = rankTitle;
        if (currRankStat) currRankStat.textContent = curr.name;
        if (levelRankLabel) levelRankLabel.textContent = curr.name;

        const addonTitle = document.getElementById('rankAddonTitle');
        const addonPill = document.getElementById('rankAddonTierPill');
        const addonNext = document.getElementById('rankAddonNextText');
        const addonBar = document.getElementById('rankAddonProgress');
        const addonIcon = document.getElementById('rankAddonIcon');
        const addonList = document.getElementById('rankAddonList');

        if (addonTitle) addonTitle.textContent = curr.name;
        if (addonPill) addonPill.textContent = curr.div;
        if (addonIcon) addonIcon.innerHTML = `<i class="fa-solid ${curr.icon}"></i>`;

        if (next) {
            const span = next.minXP - curr.minXP;
            const prog = Math.max(0, xp - curr.minXP);
            const pct = Math.min(100, Math.round((prog / span) * 100));
            if (addonNext) addonNext.textContent = `${prog} / ${span} XP to ${next.name}`;
            if (addonBar) addonBar.style.width = `${pct}%`;
        } else {
            if (addonNext) addonNext.textContent = 'MAX RANK REACHED';
            if (addonBar) addonBar.style.width = '100%';
        }

        if (addonList) {
            addonList.innerHTML = RANKS_12.map((r, idx) => {
                const reached = xp >= r.minXP;
                const isCurr = idx === currentIdx;
                return `
                    <div class="rank-step ${reached ? 'reached' : ''} ${isCurr ? 'current' : ''}">
                        <strong>${r.name}</strong><br>
                        <small>${r.minXP} XP</small>
                    </div>
                `;
            }).join('');
        }
    }

    /* -------------------------------------------------
       ACHIEVEMENTS (14 BADGES)
    ------------------------------------------------- */
    const ACHIEVEMENTS_LIST = [
        { id: 'firstGame', icon: 'fa-bolt', title: 'First Reflex', desc: 'Complete 1 reaction round.' },
        { id: 'speedDemon', icon: 'fa-gauge-high', title: 'Speed Demon', desc: 'Get a reaction time under 220ms.' },
        { id: 'lightning', icon: 'fa-wand-magic-sparkles', title: 'Lightning Fast', desc: 'Get a reaction time under 170ms.' },
        { id: 'mythicReflex', icon: 'fa-star', title: 'Mythic Reflex', desc: 'Get a reaction time under 130ms.' },
        { id: 'veteran', icon: 'fa-shield-halved', title: 'Arena Veteran', desc: 'Complete 15 recorded rounds.' },
        { id: 'streakMaster', icon: 'fa-fire', title: 'Streak Master', desc: 'Build a 4+ fast streak under 250ms.' },
        { id: 'marathon', icon: 'fa-flag-checkered', title: 'Marathon Runner', desc: 'Complete 40 recorded rounds.' },
        { id: 'duelChampion', icon: 'fa-users', title: 'Duel Champion', desc: 'Win a 2-Player Duel round.' },
        { id: 'aimHunter', icon: 'fa-crosshairs', title: 'Aim Hunter', desc: 'Score 12+ hits in an Aim Trainer run.' },
        { id: 'apexAim', icon: 'fa-bullseye', title: 'Apex Aim', desc: 'Score 25+ hits in an Aim Trainer run.' },
        { id: 'clickSprinter', icon: 'fa-computer-mouse', title: 'Click Sprinter', desc: 'Reach 6.5+ CPS in Click Tester.' },
        { id: 'godspeedClicker', icon: 'fa-angles-right', title: 'Godspeed Clicker', desc: 'Reach 10.0+ CPS in Click Tester.' },
        { id: 'precisionMaster', icon: 'fa-bullseye', title: 'Precision Master', desc: 'Complete a Precision mode round.' },
        { id: 'modeExplorer', icon: 'fa-compass', title: 'Mode Explorer', desc: 'Play at least 4 distinct modes.' }
    ];

    function evaluateAchievements(st) {
        const times = (st.games || []).map(g => parseNumericTime(g.time)).filter(t => Number.isFinite(t) && t > 0);
        const fastest = times.length ? Math.min(...times) : Infinity;

        let liveStreak = 0;
        for (const g of (st.games || [])) {
            const t = parseNumericTime(g.time);
            if (Number.isFinite(t) && t < 250) liveStreak++;
            else break;
        }
        st.bestStreak = Math.max(Number(st.bestStreak) || 0, liveStreak);

        const ach = { ...getDefaultState().achievements, ...(st.achievements || {}) };
        ach.firstGame = ach.firstGame || (st.games || []).length >= 1;
        ach.speedDemon = ach.speedDemon || fastest < 220;
        ach.lightning = ach.lightning || fastest < 170;
        ach.mythicReflex = ach.mythicReflex || fastest < 130;
        ach.veteran = ach.veteran || (st.games || []).length >= 15;
        ach.streakMaster = ach.streakMaster || st.bestStreak >= 4;
        ach.marathon = ach.marathon || (st.games || []).length >= 40;
        ach.duelChampion = ach.duelChampion || (Number(st.duelsWon) || 0) >= 1;
        ach.aimHunter = ach.aimHunter || (Number(st.bestAimScore) || 0) >= 12;
        ach.apexAim = ach.apexAim || (Number(st.bestAimScore) || 0) >= 25;
        ach.clickSprinter = ach.clickSprinter || (Number(st.bestCPS) || 0) >= 6.5;
        ach.godspeedClicker = ach.godspeedClicker || (Number(st.bestCPS) || 0) >= 10.0;
        ach.precisionMaster = ach.precisionMaster || (st.modesPlayed || []).includes('PRECISION');
        ach.modeExplorer = ach.modeExplorer || (st.modesPlayed || []).length >= 4;

        st.achievements = ach;
        return st;
    }

    function renderAchievements(st) {
        const grid = document.getElementById('achievementsGrid');
        const ach = st.achievements || {};
        let unlockedCount = 0;

        if (grid) {
            grid.innerHTML = ACHIEVEMENTS_LIST.map(item => {
                const unlocked = Boolean(ach[item.id]);
                if (unlocked) unlockedCount++;
                return `
                    <div class="achievement-card ${unlocked ? 'unlocked' : ''}">
                        <i class="fa-solid ${item.icon}"></i>
                        <h3>${item.title}</h3>
                        <p>${item.desc}</p>
                        <span class="achievement-tag">${unlocked ? 'UNLOCKED' : 'LOCKED'}</span>
                    </div>
                `;
            }).join('');
        } else {
            unlockedCount = ACHIEVEMENTS_LIST.filter(i => Boolean(ach[i.id])).length;
        }

        renderNotifications(st, unlockedCount);
    }

    /* -------------------------------------------------
       XP SHOP
    ------------------------------------------------- */
    const SHOP_ITEMS = [
        { id: 'title_bolt', icon: 'fa-bolt', name: 'Title: Bolt Runner', desc: 'Equip the Bolt Runner badge title.', cost: 150, title: 'Bolt Runner' },
        { id: 'title_ace', icon: 'fa-crown', name: 'Title: Reflex Ace', desc: 'Equip the Reflex Ace competitive title.', cost: 350, title: 'Reflex Ace' },
        { id: 'title_nova', icon: 'fa-fire', name: 'Title: Surge Vanguard', desc: 'Equip the Surge Vanguard endurance title.', cost: 600, title: 'Surge Vanguard' },
        { id: 'crate_xp', icon: 'fa-box-open', name: 'Reflex XP Crate', desc: 'Instant +120 bonus XP boost.', cost: 200, xpBonus: 120 }
    ];

    function renderShop(st) {
        const grid = document.getElementById('shopGrid');
        const bal = document.getElementById('shopXpBalance');
        if (bal) bal.textContent = `${st.totalXP} XP`;
        if (!grid) return;

        grid.innerHTML = SHOP_ITEMS.map(item => {
            const owned = item.title ? st.ownedItems.includes(item.id) : false;
            const equipped = item.title ? st.equippedTitle === item.title : false;
            let btnLabel = `Buy (${item.cost} XP)`;
            if (equipped) btnLabel = 'Equipped';
            else if (owned) btnLabel = 'Equip Title';

            return `
                <div class="shop-card">
                    <i class="fa-solid ${item.icon}"></i>
                    <h3>${item.name}</h3>
                    <p>${item.desc}</p>
                    <button type="button" class="${equipped ? 'secondary-button' : 'primary-button'}" data-shop-item="${item.id}">
                        ${btnLabel}
                    </button>
                </div>
            `;
        }).join('');
    }

    /* -------------------------------------------------
       LEADERBOARD & RIVAL TARGET
    ------------------------------------------------- */
    let activeLeaderboardTab = 'reaction';

    function renderLeaderboard(st) {
        const listEl = document.getElementById('leaderboardList');
        const metricEl = document.getElementById('leaderboardMetricLabel');
        const noteEl = document.getElementById('leaderboardNote');
        if (!listEl) return;

        const level = Math.floor((st.totalXP || 0) / XP_PER_LEVEL) + 1;
        const playerName = st.username || 'Player';
        const times = (st.games || []).map(g => parseNumericTime(g.time)).filter(t => Number.isFinite(t) && t > 0);
        const playerBestMs = times.length ? Math.min(...times) : null;
        const playerAim = Number(st.bestAimScore) || 0;
        const playerCps = Number(st.bestCPS) || 0;

        const rivals = {
            reaction: [
                { name: 'Vortex', val: 168, lvl: 14 },
                { name: 'Kairo', val: 205, lvl: 9 },
                { name: 'Lyra', val: 245, lvl: 6 },
                { name: 'Nova', val: 295, lvl: 4 }
            ],
            aim: [
                { name: 'Hawkeye', val: 28, lvl: 13 },
                { name: 'Pulse', val: 19, lvl: 8 },
                { name: 'Echo', val: 12, lvl: 5 },
                { name: 'Drift', val: 6, lvl: 2 }
            ],
            cps: [
                { name: 'TurboTap', val: 11.4, lvl: 15 },
                { name: 'Quill', val: 8.2, lvl: 8 },
                { name: 'Spark', val: 6.1, lvl: 5 },
                { name: 'Bit', val: 4.2, lvl: 2 }
            ]
        };

        let entries = [];
        if (activeLeaderboardTab === 'aim') {
            if (metricEl) metricEl.textContent = 'BEST HITS';
            if (noteEl) noteEl.textContent = 'Ranked by highest Aim Trainer score (more hits is better).';
            entries = rivals.aim.map(r => ({ ...r, display: `${r.val} pts`, isPlayer: false }));
            if (playerAim > 0) {
                entries.push({ name: playerName, val: playerAim, lvl: level, display: `${playerAim} pts`, isPlayer: true });
            }
            entries.sort((a, b) => b.val - a.val);
        } else if (activeLeaderboardTab === 'cps') {
            if (metricEl) metricEl.textContent = 'PEAK CPS';
            if (noteEl) noteEl.textContent = 'Ranked by peak Click Tester clicks per second.';
            entries = rivals.cps.map(r => ({ ...r, display: `${r.val.toFixed(1)} CPS`, isPlayer: false }));
            if (playerCps > 0) {
                entries.push({ name: playerName, val: playerCps, lvl: level, display: `${playerCps.toFixed(1)} CPS`, isPlayer: true });
            }
            entries.sort((a, b) => b.val - a.val);
        } else {
            if (metricEl) metricEl.textContent = 'BEST TIME';
            if (noteEl) noteEl.textContent = 'Ranked by fastest reaction time (lower ms is faster).';
            entries = rivals.reaction.map(r => ({ ...r, display: `${r.val} ms`, isPlayer: false }));
            if (playerBestMs !== null) {
                entries.push({ name: playerName, val: playerBestMs, lvl: level, display: `${playerBestMs} ms`, isPlayer: true });
            }
            entries.sort((a, b) => a.val - b.val);
        }

        listEl.innerHTML = entries.slice(0, 5).map((row, idx) => `
            <div class="leaderboard-row ${row.isPlayer ? 'is-player' : ''}">
                <div class="leaderboard-player">
                    <span class="leaderboard-rank">${idx + 1}</span>
                    <span class="leaderboard-name">${row.name}</span>
                    ${row.isPlayer ? '<span class="leaderboard-badge">YOU</span>' : ''}
                </div>
                <span class="leaderboard-time">${row.display}</span>
                <span class="leaderboard-level">LVL ${row.lvl}</span>
            </div>
        `).join('');

        const headEl = document.getElementById('rivalTargetHeadline');
        const detEl = document.getElementById('rivalTargetDetail');
        if (headEl && detEl) {
            if (playerBestMs === null) {
                headEl.textContent = 'Play a round to set your rival target';
                detEl.textContent = 'Complete a Reaction Arena round to benchmark against Vortex (168ms) and Kairo (205ms).';
            } else {
                const nextRival = [...rivals.reaction].reverse().find(r => r.val < playerBestMs);
                if (nextRival) {
                    headEl.textContent = `Target ${nextRival.name}: ${nextRival.val} ms`;
                    detEl.textContent = `You are currently at ${playerBestMs} ms — shave off ${playerBestMs - nextRival.val} ms to pass ${nextRival.name}.`;
                } else {
                    headEl.textContent = `Top Reaction Tier Cleared (${playerBestMs} ms)`;
                    detEl.textContent = 'You beat the preset reaction rivals — push your average and streak higher!';
                }
            }
        }
    }

    /* -------------------------------------------------
       DASHBOARD STATS, MISSIONS, CHART, ACTIVITY & HISTORY
    ------------------------------------------------- */
    function renderReactionChart(games) {
        const svg = document.getElementById('reactionChart');
        const emptyEl = document.getElementById('chartEmpty');
        if (!svg) return;

        const points = games
            .slice(0, 10)
            .reverse()
            .map(g => parseNumericTime(g.time))
            .filter(t => Number.isFinite(t) && t > 0);

        if (points.length < 2) {
            svg.innerHTML = '';
            svg.classList.add('hidden');
            emptyEl?.classList.remove('hidden');
            return;
        }

        svg.classList.remove('hidden');
        emptyEl?.classList.add('hidden');

        const w = 640;
        const h = 190;
        const padX = 36;
        const padY = 26;
        const minVal = Math.max(50, Math.min(...points) - 20);
        const maxVal = Math.max(...points) + 20;
        const span = Math.max(1, maxVal - minVal);

        const coords = points.map((val, idx) => {
            const x = padX + (idx / Math.max(1, points.length - 1)) * (w - padX * 2);
            const y = padY + ((val - minVal) / span) * (h - padY * 2);
            return { x, y, val };
        });

        const polylinePts = coords.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
        const areaPts = `${coords[0].x.toFixed(1)},${h - padY} ${polylinePts} ${coords[coords.length - 1].x.toFixed(1)},${h - padY}`;

        const dots = coords.map(p => `
            <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4.5" fill="#a78bfa" />
            <text x="${p.x.toFixed(1)}" y="${(p.y - 9).toFixed(1)}" fill="#bac5de" font-size="10" text-anchor="middle">${p.val}ms</text>
        `).join('');

        svg.innerHTML = `
            <defs>
                <linearGradient id="raAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.32" />
                    <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0.0" />
                </linearGradient>
            </defs>
            <polygon points="${areaPts}" fill="url(#raAreaGrad)" />
            <polyline points="${polylinePts}" fill="none" stroke="#8b5cf6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
            ${dots}
        `;
    }

    function renderNotifications(st, unlockedCount) {
        const listEl = document.getElementById('notificationList');
        const badgeEl = document.getElementById('notifBadgeCount');
        if (!listEl) return;

        const times = (st.games || []).map(g => parseNumericTime(g.time)).filter(t => Number.isFinite(t) && t > 0);
        const doneDaily = Boolean(st.dailyCompleted) || times.some(t => t < 250);
        const bestMs = times.length ? `${Math.min(...times)}ms` : 'No runs yet';

        if (badgeEl) badgeEl.textContent = `${unlockedCount} Unlocks`;

        listEl.innerHTML = `
            <li><strong>Daily Mission (under 250ms):</strong> ${doneDaily ? 'Completed' : 'In progress'}</li>
            <li><strong>Best Reaction:</strong> ${bestMs} • <strong>Best Aim:</strong> ${st.bestAimScore || 0} pts</li>
            <li><strong>Best CPS:</strong> ${Number(st.bestCPS || 0).toFixed(1)} CPS • <strong>Surge Best:</strong> ${st.bestSurgeScore || 0}</li>
        `;
    }

    function renderMissionsAndBanner(st, times, bestStreak) {
        const pbTitle = document.getElementById('pbMilestoneTitle');
        const pbSub = document.getElementById('pbMilestoneSub');
        const bestMs = times.length ? `${Math.min(...times)}ms` : '---';
        const bestAim = `${Number(st.bestAimScore) || 0} pts`;
        const bestCps = `${Number(st.bestCPS || 0).toFixed(1)} CPS`;
        const bestDrive = `${Number(st.bestDriveStreak) || 0} streak`;
        const bestSurge = `${Number(st.bestSurgeScore) || 0} pts`;

        if (pbTitle) {
            pbTitle.textContent = st.lastRecordNote
                ? `Latest Milestone: ${st.lastRecordNote}`
                : `Personal Bests — Reaction: ${bestMs} • Aim: ${bestAim} • Surge: ${bestSurge}`;
        }
        if (pbSub) {
            pbSub.textContent = `Reaction: ${bestMs} | Aim: ${bestAim} | Clicks: ${bestCps} | Typing: ${Number(st.bestWPM) || 0} WPM | Drive: ${bestDrive} | Surge: ${bestSurge}`;
        }

        const crossCount =
            (times.length > 0 ? 1 : 0) +
            ((Number(st.aimRunsCompleted) || 0) > 0 ? 1 : 0) +
            ((Number(st.cpsRunsCompleted) || 0) > 0 ? 1 : 0);

        const crossStatus = document.getElementById('weeklyCrossStatus');
        const crossBar = document.getElementById('weeklyCrossBar');
        if (crossStatus) crossStatus.textContent = `${crossCount} / 3`;
        if (crossBar) crossBar.style.width = `${Math.round((crossCount / 3) * 100)}%`;

        const paceCount = (times.some(t => t < 240) ? 1 : 0) + (bestStreak >= 3 ? 1 : 0);
        const paceStatus = document.getElementById('weeklyPaceStatus');
        const paceBar = document.getElementById('weeklyPaceBar');
        if (paceStatus) paceStatus.textContent = `${paceCount} / 2`;
        if (paceBar) paceBar.style.width = `${Math.round((paceCount / 2) * 100)}%`;
    }

    function renderDashboard() {
        const st = readState();
        const games = st.games || [];
        const times = games.map(g => parseNumericTime(g.time)).filter(t => Number.isFinite(t) && t > 0);
        const earlyClicks = Number(st.earlyClicks) || 0;

        const bestEl = document.getElementById('best');
        const avgEl = document.getElementById('average');
        const accEl = document.getElementById('accuracyStat');
        const streakEl = document.getElementById('streakStat');
        const totalGamesEl = document.getElementById('totalGames');
        const bestDriveEl = document.getElementById('bestDriveStat');
        const dailyBar = document.getElementById('dailyProgress');
        const dailyStatus = document.getElementById('dailyStatus');
        const activityPanel = document.getElementById('recentActivity');

        if (bestEl) bestEl.textContent = times.length ? `${Math.min(...times)}ms` : '---';
        if (avgEl) {
            const avg = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null;
            avgEl.textContent = avg !== null ? `${avg}ms` : '---';
        }
        if (accEl) {
            const totalAttempts = games.length + earlyClicks;
            const acc = totalAttempts > 0 ? Math.round((games.length / totalAttempts) * 100) : 100;
            accEl.textContent = `${acc}%`;
        }

        let streak = 0;
        for (const g of games) {
            const t = parseNumericTime(g.time);
            if (Number.isFinite(t) && t < 250) streak++;
            else break;
        }
        const bestStreak = Math.max(Number(st.bestStreak) || 0, streak);
        if (streakEl) streakEl.textContent = bestStreak;
        if (totalGamesEl) totalGamesEl.textContent = games.length;
        if (bestDriveEl) bestDriveEl.textContent = `${Number(st.bestDriveStreak) || 0}`;

        const doneDaily = Boolean(st.dailyCompleted) || times.some(t => t < 250);
        if (dailyBar) dailyBar.style.width = doneDaily ? '100%' : '0%';
        if (dailyStatus) dailyStatus.textContent = doneDaily ? '1 / 1 completed' : '0 / 1 completed';

        renderMissionsAndBanner(st, times, bestStreak);
        renderReactionChart(games);

        if (activityPanel) {
            if (!games.length) {
                activityPanel.innerHTML = `
                    <div class="activity-empty">
                        <i class="fa-solid fa-clock"></i>
                        <h3>No activity yet</h3>
                        <p>Play your first game to see your activity here.</p>
                    </div>
                `;
            } else {
                activityPanel.innerHTML = `
                    <div class="activity-list">
                        ${games.slice(0, 5).map(g => `
                            <div class="activity-item">
                                <div>
                                    <strong>${g.time} — ${g.rating} (${g.mode})</strong>
                                    <small>${g.date || ''}</small>
                                </div>
                                <span class="activity-xp">+${g.xp || 0} XP</span>
                            </div>
                        `).join('')}
                    </div>
                `;
            }
        }
    }

    function renderHistory() {
        const tbody = document.getElementById('historyBody');
        if (!tbody) return;

        const st = readState();
        const query = (document.getElementById('historySearch')?.value || '').trim().toLowerCase();
        const modeFilter = (document.getElementById('historyFilterMode')?.value || 'ALL').toUpperCase();

        const rows = (st.games || [])
            .map((g, index) => ({ g, index }))
            .filter(({ g }) => {
                const modeMatch = modeFilter === 'ALL' || (g.mode || '').toUpperCase() === modeFilter;
                if (!modeMatch) return false;
                if (!query) return true;
                const hay = `${g.time} ${g.rating || ''} ${g.mode || ''} ${g.date || ''}`.toLowerCase();
                return hay.includes(query);
            });

        if (!rows.length) {
            tbody.innerHTML = '<tr><td colspan="6">No matching games found.</td></tr>';
            return;
        }

        tbody.innerHTML = rows.map(({ g, index }) => `
            <tr>
                <td><strong>${g.time}</strong></td>
                <td>${g.rating || 'Good'}</td>
                <td>${g.mode || 'CLASSIC'}</td>
                <td>+${g.xp || 0} XP</td>
                <td>${g.date || '-'}</td>
                <td>
                    <button type="button" class="row-delete-btn" data-delete-game="${index}">Delete</button>
                </td>
            </tr>
        `).join('');
    }

    /* -------------------------------------------------
       REACTION ARENA ENGINE
    ------------------------------------------------- */
    const arena = {
        phase: 'idle',
        round: 0,
        maxRounds: 5,
        startTime: 0,
        timer: null,
        times: [],
        sessionXP: 0
    };

    function modeRoundCount(mode) {
        return mode === 'sprint' ? 10 : 5;
    }

    function setArenaPhase(phase, title, msg, cls) {
        const screen = document.getElementById('gameScreen');
        const titleEl = document.getElementById('signalTitle');
        const msgEl = document.getElementById('signalMessage');
        const startBtn = document.getElementById('startButton');
        const nextBtn = document.getElementById('nextButton');

        arena.phase = phase;
        if (screen) {
            screen.classList.remove('state-wait', 'state-go');
            if (cls) screen.classList.add(cls);
        }
        if (titleEl) titleEl.textContent = title;
        if (msgEl) msgEl.textContent = msg;

        if (phase === 'round_done') {
            nextBtn?.classList.remove('hidden');
            if (startBtn) startBtn.disabled = false;
        } else {
            nextBtn?.classList.add('hidden');
            if (startBtn) startBtn.disabled = (phase === 'waiting' || phase === 'go');
        }
    }

    function updateArenaHud() {
        const mode = document.getElementById('modeSelect')?.value || 'classic';
        const total = modeRoundCount(mode);
        const roundEl = document.getElementById('round');
        const bestEl = document.getElementById('gameBest');
        const avgEl = document.getElementById('gameAverage');

        if (roundEl) roundEl.textContent = `${arena.round} / ${total}`;
        if (bestEl) bestEl.textContent = arena.times.length ? `${Math.min(...arena.times)}ms` : '---';
        if (avgEl) {
            avgEl.textContent = arena.times.length
                ? `${Math.round(arena.times.reduce((a, b) => a + b, 0) / arena.times.length)}ms`
                : '---';
        }
    }

    function showArenaSummary() {
        const box = document.getElementById('arenaSessionSummary');
        if (!box) return;
        box.classList.remove('hidden');
        const spreadEl = document.getElementById('summarySpread');
        const roundsEl = document.getElementById('summaryRounds');
        const xpEl = document.getElementById('summaryXP');
        if (spreadEl) {
            spreadEl.textContent = arena.times.length >= 2
                ? `${Math.max(...arena.times) - Math.min(...arena.times)}ms`
                : '---';
        }
        if (roundsEl) roundsEl.textContent = `${arena.times.length}`;
        if (xpEl) xpEl.textContent = `+${arena.sessionXP} XP`;
    }

    function startArenaRound() {
        clearTimeout(arena.timer);
        const mode = document.getElementById('modeSelect')?.value || 'classic';
        arena.maxRounds = modeRoundCount(mode);
        if (arena.round >= arena.maxRounds) {
            arena.round = 0;
            arena.times = [];
            arena.sessionXP = 0;
        }
        arena.round += 1;
        updateArenaHud();
        document.getElementById('result')?.classList.add('hidden');
        setArenaPhase('waiting', 'Wait for Green...', 'Hold steady until the signal turns green.', 'state-wait');
        sfx.start();

        const minMs = mode === 'extreme' ? 900 : mode === 'warmup' ? 1900 : 1500;
        const spanMs = mode === 'extreme' ? 2200 : 2500;
        arena.timer = setTimeout(() => {
            arena.startTime = performance.now();
            setArenaPhase('go', 'CLICK NOW!', 'React as fast as you can!', 'state-go');
            sfx.go();
        }, minMs + Math.random() * spanMs);
    }

    function startArenaSet() {
        clearTimeout(arena.timer);
        arena.round = 0;
        arena.times = [];
        arena.sessionXP = 0;
        document.getElementById('arenaSessionSummary')?.classList.add('hidden');
        updateArenaHud();
        startArenaRound();
    }

    function resetArenaSet() {
        clearTimeout(arena.timer);
        arena.round = 0;
        arena.times = [];
        arena.sessionXP = 0;
        document.getElementById('result')?.classList.add('hidden');
        document.getElementById('arenaSessionSummary')?.classList.add('hidden');
        updateArenaHud();
        setArenaPhase('idle', 'Ready?', 'Press Start or Space to begin your challenge.', '');
    }

    function handleArenaTap() {
        if (arena.phase === 'idle') {
            startArenaSet();
            return;
        }
        if (arena.phase === 'waiting') {
            clearTimeout(arena.timer);
            const st = readState();
            st.earlyClicks += 1;
            writeState(st);
            sfx.early();
            setArenaPhase('round_done', 'Too Early!', 'False start — wait for green before clicking.', '');
            const res = document.getElementById('result');
            const resMsg = document.getElementById('resultMessage');
            if (res && resMsg) {
                res.classList.remove('hidden');
                resMsg.textContent = 'False start recorded!';
            }
            return;
        }
        if (arena.phase === 'go') {
            const ms = Math.max(40, Math.round(performance.now() - arena.startTime));
            const mode = document.getElementById('modeSelect')?.value || 'classic';
            const multMap = {
                classic: 1.0,
                precision: 1.2,
                extreme: 1.5,
                sprint: 1.3,
                sudden_death: 1.6,
                warmup: 0.8,
                duel: 1.2
            };
            const xpEarned = Math.round(45 * (multMap[mode] || 1.0));
            const rating = ms < 170 ? 'Mythic' : ms < 220 ? 'Lightning' : ms < 280 ? 'Fast' : 'Solid';

            arena.times.push(ms);
            arena.sessionXP += xpEarned;
            updateArenaHud();
            sfx.hit();

            const st = readState();
            if (mode === 'duel') st.duelsWon = (Number(st.duelsWon) || 0) + 1;
            st.lastRecordNote = `${ms}ms in ${mode.toUpperCase()}`;
            writeState(st);
            pushHistoryEntry(`${ms}ms`, rating, mode, xpEarned);

            const res = document.getElementById('result');
            const resMsg = document.getElementById('resultMessage');
            if (res && resMsg) {
                res.classList.remove('hidden');
                resMsg.textContent = `${ms} ms — ${rating} (+${xpEarned} XP)`;
            }

            if (mode === 'sudden_death' && ms > 300) {
                setArenaPhase('round_done', 'Sudden Death Over!', `${ms} ms exceeded the 300ms limit.`, '');
                showArenaSummary();
                return;
            }

            if (arena.round >= arena.maxRounds) {
                setArenaPhase('round_done', 'Set Complete!', `Average: ${document.getElementById('gameAverage')?.textContent || '---'}`, '');
                showArenaSummary();
            } else {
                setArenaPhase('round_done', `${ms} ms`, `${rating} (+${xpEarned} XP). Press Next Round or Space.`, '');
            }
        }
    }

    /* -------------------------------------------------
       AIM TRAINER & CLICK TESTER
    ------------------------------------------------- */
    const aimState = {
        active: false,
        score: 0,
        hits: 0,
        misses: 0,
        timeLeft: 15,
        tick: null,
        expire: null
    };

    function placeAimTarget() {
        const stage = document.getElementById('aimStage');
        const target = document.getElementById('aimTarget');
        if (!stage || !target || !aimState.active) return;

        const diff = document.getElementById('aimDiffSelect')?.value || 'normal';
        const size = diff === 'easy' ? 58 : diff === 'hard' ? 36 : 46;
        const life = diff === 'easy' ? 1400 : diff === 'hard' ? 820 : 1100;
        const maxX = Math.max(10, stage.clientWidth - size - 12);
        const maxY = Math.max(10, stage.clientHeight - size - 12);

        target.style.width = `${size}px`;
        target.style.height = `${size}px`;
        target.style.left = `${Math.round(6 + Math.random() * maxX)}px`;
        target.style.top = `${Math.round(6 + Math.random() * maxY)}px`;
        target.classList.remove('hidden');

        clearTimeout(aimState.expire);
        aimState.expire = setTimeout(() => {
            if (!aimState.active) return;
            aimState.misses += 1;
            updateAimHud();
            placeAimTarget();
        }, life);
    }

    function updateAimHud() {
        const st = readState();
        const scoreEl = document.getElementById('aimScore');
        const hmEl = document.getElementById('aimHitsMisses');
        const tlEl = document.getElementById('aimTimeLeft');
        const bestEl = document.getElementById('aimBestScore');
        if (scoreEl) scoreEl.textContent = aimState.score;
        if (hmEl) hmEl.textContent = `${aimState.hits} / ${aimState.misses}`;
        if (tlEl) tlEl.textContent = `${Math.max(0, aimState.timeLeft).toFixed(1)}s`;
        if (bestEl) bestEl.textContent = Math.max(Number(st.bestAimScore) || 0, aimState.score);
    }

    function finishAimRun() {
        aimState.active = false;
        clearInterval(aimState.tick);
        clearTimeout(aimState.expire);
        document.getElementById('aimTarget')?.classList.add('hidden');
        document.getElementById('aimPrompt')?.classList.remove('hidden');

        const st = readState();
        st.aimRunsCompleted = (Number(st.aimRunsCompleted) || 0) + 1;
        if (aimState.score > (Number(st.bestAimScore) || 0)) {
            st.bestAimScore = aimState.score;
            st.lastRecordNote = `Aim Trainer: ${aimState.score} hits`;
        }
        const xpEarned = Math.max(25, aimState.score * 10);
        writeState(st);
        pushHistoryEntry(`${aimState.score} hits`, aimState.score >= 20 ? 'Apex Aim' : 'Aim Run', 'AIM', xpEarned);

        const res = document.getElementById('aimResult');
        const msg = document.getElementById('aimResultMessage');
        if (res && msg) {
            res.classList.remove('hidden');
            msg.textContent = `Aim Run Complete — ${aimState.hits} hits, ${aimState.misses} misses (+${xpEarned} XP)`;
        }
    }

    function startAimRun() {
        clearInterval(aimState.tick);
        clearTimeout(aimState.expire);
        aimState.active = true;
        aimState.score = 0;
        aimState.hits = 0;
        aimState.misses = 0;
        aimState.timeLeft = 15;
        document.getElementById('aimResult')?.classList.add('hidden');
        document.getElementById('aimPrompt')?.classList.add('hidden');
        updateAimHud();
        placeAimTarget();
        sfx.start();

        aimState.tick = setInterval(() => {
            aimState.timeLeft -= 0.1;
            updateAimHud();
            if (aimState.timeLeft <= 0) {
                aimState.timeLeft = 0;
                updateAimHud();
                finishAimRun();
            }
        }, 100);
    }

    function resetAimRun() {
        aimState.active = false;
        clearInterval(aimState.tick);
        clearTimeout(aimState.expire);
        aimState.score = 0;
        aimState.hits = 0;
        aimState.misses = 0;
        aimState.timeLeft = 15;
        document.getElementById('aimTarget')?.classList.add('hidden');
        document.getElementById('aimPrompt')?.classList.remove('hidden');
        document.getElementById('aimResult')?.classList.add('hidden');
        updateAimHud();
    }

    const cpsState = {
        active: false,
        clicks: 0,
        duration: 10,
        timeLeft: 10,
        startedAt: 0,
        tick: null
    };

    function updateCpsHud() {
        const st = readState();
        const elapsed = cpsState.active
            ? Math.max(0.1, (performance.now() - cpsState.startedAt) / 1000)
            : cpsState.duration;
        const currentCps = cpsState.clicks > 0 ? (cpsState.clicks / elapsed) : 0;

        const clicksEl = document.getElementById('cpsClicks');
        const liveEl = document.getElementById('cpsLive');
        const tlEl = document.getElementById('cpsTimeLeft');
        const bestEl = document.getElementById('cpsBest');

        if (clicksEl) clicksEl.textContent = cpsState.clicks;
        if (liveEl) liveEl.textContent = currentCps.toFixed(1);
        if (tlEl) tlEl.textContent = `${Math.max(0, cpsState.timeLeft).toFixed(1)}s`;
        if (bestEl) bestEl.textContent = Math.max(Number(st.bestCPS) || 0, Number(currentCps.toFixed(1))).toFixed(1);
    }

    function finishCpsRun() {
        cpsState.active = false;
        clearInterval(cpsState.tick);
        const finalCps = Number((cpsState.clicks / Math.max(1, cpsState.duration)).toFixed(1));
        const st = readState();
        st.cpsRunsCompleted = (Number(st.cpsRunsCompleted) || 0) + 1;
        if (finalCps > (Number(st.bestCPS) || 0)) {
            st.bestCPS = finalCps;
            st.lastRecordNote = `Click Tester: ${finalCps.toFixed(1)} CPS`;
        }
        const xpEarned = Math.max(25, Math.round(finalCps * 15));
        writeState(st);
        pushHistoryEntry(`${finalCps.toFixed(1)} CPS`, `${cpsState.clicks} clicks`, 'CPS', xpEarned);

        const padTitle = document.getElementById('cpsPadTitle');
        const padSub = document.getElementById('cpsPadSub');
        if (padTitle) padTitle.textContent = `${finalCps.toFixed(1)} CPS`;
        if (padSub) padSub.textContent = 'Click pad or Reset Pad to run another test';

        const res = document.getElementById('cpsResult');
        const msg = document.getElementById('cpsResultMessage');
        if (res && msg) {
            res.classList.remove('hidden');
            msg.textContent = `Completed ${cpsState.clicks} clicks (${finalCps.toFixed(1)} CPS) — +${xpEarned} XP`;
        }
    }

    function handleCpsClick() {
        if (!cpsState.active) {
            cpsState.duration = Number(document.getElementById('cpsDuration')?.value || 10);
            cpsState.timeLeft = cpsState.duration;
            cpsState.clicks = 1;
            cpsState.active = true;
            cpsState.startedAt = performance.now();
            document.getElementById('cpsResult')?.classList.add('hidden');
            const padTitle = document.getElementById('cpsPadTitle');
            const padSub = document.getElementById('cpsPadSub');
            if (padTitle) padTitle.textContent = 'KEEP CLICKING!';
            if (padSub) padSub.textContent = 'Timer running...';
            sfx.click();

            cpsState.tick = setInterval(() => {
                cpsState.timeLeft = Math.max(0, cpsState.duration - (performance.now() - cpsState.startedAt) / 1000);
                updateCpsHud();
                if (cpsState.timeLeft <= 0) {
                    finishCpsRun();
                }
            }, 100);
            updateCpsHud();
            return;
        }
        cpsState.clicks += 1;
        sfx.click();
        updateCpsHud();
    }

    function resetCpsPad() {
        cpsState.active = false;
        clearInterval(cpsState.tick);
        cpsState.duration = Number(document.getElementById('cpsDuration')?.value || 10);
        cpsState.timeLeft = cpsState.duration;
        cpsState.clicks = 0;
        const padTitle = document.getElementById('cpsPadTitle');
        const padSub = document.getElementById('cpsPadSub');
        if (padTitle) padTitle.textContent = 'CLICK TO START & TEST';
        if (padSub) padSub.textContent = 'Timer starts on your first click';
        document.getElementById('cpsResult')?.classList.add('hidden');
        updateCpsHud();
    }

    /* -------------------------------------------------
       TYPING REFLEX, STROOP BLITZ, 3D DRIVE & SURGE RUSH
    ------------------------------------------------- */
    const TYPING_PROMPTS = [
        'quick reflex sharp focus',
        'lightning speed every round',
        'accuracy beats panic under pressure',
        'steady rhythm builds elite timing'
    ];

    const typingState = {
        active: false,
        timeLeft: 30,
        startedAt: 0,
        correctChars: 0,
        totalKeystrokes: 0,
        promptIndex: 0,
        tick: null
    };

    function updateTypingHud() {
        const st = readState();
        const elapsedMin = typingState.active
            ? Math.max(0.05, (performance.now() - typingState.startedAt) / 60000)
            : 0.5;
        const wpm = typingState.correctChars > 0 ? Math.round((typingState.correctChars / 5) / elapsedMin) : 0;
        const acc = typingState.totalKeystrokes > 0
            ? Math.max(0, Math.min(100, Math.round((typingState.correctChars / typingState.totalKeystrokes) * 100)))
            : 100;

        const tl = document.getElementById('typingTimeLeft');
        const lw = document.getElementById('typingLiveWpm');
        const ac = document.getElementById('typingAccuracy');
        const bw = document.getElementById('typingBestWpm');

        if (tl) tl.textContent = `${Math.max(0, typingState.timeLeft).toFixed(1)}s`;
        if (lw) lw.textContent = wpm;
        if (ac) ac.textContent = `${acc}%`;
        if (bw) bw.textContent = Math.max(Number(st.bestWPM) || 0, wpm);
    }

    function finishTypingRun() {
        typingState.active = false;
        clearInterval(typingState.tick);
        const input = document.getElementById('typingInput');
        if (input) input.disabled = true;

        const finalWpm = Number(document.getElementById('typingLiveWpm')?.textContent || 0);
        const st = readState();
        st.typingRunsCompleted = (Number(st.typingRunsCompleted) || 0) + 1;
        if (finalWpm > (Number(st.bestWPM) || 0)) st.bestWPM = finalWpm;
        const xpEarned = Math.max(25, finalWpm * 2);
        writeState(st);
        pushHistoryEntry(`${finalWpm} WPM`, 'Typing Run', 'TYPING', xpEarned);

        const res = document.getElementById('typingResult');
        const msg = document.getElementById('typingResultMessage');
        if (res && msg) {
            res.classList.remove('hidden');
            msg.textContent = `Typing Run Complete — ${finalWpm} WPM (+${xpEarned} XP)`;
        }
    }

    function startTypingRun() {
        clearInterval(typingState.tick);
        typingState.active = true;
        typingState.timeLeft = 30;
        typingState.startedAt = performance.now();
        typingState.correctChars = 0;
        typingState.totalKeystrokes = 0;
        typingState.promptIndex = 0;

        const promptEl = document.getElementById('typingPrompt');
        const inputEl = document.getElementById('typingInput');
        if (promptEl) promptEl.textContent = TYPING_PROMPTS[0];
        if (inputEl) {
            inputEl.disabled = false;
            inputEl.value = '';
            inputEl.focus();
        }
        document.getElementById('typingResult')?.classList.add('hidden');
        sfx.start();

        typingState.tick = setInterval(() => {
            typingState.timeLeft = Math.max(0, 30 - (performance.now() - typingState.startedAt) / 1000);
            updateTypingHud();
            if (typingState.timeLeft <= 0) finishTypingRun();
        }, 100);
        updateTypingHud();
    }

    function resetTypingRun() {
        typingState.active = false;
        clearInterval(typingState.tick);
        typingState.timeLeft = 30;
        typingState.correctChars = 0;
        typingState.totalKeystrokes = 0;
        const promptEl = document.getElementById('typingPrompt');
        const inputEl = document.getElementById('typingInput');
        if (promptEl) promptEl.textContent = 'Click Start Typing Run to begin.';
        if (inputEl) {
            inputEl.value = '';
            inputEl.disabled = true;
        }
        document.getElementById('typingResult')?.classList.add('hidden');
        updateTypingHud();
    }

    const STROOP_COLORS = [
        { key: 'red', label: 'RED', hex: '#ef4444' },
        { key: 'blue', label: 'BLUE', hex: '#60a5fa' },
        { key: 'green', label: 'GREEN', hex: '#4ade80' },
        { key: 'amber', label: 'AMBER', hex: '#fbbf24' }
    ];

    const stroopState = {
        active: false,
        score: 0,
        streak: 0,
        timeLeft: 25,
        targetInk: 'red',
        tick: null
    };

    function nextStroopWord() {
        const wordEl = document.getElementById('stroopWord');
        const wordObj = STROOP_COLORS[Math.floor(Math.random() * STROOP_COLORS.length)];
        const inkObj = STROOP_COLORS[Math.floor(Math.random() * STROOP_COLORS.length)];
        stroopState.targetInk = inkObj.key;
        if (wordEl) {
            wordEl.textContent = wordObj.label;
            wordEl.style.color = inkObj.hex;
        }
    }

    function updateStroopHud() {
        const st = readState();
        const sc = document.getElementById('stroopScore');
        const sr = document.getElementById('stroopStreak');
        const tl = document.getElementById('stroopTimeLeft');
        const bs = document.getElementById('stroopBestScore');
        if (sc) sc.textContent = stroopState.score;
        if (sr) sr.textContent = stroopState.streak;
        if (tl) tl.textContent = `${Math.max(0, stroopState.timeLeft).toFixed(1)}s`;
        if (bs) bs.textContent = Math.max(Number(st.bestStroopScore) || 0, stroopState.score);
    }

    function finishStroopRun() {
        stroopState.active = false;
        clearInterval(stroopState.tick);
        document.querySelectorAll('[data-stroop-color]').forEach(btn => {
            btn.disabled = true;
        });

        const st = readState();
        st.stroopRunsCompleted = (Number(st.stroopRunsCompleted) || 0) + 1;
        if (stroopState.score > (Number(st.bestStroopScore) || 0)) {
            st.bestStroopScore = stroopState.score;
        }
        const xpEarned = Math.max(25, stroopState.score * 8);
        writeState(st);
        pushHistoryEntry(`${stroopState.score} pts`, 'Stroop Blitz', 'STROOP', xpEarned);

        const res = document.getElementById('stroopResult');
        const msg = document.getElementById('stroopResultMessage');
        if (res && msg) {
            res.classList.remove('hidden');
            msg.textContent = `Stroop Blitz Complete — ${stroopState.score} pts (+${xpEarned} XP)`;
        }
    }

    function startStroopRun() {
        clearInterval(stroopState.tick);
        stroopState.active = true;
        stroopState.score = 0;
        stroopState.streak = 0;
        stroopState.timeLeft = 25;
        document.getElementById('stroopResult')?.classList.add('hidden');
        document.querySelectorAll('[data-stroop-color]').forEach(btn => {
            btn.disabled = false;
        });
        nextStroopWord();
        updateStroopHud();
        sfx.start();

        stroopState.tick = setInterval(() => {
            stroopState.timeLeft = Math.max(0, stroopState.timeLeft - 0.1);
            updateStroopHud();
            if (stroopState.timeLeft <= 0) finishStroopRun();
        }, 100);
    }

    function resetStroopRun() {
        stroopState.active = false;
        clearInterval(stroopState.tick);
        stroopState.score = 0;
        stroopState.streak = 0;
        stroopState.timeLeft = 25;
        const wordEl = document.getElementById('stroopWord');
        if (wordEl) {
            wordEl.textContent = 'READY';
            wordEl.style.color = '#f4f7ff';
        }
        document.querySelectorAll('[data-stroop-color]').forEach(btn => {
            btn.disabled = true;
        });
        document.getElementById('stroopResult')?.classList.add('hidden');
        updateStroopHud();
    }

    const DRIVE_QUESTIONS = [
        { q: 'Fastest human visual reaction time is roughly?', choices: ['~200 ms', '10 ms', '2,000 ms', '5,000 ms'], ans: 0 },
        { q: 'Which key is default for Player 1 Duel?', choices: ['A', 'M', 'Z', 'Enter'], ans: 0 },
        { q: 'Stroop Blitz tests matching:', choices: ['Ink color', 'Word length', 'Font size', 'Syllables'], ans: 0 },
        { q: 'What lowers reaction time spread?', choices: ['Consistent focus', 'Random tapping', 'Ignoring signal', 'Closing eyes'], ans: 0 }
    ];

    const driveState = {
        running: false,
        streak: 0,
        carX: 0,
        roadOffset: 0,
        quizActive: false,
        quizLeft: 8,
        currentQ: null,
        raf: null,
        tick: null
    };

    function drawDriveScene() {
        const canvas = document.getElementById('driveCanvas');
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const w = canvas.width;
        const h = canvas.height;
        ctx.fillStyle = '#070b14';
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = '#11182a';
        ctx.beginPath();
        ctx.moveTo(w * 0.36, h * 0.32);
        ctx.lineTo(w * 0.64, h * 0.32);
        ctx.lineTo(w * 0.92, h);
        ctx.lineTo(w * 0.08, h);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = 'rgba(167, 139, 250, 0.55)';
        ctx.lineWidth = 3;
        ctx.setLineDash([16, 16]);
        ctx.lineDashOffset = -driveState.roadOffset;
        ctx.beginPath();
        ctx.moveTo(w * 0.5, h * 0.33);
        ctx.lineTo(w * 0.5, h);
        ctx.stroke();
        ctx.setLineDash([]);

        const carPx = w * 0.5 + driveState.carX * (w * 0.24);
        ctx.fillStyle = '#8b5cf6';
        ctx.fillRect(carPx - 28, h - 86, 56, 44);
        ctx.fillStyle = '#60a5fa';
        ctx.fillRect(carPx - 20, h - 80, 40, 14);
    }

    function openDriveQuiz() {
        if (!driveState.running || driveState.quizActive) return;
        driveState.quizActive = true;
        driveState.quizLeft = 8;
        const qObj = DRIVE_QUESTIONS[Math.floor(Math.random() * DRIVE_QUESTIONS.length)];
        driveState.currentQ = qObj;

        const overlay = document.getElementById('driveQuizOverlay');
        const qEl = document.getElementById('driveQuestion');
        const chEl = document.getElementById('driveChoices');
        if (overlay) overlay.classList.remove('hidden');
        if (qEl) qEl.textContent = qObj.q;
        if (chEl) {
            chEl.innerHTML = qObj.choices.map((c, idx) => `
                <button type="button" class="drive-choice-btn" data-drive-ans="${idx}">
                    <span>${c}</span><kbd>${idx + 1}</kbd>
                </button>
            `).join('');
        }
    }

    function resolveDriveAnswer(idx) {
        if (!driveState.quizActive) return;
        driveState.quizActive = false;
        document.getElementById('driveQuizOverlay')?.classList.add('hidden');

        const st = readState();
        if (Number(idx) === driveState.currentQ?.ans) {
            driveState.streak += 1;
            if (driveState.streak > (Number(st.bestDriveStreak) || 0)) {
                st.bestDriveStreak = driveState.streak;
                st.lastRecordNote = `3D Drive Streak: ${driveState.streak}`;
            }
            st.totalXP += 35;
            writeState(st);
            sfx.hit();
            showToast(`Correct! Streak: ${driveState.streak} (+35 XP)`);
        } else {
            driveState.streak = 0;
            writeState(st);
            sfx.early();
            showToast('Missed answer — streak reset');
        }
        const streakEl = document.getElementById('driveStreak');
        if (streakEl) streakEl.textContent = driveState.streak;
    }

    function startDriveMode() {
        driveState.running = true;
        driveState.streak = 0;
        const st = readState();
        st.driveRunsCompleted = (Number(st.driveRunsCompleted) || 0) + 1;
        writeState(st);

        document.getElementById('driveStreak').textContent = '0';
        document.getElementById('driveSpeedStat').textContent = '140 KM/H';
        document.getElementById('driveResult')?.classList.add('hidden');
        sfx.start();

        clearInterval(driveState.tick);
        driveState.tick = setInterval(() => {
            if (!driveState.running) return;
            if (driveState.quizActive) {
                driveState.quizLeft = Math.max(0, driveState.quizLeft - 0.1);
                const ro = document.getElementById('driveTimerReadout');
                const bar = document.getElementById('driveTimerFill');
                if (ro) ro.textContent = `${driveState.quizLeft.toFixed(1)}s`;
                if (bar) bar.style.width = `${Math.round((driveState.quizLeft / 8) * 100)}%`;
                if (driveState.quizLeft <= 0) resolveDriveAnswer(-1);
            } else if (Math.random() < 0.18) {
                openDriveQuiz();
            }
        }, 450);

        cancelAnimationFrame(driveState.raf);
        const loop = () => {
            if (!driveState.running) return;
            driveState.roadOffset = (driveState.roadOffset + 6) % 32;
            drawDriveScene();
            driveState.raf = requestAnimationFrame(loop);
        };
        loop();
    }

    function resetDriveMode() {
        driveState.running = false;
        driveState.quizActive = false;
        driveState.streak = 0;
        clearInterval(driveState.tick);
        cancelAnimationFrame(driveState.raf);
        document.getElementById('driveQuizOverlay')?.classList.add('hidden');
        document.getElementById('driveStreak').textContent = '0';
        document.getElementById('driveSpeedStat').textContent = '0 KM/H';
        drawDriveScene();
    }

    const surgeState = {
        running: false,
        paused: false,
        score: 0,
        wave: 1,
        combo: 1.0,
        shields: 2,
        overdrive: 0,
        px: 480,
        py: 270,
        targets: [],
        raf: null,
        spawnTimer: null
    };

    function updateSurgeHud() {
        const st = readState();
        const sc = document.getElementById('surgeScore');
        const bs = document.getElementById('surgeBest');
        const wv = document.getElementById('surgeWave');
        const cb = document.getElementById('surgeCombo');
        const sh = document.getElementById('surgeShields');
        const ov = document.getElementById('surgeOverdrive');
        const status = document.getElementById('surgeStatus');

        if (sc) sc.textContent = surgeState.score;
        if (bs) bs.textContent = Math.max(Number(st.bestSurgeScore) || 0, surgeState.score);
        if (wv) wv.textContent = `${surgeState.wave} · Standard`;
        if (cb) cb.textContent = `${surgeState.combo.toFixed(1)}x`;
        if (sh) sh.textContent = surgeState.shields;
        if (ov) ov.textContent = `${Math.min(100, Math.round(surgeState.overdrive))}%`;
        if (status && surgeState.running && !surgeState.paused) {
            status.textContent = `Active — Wave ${surgeState.wave}`;
        }
    }

    function drawSurgeScene() {
        const canvas = document.getElementById('surgeCanvas');
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        ctx.fillStyle = '#070b14';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#8b5cf6';
        ctx.beginPath();
        ctx.arc(surgeState.px, surgeState.py, 15, 0, Math.PI * 2);
        ctx.fill();

        surgeState.targets.forEach(t => {
            ctx.fillStyle = t.core ? '#22c55e' : '#38bdf8';
            ctx.beginPath();
            ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    function endSurgeRun() {
        surgeState.running = false;
        surgeState.paused = false;
        clearInterval(surgeState.spawnTimer);
        cancelAnimationFrame(surgeState.raf);

        const st = readState();
        st.surgeRunsCompleted = (Number(st.surgeRunsCompleted) || 0) + 1;
        if (surgeState.score > (Number(st.bestSurgeScore) || 0)) {
            st.bestSurgeScore = surgeState.score;
            st.lastRecordNote = `Surge Rush: ${surgeState.score} pts`;
        }
        const xpEarned = Math.max(25, Math.round(surgeState.score / 4));
        writeState(st);
        pushHistoryEntry(`${surgeState.score} pts`, `Wave ${surgeState.wave}`, 'SURGE', xpEarned);

        const endOverlay = document.getElementById('surgeEndOverlay');
        const endSummary = document.getElementById('surgeEndSummary');
        if (endOverlay) endOverlay.classList.remove('hidden');
        if (endSummary) endSummary.textContent = `Score: ${surgeState.score} • Wave ${surgeState.wave} (+${xpEarned} XP)`;
    }

    function startSurgeRun() {
        clearInterval(surgeState.spawnTimer);
        cancelAnimationFrame(surgeState.raf);
        surgeState.running = true;
        surgeState.paused = false;
        surgeState.score = 0;
        surgeState.wave = 1;
        surgeState.combo = 1.0;
        surgeState.shields = 2;
        surgeState.overdrive = 0;
        surgeState.targets = [];

        document.getElementById('surgeStartOverlay')?.classList.add('hidden');
        document.getElementById('surgeEndOverlay')?.classList.add('hidden');
        updateSurgeHud();
        sfx.start();

        let elapsedSec = 0;
        surgeState.spawnTimer = setInterval(() => {
            if (!surgeState.running || surgeState.paused) return;
            elapsedSec += 0.8;
            surgeState.wave = 1 + Math.floor(elapsedSec / 10);
            surgeState.targets.push({
                x: 60 + Math.random() * 840,
                y: 60 + Math.random() * 420,
                r: 18,
                core: Math.random() < 0.25
            });
            if (surgeState.targets.length > 7) {
                surgeState.shields -= 1;
                surgeState.targets.shift();
                if (surgeState.shields <= 0) {
                    surgeState.shields = 0;
                    updateSurgeHud();
                    endSurgeRun();
                }
            }
            updateSurgeHud();
        }, 800);

        const loop = () => {
            if (!surgeState.running) return;
            drawSurgeScene();
            surgeState.raf = requestAnimationFrame(loop);
        };
        loop();
    }

    function resetSurgeRun() {
        surgeState.running = false;
        surgeState.paused = false;
        clearInterval(surgeState.spawnTimer);
        cancelAnimationFrame(surgeState.raf);
        surgeState.targets = [];
        document.getElementById('surgeEndOverlay')?.classList.add('hidden');
        document.getElementById('surgeStartOverlay')?.classList.remove('hidden');
        const status = document.getElementById('surgeStatus');
        if (status) status.textContent = 'Ready — Checkpoint: Wave 1';
        updateSurgeHud();
        drawSurgeScene();
    }

    /* -------------------------------------------------
       SETTINGS & MASTER RENDER
    ------------------------------------------------- */
    function syncSettingsInputs(st) {
        document.body.classList.toggle('no-anim', st.animation === 'off');
        const userInput = document.getElementById('username');
        const soundSel = document.getElementById('soundSetting');
        const animSel = document.getElementById('animationSetting');
        const p1Sel = document.getElementById('duelKeyP1');
        const p2Sel = document.getElementById('duelKeyP2');

        if (userInput && document.activeElement !== userInput) {
            userInput.value = st.username || 'Player';
        }
        if (soundSel) soundSel.value = st.sound || 'on';
        if (animSel) animSel.value = st.animation || 'on';
        if (p1Sel) p1Sel.value = st.duelKeyP1 || 'a';
        if (p2Sel) p2Sel.value = st.duelKeyP2 || 'l';
    }

    function renderAll() {
        const st = readState();
        renderRanks();
        renderDashboard();
        renderHistory();
        renderAchievements(st);
        renderShop(st);
        renderLeaderboard(st);
        syncSettingsInputs(st);
    }

    /* -------------------------------------------------
       EVENT BINDINGS
    ------------------------------------------------- */
    document.addEventListener('click', (e) => {
        const navBtn = e.target.closest('[data-page], [data-open]');
        if (navBtn) {
            const targetPage = navBtn.dataset.page || navBtn.dataset.open;
            const mode = navBtn.dataset.mode;
            if (mode) {
                const modeSel = document.getElementById('modeSelect');
                if (modeSel) {
                    modeSel.value = mode;
                    resetArenaSet();
                }
            }
            showPage(targetPage);
            return;
        }

        if (e.target.closest('#mobileMenuButton')) {
            document.getElementById('sidebar')?.classList.toggle('open');
            document.getElementById('sidebarOverlay')?.classList.toggle('show');
            return;
        }

        if (e.target.closest('#sidebarOverlay')) {
            document.getElementById('sidebar')?.classList.remove('open');
            document.getElementById('sidebarOverlay')?.classList.remove('show');
            return;
        }

        if (e.target.closest('#notificationButton')) {
            document.getElementById('notificationPopover')?.classList.toggle('hidden');
            document.getElementById('profileDropdown')?.classList.add('hidden');
            return;
        }

        if (e.target.closest('#profileButton')) {
            document.getElementById('profileDropdown')?.classList.toggle('hidden');
            document.getElementById('notificationPopover')?.classList.add('hidden');
            return;
        }

        const lbTab = e.target.closest('[data-lb-tab]');
        if (lbTab) {
            activeLeaderboardTab = lbTab.dataset.lbTab;
            document.querySelectorAll('[data-lb-tab]').forEach(t => {
                t.classList.toggle('active', t === lbTab);
            });
            renderLeaderboard(readState());
            return;
        }

        const shopBtn = e.target.closest('[data-shop-item]');
        if (shopBtn) {
            const item = SHOP_ITEMS.find(x => x.id === shopBtn.dataset.shopItem);
            if (!item) return;
            const st = readState();
            if (item.xpBonus) {
                if (st.totalXP < item.cost) {
                    showToast('Not enough XP!');
                    return;
                }
                st.totalXP = st.totalXP - item.cost + item.xpBonus;
                writeState(st);
                sfx.reward();
                showToast(`Opened XP Crate (+${item.xpBonus} XP net!)`);
                return;
            }
            if (!st.ownedItems.includes(item.id)) {
                if (st.totalXP < item.cost) {
                    showToast('Not enough XP!');
                    return;
                }
                st.totalXP -= item.cost;
                st.ownedItems.push(item.id);
            }
            st.equippedTitle = item.title;
            writeState(st);
            sfx.reward();
            showToast(`Equipped ${item.title}`);
            return;
        }

        const delBtn = e.target.closest('[data-delete-game]');
        if (delBtn) {
            const idx = Number(delBtn.dataset.deleteGame);
            const st = readState();
            if (idx >= 0 && idx < st.games.length) {
                st.games.splice(idx, 1);
                writeState(st);
                showToast('Entry removed');
            }
            return;
        }

        const stroopBtn = e.target.closest('[data-stroop-color]');
        if (stroopBtn && stroopState.active && !stroopBtn.disabled) {
            if (stroopBtn.dataset.stroopColor === stroopState.targetInk) {
                stroopState.streak += 1;
                stroopState.score += 10 + Math.min(20, stroopState.streak * 2);
                sfx.hit();
            } else {
                stroopState.streak = 0;
                stroopState.score = Math.max(0, stroopState.score - 5);
                sfx.early();
            }
            updateStroopHud();
            nextStroopWord();
            return;
        }

        const driveChoice = e.target.closest('[data-drive-ans]');
        if (driveChoice) {
            resolveDriveAnswer(driveChoice.dataset.driveAns);
            return;
        }

        if (!e.target.closest('.notif-wrap') && !e.target.closest('.profile-menu')) {
            document.getElementById('notificationPopover')?.classList.add('hidden');
            document.getElementById('profileDropdown')?.classList.add('hidden');
        }
    });

    document.getElementById('gameScreen')?.addEventListener('click', handleArenaTap);
    document.getElementById('startButton')?.addEventListener('click', startArenaSet);
    document.getElementById('nextButton')?.addEventListener('click', startArenaRound);
    document.getElementById('resetButton')?.addEventListener('click', resetArenaSet);
    document.getElementById('modeSelect')?.addEventListener('change', resetArenaSet);
    document.getElementById('summaryReplayBtn')?.addEventListener('click', startArenaSet);
    document.getElementById('summaryExtremeBtn')?.addEventListener('click', () => {
        const sel = document.getElementById('modeSelect');
        if (sel) sel.value = 'extreme';
        startArenaSet();
    });

    document.getElementById('aimStartBtn')?.addEventListener('click', startAimRun);
    document.getElementById('aimResetBtn')?.addEventListener('click', resetAimRun);
    document.getElementById('aimTarget')?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!aimState.active) return;
        aimState.hits += 1;
        aimState.score += 1;
        sfx.hit();
        updateAimHud();
        placeAimTarget();
    });
    document.getElementById('aimStage')?.addEventListener('click', () => {
        if (!aimState.active) return;
        aimState.misses += 1;
        updateAimHud();
    });

    document.getElementById('cpsPad')?.addEventListener('click', handleCpsClick);
    document.getElementById('cpsResetBtn')?.addEventListener('click', resetCpsPad);
    document.getElementById('cpsDuration')?.addEventListener('change', resetCpsPad);

    document.getElementById('typingStartBtn')?.addEventListener('click', startTypingRun);
    document.getElementById('typingResetBtn')?.addEventListener('click', resetTypingRun);
    document.getElementById('typingInput')?.addEventListener('input', (e) => {
        if (!typingState.active) return;
        const promptText = TYPING_PROMPTS[typingState.promptIndex % TYPING_PROMPTS.length];
        const typed = e.target.value;
        typingState.totalKeystrokes += 1;
        let matches = 0;
        for (let i = 0; i < typed.length; i++) {
            if (typed[i] === promptText[i]) matches++;
        }
        typingState.correctChars = matches;
        if (typed === promptText) {
            typingState.promptIndex += 1;
            e.target.value = '';
            const pEl = document.getElementById('typingPrompt');
            if (pEl) pEl.textContent = TYPING_PROMPTS[typingState.promptIndex % TYPING_PROMPTS.length];
            sfx.hit();
        }
        updateTypingHud();
    });

    document.getElementById('stroopStartBtn')?.addEventListener('click', startStroopRun);
    document.getElementById('stroopResetBtn')?.addEventListener('click', resetStroopRun);

    document.getElementById('driveStartBtn')?.addEventListener('click', startDriveMode);
    document.getElementById('driveResetBtn')?.addEventListener('click', resetDriveMode);

    document.getElementById('surgeStartBtn')?.addEventListener('click', startSurgeRun);
    document.getElementById('surgeOverlayStartBtn')?.addEventListener('click', startSurgeRun);
    document.getElementById('surgeAgainBtn')?.addEventListener('click', startSurgeRun);
    document.getElementById('surgeResetBtn')?.addEventListener('click', resetSurgeRun);
    document.getElementById('surgePauseBtn')?.addEventListener('click', () => {
        if (!surgeState.running) return;
        surgeState.paused = !surgeState.paused;
        const status = document.getElementById('surgeStatus');
        if (status) status.textContent = surgeState.paused ? 'Paused' : `Active — Wave ${surgeState.wave}`;
    });
    document.getElementById('surgeCanvas')?.addEventListener('pointermove', (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        surgeState.px = ((e.clientX - rect.left) / rect.width) * e.currentTarget.width;
        surgeState.py = ((e.clientY - rect.top) / rect.height) * e.currentTarget.height;
    });
    document.getElementById('surgeCanvas')?.addEventListener('pointerdown', (e) => {
        if (!surgeState.running || surgeState.paused) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const cx = ((e.clientX - rect.left) / rect.width) * e.currentTarget.width;
        const cy = ((e.clientY - rect.top) / rect.height) * e.currentTarget.height;
        const idx = surgeState.targets.findIndex(t => Math.hypot(t.x - cx, t.y - cy) <= t.r + 14);
        if (idx >= 0) {
            const hit = surgeState.targets[idx];
            surgeState.targets.splice(idx, 1);
            surgeState.combo = Math.min(5.0, Number((surgeState.combo + 0.2).toFixed(1)));
            surgeState.score += Math.round((hit.core ? 50 : 25) * surgeState.combo);
            surgeState.overdrive = Math.min(100, surgeState.overdrive + 15);
            sfx.hit();
            updateSurgeHud();
        }
    });

    document.getElementById('historySearch')?.addEventListener('input', renderHistory);
    document.getElementById('historyFilterMode')?.addEventListener('change', renderHistory);
    document.getElementById('clearHistory')?.addEventListener('click', () => {
        const st = readState();
        st.games = [];
        writeState(st);
        showToast('Game history cleared');
    });
    document.getElementById('exportCsvButton')?.addEventListener('click', () => {
        const st = readState();
        const header = 'ReactionOrScore,Rating,Mode,XP,Date';
        const lines = (st.games || []).map(g =>
            `"${g.time}","${g.rating || ''}","${g.mode || ''}","${g.xp || 0}","${g.date || ''}"`
        );
        const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'reaction-arena-history.csv';
        a.click();
        URL.revokeObjectURL(url);
        showToast('Exported CSV');
    });

    document.getElementById('saveName')?.addEventListener('click', () => {
        const val = (document.getElementById('username')?.value || '').trim();
        const st = readState();
        st.username = val || 'Player';
        writeState(st);
        showToast(`Saved username: ${st.username}`);
    });
    document.getElementById('soundSetting')?.addEventListener('change', (e) => {
        const st = readState();
        st.sound = e.target.value === 'off' ? 'off' : 'on';
        writeState(st);
        showToast(`Sound effects ${st.sound === 'on' ? 'enabled' : 'disabled'}`);
    });
    document.getElementById('animationSetting')?.addEventListener('change', (e) => {
        const st = readState();
        st.animation = e.target.value === 'off' ? 'off' : 'on';
        writeState(st);
        showToast(`Animations ${st.animation === 'on' ? 'enabled' : 'disabled'}`);
    });
    document.getElementById('duelKeyP1')?.addEventListener('change', (e) => {
        const st = readState();
        st.duelKeyP1 = e.target.value || 'a';
        writeState(st);
        showToast(`Player 1 duel key set to ${st.duelKeyP1.toUpperCase()}`);
    });
    document.getElementById('duelKeyP2')?.addEventListener('change', (e) => {
        const st = readState();
        st.duelKeyP2 = e.target.value || 'l';
        writeState(st);
        showToast(`Player 2 duel key set to ${st.duelKeyP2.toUpperCase()}`);
    });
    document.getElementById('exportJsonButton')?.addEventListener('click', () => {
        const blob = new Blob([JSON.stringify(readState(), null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'reaction-arena-backup.json';
        a.click();
        URL.revokeObjectURL(url);
        showToast('Exported JSON backup');
    });
    document.getElementById('importJsonInput')?.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const parsed = JSON.parse(String(reader.result || '{}'));
                const merged = { ...getDefaultState(), ...parsed };
                writeState(merged);
                showToast('Imported JSON backup');
            } catch {
                showToast('Invalid JSON file');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    });
    document.getElementById('resetAllData')?.addEventListener('click', () => {
        resetArenaSet();
        resetAimRun();
        resetCpsPad();
        resetTypingRun();
        resetStroopRun();
        resetDriveMode();
        resetSurgeRun();
        writeState(getDefaultState());
        showToast('All progress reset');
    });

    document.addEventListener('keydown', (e) => {
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

        if (document.getElementById('arena')?.classList.contains('active')) {
            if (e.code === 'Space') {
                e.preventDefault();
                if (arena.phase === 'round_done') startArenaRound();
                else handleArenaTap();
            } else if (e.key === 'r' || e.key === 'R') {
                resetArenaSet();
            }
        } else if (document.getElementById('aim')?.classList.contains('active')) {
            if (e.key === 'r' || e.key === 'R') resetAimRun();
        } else if (document.getElementById('clicker')?.classList.contains('active')) {
            if (e.key === 'r' || e.key === 'R') resetCpsPad();
        } else if (document.getElementById('stroop')?.classList.contains('active') && stroopState.active) {
            const map = { '1': 'red', '2': 'blue', '3': 'green', '4': 'amber' };
            if (map[e.key]) {
                document.querySelector(`[data-stroop-color="${map[e.key]}"]`)?.click();
            }
        } else if (document.getElementById('drive')?.classList.contains('active') && driveState.running) {
            if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
                driveState.carX = Math.max(-0.85, driveState.carX - 0.14);
            } else if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
                driveState.carX = Math.min(0.85, driveState.carX + 0.14);
            }
        } else if (document.getElementById('surge')?.classList.contains('active')) {
            if (e.key === 'p' || e.key === 'P') {
                document.getElementById('surgePauseBtn')?.click();
            } else if (e.key === 'r' || e.key === 'R') {
                startSurgeRun();
            }
        }
    });

    document.addEventListener('ra:state-updated', renderAll);
    drawDriveScene();
    drawSurgeScene();
    renderAll();
})();