/* =====================================================
   REACTION ARENA — COMPLETE SCRIPT (script.js)
===================================================== */
(function () {
    const STATE_KEY = 'reactionArenaState_v4';
    const XP_PER_LEVEL = 300;

    function getDefaultState() {
        return {
            username: 'Player',
            sound: 'on',
            animation: 'on',
            totalXP: 0,
            dailyCompleted: false,
            earlyClicks: 0,
            bestStreak: 0,
            duelsWon: 0,
            games: [],
            ownedItems: [],
            equippedTheme: null,
            skinRing: false,
            arenaGrid: false,
            signalPulse: false,
            sonicWave: false,
            rainbowBar: false,
            equippedTitle: null,
            achievements: {
                firstGame: false,
                speedDemon: false,
                lightning: false,
                mythicReflex: false,
                veteran: false,
                streakMaster: false,
                marathon: false,
                duelChampion: false
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
                totalXP: Math.max(0, Number(raw.totalXP) || 0),
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
        localStorage.setItem(STATE_KEY, JSON.stringify(nextState));
        document.dispatchEvent(new CustomEvent('ra:state-updated', { detail: nextState }));
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
            levels: ['Levels & Ranks', 'Track your level progression and 12-tier competitive rank.'],
            history: ['Game History', 'Review your completed rounds and reaction times.'],
            achievements: ['Achievements', 'Complete challenges and collect rewards.'],
            shop: ['XP Shop', 'Spend your earned XP on themes, arena skins, effects, and crates.'],
            settings: ['Settings', 'Customize profile, audio, and local backup data.']
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
        document.dispatchEvent(new CustomEvent('ra:page-changed', { detail: { page: pageName } }));
    }

    document.addEventListener('click', (e) => {
        const navBtn = e.target.closest('[data-page], [data-open]');
        if (navBtn) {
            const targetPage = navBtn.dataset.page || navBtn.dataset.open;
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

        if (e.target.closest('#profileButton')) {
            document.getElementById('profileDropdown')?.classList.toggle('hidden');
        }
    });

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
                        <strong>${r.name}</strong>
                        <small>${r.minXP} XP</small>
                    </div>
                `;
            }).join('');
        }
    }

    /* -------------------------------------------------
       ACHIEVEMENTS (8 BADGES)
    ------------------------------------------------- */
    const ACHIEVEMENTS_LIST = [
        { id: 'firstGame', icon: 'fa-bolt', title: 'First Reflex', desc: 'Complete 1 reaction round.' },
        { id: 'speedDemon', icon: 'fa-gauge-high', title: 'Speed Demon', desc: 'Get a reaction time under 220ms.' },
        { id: 'lightning', icon: 'fa-wand-magic-sparkles', title: 'Lightning Fast', desc: 'Get a reaction time under 170ms.' },
        { id: 'mythicReflex', icon: 'fa-crown', title: 'Mythic Reflex', desc: 'Get a reaction time under 130ms.' },
        { id: 'veteran', icon: 'fa-medal', title: 'Arena Veteran', desc: 'Reach Level 5.' },
        { id: 'streakMaster', icon: 'fa-fire', title: 'Streak Master', desc: 'Hit 3 fast reactions (< 250ms) in a row.' },
        { id: 'marathon', icon: 'fa-dumbbell', title: 'Marathon Runner', desc: 'Complete 20 total rounds.' },
        { id: 'duelChampion', icon: 'fa-trophy', title: 'Duel Champion', desc: 'Win a 2-Player Duel match.' }
    ];

    function renderAchievements() {
        const listEl = document.getElementById('achievementList');
        const counterEl = document.getElementById('achievementCounter');
        if (!listEl) return;

        const st = readState();
        const games = st.games;
        const level = Math.floor(st.totalXP / XP_PER_LEVEL) + 1;
        const bestTime = games.length ? Math.min(...games.map(g => Number(g.time) || 9999)) : 9999;

        let streak = 0;
        for (const g of games) {
            if (Number(g.time) < 250) streak++;
            else break;
        }
        const bestStreak = Math.max(Number(st.bestStreak) || 0, streak);
        const saved = st.achievements || {};

        const unlockedMap = {
            firstGame: Boolean(saved.firstGame) || games.length >= 1,
            speedDemon: Boolean(saved.speedDemon) || bestTime < 220,
            lightning: Boolean(saved.lightning) || bestTime < 170,
            mythicReflex: Boolean(saved.mythicReflex) || bestTime < 130,
            veteran: Boolean(saved.veteran) || level >= 5,
            streakMaster: Boolean(saved.streakMaster) || bestStreak >= 3,
            marathon: Boolean(saved.marathon) || games.length >= 20,
            duelChampion: Boolean(saved.duelChampion) || (Number(st.duelsWon) || 0) >= 1
        };

        let count = 0;
        listEl.innerHTML = ACHIEVEMENTS_LIST.map(item => {
            const unlocked = Boolean(unlockedMap[item.id]);
            if (unlocked) count++;
            return `
                <div class="achievement-card ${unlocked ? 'unlocked' : ''}">
                    <i class="fa-solid ${item.icon}"></i>
                    <h3>${item.title}</h3>
                    <p>${item.desc}</p>
                    <span class="achievement-tag">${unlocked ? 'UNLOCKED' : 'LOCKED'}</span>
                </div>
            `;
        }).join('');

        if (counterEl) {
            counterEl.textContent = `${count} / ${ACHIEVEMENTS_LIST.length} UNLOCKED`;
        }
    }

    /* -------------------------------------------------
       XP SHOP (14 ITEMS + CATEGORY FILTER)
    ------------------------------------------------- */
    const SHOP_ITEMS = [
        {
            id: 'theme_cyan',
            name: 'Cyber Cyan Theme',
            type: 'THEME',
            cost: 250,
            icon: 'fa-palette',
            desc: 'Switches main accents to electric cyan and blue.'
        },
        {
            id: 'theme_neon_cyan',
            name: 'Cyber Neon Theme',
            type: 'THEME',
            cost: 380,
            icon: 'fa-wand-sparkles',
            desc: 'High-contrast neon cyan glow across buttons and badges.'
        },
        {
            id: 'theme_gold',
            name: 'Solar Gold Theme',
            type: 'THEME',
            cost: 400,
            icon: 'fa-sun',
            desc: 'Warm golden-amber highlights across the interface.'
        },
        {
            id: 'theme_emerald',
            name: 'Emerald Pro Theme',
            type: 'THEME',
            cost: 550,
            icon: 'fa-leaf',
            desc: 'Crisp emerald green and cyan tournament accents.'
        },
        {
            id: 'theme_crimson',
            name: 'Crimson Nitro Theme',
            type: 'THEME',
            cost: 350,
            icon: 'fa-fire-flame-curved',
            desc: 'Aggressive crimson and rose accents across cards and buttons.'
        },
        {
            id: 'skin_ring',
            name: 'Neon Signal Ring',
            type: 'ARENA SKIN',
            cost: 200,
            icon: 'fa-circle-dot',
            desc: 'Adds a glowing ring border around the Arena signal icon.'
        },
        {
            id: 'arena_grid',
            name: 'Tactical Grid Arena',
            type: 'ARENA SKIN',
            cost: 220,
            icon: 'fa-border-all',
            desc: 'Adds a subtle precision grid backdrop inside the game screen.'
        },
        {
            id: 'signal_pulse',
            name: 'Heartbeat Signal',
            type: 'ARENA EFFECT',
            cost: 260,
            icon: 'fa-wave-square',
            desc: 'Gives the arena signal badge a smooth rhythmic pulse.'
        },
        {
            id: 'sonic_wave',
            name: 'Sonic Wave Signal',
            type: 'ARENA EFFECT',
            cost: 310,
            icon: 'fa-rss',
            desc: 'Emits a clean expanding wave ring around the signal icon.'
        },
        {
            id: 'rainbow_progress',
            name: 'Spectrum Progress Bar',
            type: 'UI EFFECT',
            cost: 320,
            icon: 'fa-wand-magic-sparkles',
            desc: 'Upgrades XP and rank progress bars with a multi-color gradient.'
        },
        {
            id: 'title_blitz',
            name: 'Title: "Blitz Runner"',
            type: 'PROFILE TITLE',
            cost: 180,
            icon: 'fa-tag',
            desc: 'Sets your rank/profile subtitle badge to Blitz Runner.'
        },
        {
            id: 'xp_pack_small',
            name: 'Reflex Crate (+120 XP)',
            type: 'INSTANT PACK',
            cost: 100,
            icon: 'fa-box-open',
            desc: 'Quickly tests XP spending and updates your progress bar.'
        },
        {
            id: 'xp_pack_large',
            name: 'Pro Crate (+350 XP)',
            type: 'INSTANT PACK',
            cost: 280,
            icon: 'fa-gem',
            desc: 'High-tier crate for pushing toward higher levels and ranks.'
        },
        {
            id: 'xp_pack_mega',
            name: 'Hyper Crate (+600 XP)',
            type: 'INSTANT PACK',
            cost: 450,
            icon: 'fa-bolt-lightning',
            desc: 'Big XP bundle to jump faster through levels and ranks.'
        }
    ];

    let activeShopFilter = 'ALL';

    function applyShopVisuals(st) {
        document.body.classList.remove('theme-cyan', 'theme-neon-cyan', 'theme-gold', 'theme-emerald');
        if (st.equippedTheme === 'theme_cyan') document.body.classList.add('theme-cyan');
        if (st.equippedTheme === 'theme_neon_cyan') document.body.classList.add('theme-neon-cyan');
        if (st.equippedTheme === 'theme_gold') document.body.classList.add('theme-gold');
        if (st.equippedTheme === 'theme_emerald') document.body.classList.add('theme-emerald');

        if (st.equippedTheme === 'theme_crimson') {
            document.body.style.setProperty('--purple', '#e11d48');
            document.body.style.setProperty('--purple-light', '#fb7185');
            document.body.style.setProperty('--blue', '#f43f5e');
            document.body.style.setProperty('--blue-light', '#fda4af');
        } else {
            document.body.style.removeProperty('--purple');
            document.body.style.removeProperty('--purple-light');
            document.body.style.removeProperty('--blue');
            document.body.style.removeProperty('--blue-light');
        }

        document.body.classList.toggle('skin-ring', Boolean(st.skinRing));
        document.body.classList.toggle('arena-grid-bg', Boolean(st.arenaGrid));
        document.body.classList.toggle('rainbow-bar', Boolean(st.rainbowBar));
    }

    function isShopItemEquipped(item, st) {
        if (item.type === 'THEME') return st.equippedTheme === item.id;
        if (item.id === 'skin_ring') return Boolean(st.skinRing);
        if (item.id === 'arena_grid') return Boolean(st.arenaGrid);
        if (item.id === 'signal_pulse') return Boolean(st.signalPulse);
        if (item.id === 'sonic_wave') return Boolean(st.sonicWave);
        if (item.id === 'rainbow_progress') return Boolean(st.rainbowBar);
        if (item.id === 'title_blitz') return st.equippedTitle === 'Blitz Runner';
        return false;
    }

    function handleShopAction(itemId) {
        const item = SHOP_ITEMS.find(i => i.id === itemId);
        if (!item) return;

        const st = readState();
        const owned = st.ownedItems.includes(item.id);

        if (item.type === 'THEME') {
            if (!owned) {
                if (st.totalXP < item.cost) {
                    showToast('Not enough XP!');
                    return;
                }
                st.totalXP -= item.cost;
                st.ownedItems.push(item.id);
                st.equippedTheme = item.id;
                showToast(`Unlocked & equipped ${item.name}`);
            } else {
                st.equippedTheme = st.equippedTheme === item.id ? null : item.id;
                showToast(st.equippedTheme === item.id ? `${item.name} equipped` : `${item.name} unequipped`);
            }
            writeState(st);
            return;
        }

        const boolMap = {
            skin_ring: 'skinRing',
            arena_grid: 'arenaGrid',
            signal_pulse: 'signalPulse',
            sonic_wave: 'sonicWave',
            rainbow_progress: 'rainbowBar'
        };

        if (boolMap[item.id]) {
            const prop = boolMap[item.id];
            if (!owned) {
                if (st.totalXP < item.cost) {
                    showToast('Not enough XP!');
                    return;
                }
                st.totalXP -= item.cost;
                st.ownedItems.push(item.id);
                st[prop] = true;
                showToast(`Unlocked & enabled ${item.name}`);
            } else {
                st[prop] = !st[prop];
                showToast(`${item.name} ${st[prop] ? 'enabled' : 'disabled'}`);
            }
            writeState(st);
            return;
        }

        if (item.id === 'title_blitz') {
            if (!owned) {
                if (st.totalXP < item.cost) {
                    showToast('Not enough XP!');
                    return;
                }
                st.totalXP -= item.cost;
                st.ownedItems.push(item.id);
                st.equippedTitle = 'Blitz Runner';
                showToast('Title "Blitz Runner" equipped!');
            } else {
                st.equippedTitle = st.equippedTitle === 'Blitz Runner' ? null : 'Blitz Runner';
                showToast(st.equippedTitle ? 'Title "Blitz Runner" equipped' : 'Title unequipped');
            }
            writeState(st);
            return;
        }

        const crateReward = {
            xp_pack_small: 120,
            xp_pack_large: 350,
            xp_pack_mega: 600
        }[item.id];

        if (crateReward) {
            if (st.totalXP < item.cost) {
                showToast('Not enough XP!');
                return;
            }
            st.totalXP = st.totalXP - item.cost + crateReward;
            showToast(`Opened ${item.name}! Net +${crateReward - item.cost} XP`);
            writeState(st);
        }
    }

    function renderShop() {
        const st = readState();
        applyShopVisuals(st);

        const balanceEl = document.getElementById('xpShopBalance');
        const gridEl = document.getElementById('xpShopGrid');
        if (balanceEl) balanceEl.textContent = st.totalXP;
        if (!gridEl) return;

        const filteredItems = SHOP_ITEMS.filter(item => {
            if (activeShopFilter === 'ALL') return true;
            if (activeShopFilter === 'THEME') return item.type === 'THEME';
            if (activeShopFilter === 'INSTANT PACK') return item.type === 'INSTANT PACK';
            if (activeShopFilter === 'EFFECTS') {
                return item.type !== 'THEME' && item.type !== 'INSTANT PACK';
            }
            return true;
        });

        gridEl.innerHTML = filteredItems.map(item => {
            const owned = st.ownedItems.includes(item.id);
            const equipped = isShopItemEquipped(item, st);
            const canAfford = st.totalXP >= item.cost;
            const equippable = item.type !== 'INSTANT PACK';

            let label = `Buy (${item.cost} XP)`;
            let btnClass = 'shop-btn';
            let disabled = !canAfford ? 'disabled' : '';

            if (equipped) {
                label = 'Equipped';
                btnClass = 'shop-btn equipped-btn';
                disabled = '';
            } else if (owned && equippable) {
                label = 'Equip';
                btnClass = 'shop-btn owned-btn';
                disabled = '';
            }

            return `
                <div class="shop-card ${equipped ? 'equipped' : ''}">
                    <div>
                        <div class="shop-card-top">
                            <div class="shop-icon"><i class="fa-solid ${item.icon}"></i></div>
                            <span class="shop-type">${item.type}</span>
                        </div>
                        <h3>${item.name}</h3>
                        <p>${item.desc}</p>
                    </div>

                    <div class="shop-card-footer">
                        <span class="shop-price">${item.cost} XP</span>
                        <button type="button" class="${btnClass}" data-shop-id="${item.id}" ${disabled}>
                            ${label}
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    document.addEventListener('click', (e) => {
        const filterBtn = e.target.closest('[data-shop-filter]');
        if (filterBtn) {
            activeShopFilter = filterBtn.dataset.shopFilter;
            document.querySelectorAll('[data-shop-filter]').forEach(b => {
                b.classList.toggle('active', b.dataset.shopFilter === activeShopFilter);
            });
            renderShop();
            return;
        }

        const btn = e.target.closest('[data-shop-id]');
        if (!btn) return;
        handleShopAction(btn.dataset.shopId);
        renderAll();
    });

    /* -------------------------------------------------
       LOGIN, REGISTER & ACCOUNT PROGRESS
    ------------------------------------------------- */
    const ACCOUNTS_KEY = 'ra_accounts_v1';
    const ACTIVE_EMAIL_KEY = 'ra_active_email_v1';

    const authModal = document.getElementById('authModal');
    const closeAuthBtn = document.getElementById('closeAuthModal');
    const authTabs = document.querySelectorAll('[data-auth-tab]');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const authError = document.getElementById('authError');
    const guestBtn = document.getElementById('continueGuestBtn');
    const logoutBtn = document.getElementById('logoutAccountBtn');
    const openLoginBtnText = document.getElementById('openLoginBtnText');

    function hashPassword(str) {
        let h = 2166136261;
        for (let i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return (h >>> 0).toString(16);
    }

    function getAccounts() {
        try {
            return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '{}');
        } catch {
            return {};
        }
    }

    function saveAccounts(acc) {
        localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(acc));
    }

    function syncStateToAccount() {
        const activeEmail = localStorage.getItem(ACTIVE_EMAIL_KEY);
        if (!activeEmail) return;
        const accounts = getAccounts();
        if (!accounts[activeEmail]) return;
        const curr = readState();
        accounts[activeEmail].progress = curr;
        accounts[activeEmail].username = curr.username || accounts[activeEmail].username;
        saveAccounts(accounts);
    }

    function updateAuthUI() {
        const activeEmail = localStorage.getItem(ACTIVE_EMAIL_KEY);
        const accounts = getAccounts();
        if (openLoginBtnText) {
            openLoginBtnText.textContent = (activeEmail && accounts[activeEmail])
                ? accounts[activeEmail].username
                : 'Login';
        }
        logoutBtn?.classList.toggle('hidden', !activeEmail);
    }

    function openAuthModal(tab = 'login') {
        if (!authModal) return;
        if (authError) authError.textContent = '';
        authTabs.forEach(t => t.classList.toggle('active', t.dataset.authTab === tab));
        loginForm?.classList.toggle('hidden', tab !== 'login');
        registerForm?.classList.toggle('hidden', tab !== 'register');
        updateAuthUI();
        authModal.classList.remove('hidden');
    }

    function closeAuthModal() {
        authModal?.classList.add('hidden');
    }

    authTabs.forEach(t => t.addEventListener('click', () => openAuthModal(t.dataset.authTab)));
    closeAuthBtn?.addEventListener('click', closeAuthModal);
    guestBtn?.addEventListener('click', closeAuthModal);
    authModal?.addEventListener('click', (e) => {
        if (e.target === authModal) closeAuthModal();
    });

    registerForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        if (authError) authError.textContent = '';
        const username = document.getElementById('regUsername').value.trim();
        const email = document.getElementById('regEmail').value.trim().toLowerCase();
        const password = document.getElementById('regPassword').value;

        if (username.length < 2 || password.length < 6) {
            if (authError) authError.textContent = 'Username min 2 chars, password min 6 chars.';
            return;
        }

        const accounts = getAccounts();
        if (accounts[email]) {
            if (authError) authError.textContent = 'Email is already registered.';
            return;
        }

        const taken = Object.values(accounts).some(a => a.username.toLowerCase() === username.toLowerCase());
        if (taken) {
            if (authError) authError.textContent = 'Username is already taken.';
            return;
        }

        const fresh = {
            username,
            email,
            passwordHash: hashPassword(password),
            progress: { ...getDefaultState(), username }
        };

        accounts[email] = fresh;
        saveAccounts(accounts);
        localStorage.setItem(ACTIVE_EMAIL_KEY, email);
        writeState(fresh.progress);
        registerForm.reset();
        updateAuthUI();
        closeAuthModal();
        showToast(`Welcome, ${username}!`);
        renderAll();
    });

    loginForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        if (authError) authError.textContent = '';
        const identifier = document.getElementById('loginIdentifier').value.trim().toLowerCase();
        const password = document.getElementById('loginPassword').value;
        const hash = hashPassword(password);

        const accounts = getAccounts();
        const match = Object.values(accounts).find(
            a => (a.email.toLowerCase() === identifier || a.username.toLowerCase() === identifier) &&
                 a.passwordHash === hash
        );

        if (!match) {
            if (authError) authError.textContent = 'Invalid username/email or password.';
            return;
        }

        localStorage.setItem(ACTIVE_EMAIL_KEY, match.email);
        const merged = { ...getDefaultState(), ...(match.progress || {}), username: match.username };
        writeState(merged);
        loginForm.reset();
        updateAuthUI();
        closeAuthModal();
        showToast(`Signed in as ${match.username}`);
        renderAll();
    });

    logoutBtn?.addEventListener('click', () => {
        syncStateToAccount();
        localStorage.removeItem(ACTIVE_EMAIL_KEY);
        updateAuthUI();
        closeAuthModal();
        showToast('Logged out');
        renderAll();
    });

    /* -------------------------------------------------
       REACTION ARENA ENGINE (#startButton, #resetButton)
    ------------------------------------------------- */
    const MODE_CONFIG = {
        classic:   { label: 'CLASSIC',   minMs: 1800, maxMs: 4200, xpMult: 1.0 },
        precision: { label: 'PRECISION', minMs: 2200, maxMs: 4500, xpMult: 1.2 },
        extreme:   { label: 'EXTREME',   minMs: 900,  maxMs: 3500, xpMult: 1.5 },
        warmup:    { label: 'WARMUP',    minMs: 1500, maxMs: 3000, xpMult: 0.8 },
        duel:      { label: 'DUEL',      minMs: 1500, maxMs: 3800, xpMult: 1.2 }
    };

    const MAX_ROUNDS = 5;
    let arenaPhase = 'idle';
    let roundNum = 0;
    let sessionTimes = [];
    let waitTimer = null;
    let signalStartPerf = 0;

    function clearWaitTimer() {
        if (waitTimer) {
            clearTimeout(waitTimer);
            waitTimer = null;
        }
    }

    function getRating(ms) {
        if (ms < 160) return 'Mythic';
        if (ms < 200) return 'Lightning';
        if (ms < 250) return 'Fast';
        if (ms < 320) return 'Good';
        return 'Average';
    }

    function getModeCfg() {
        const modeSelect = document.getElementById('modeSelect');
        const key = (modeSelect?.value || 'classic').toLowerCase();
        return MODE_CONFIG[key] || MODE_CONFIG.classic;
    }

    function updateArenaHUD() {
        const roundEl = document.getElementById('round');
        const gameBestEl = document.getElementById('gameBest');
        const gameAvgEl = document.getElementById('gameAverage');

        if (roundEl) roundEl.textContent = `${roundNum} / ${MAX_ROUNDS}`;
        if (gameBestEl) {
            gameBestEl.textContent = sessionTimes.length ? `${Math.min(...sessionTimes)}ms` : '---';
        }
        if (gameAvgEl) {
            const avg = sessionTimes.length
                ? Math.round(sessionTimes.reduce((a, b) => a + b, 0) / sessionTimes.length)
                : null;
            gameAvgEl.textContent = avg !== null ? `${avg}ms` : '---';
        }
    }

    function setScreenState({ title, message, iconClass, screenClass, resultText }) {
        const titleEl = document.getElementById('signalTitle');
        const msgEl = document.getElementById('signalMessage');
        const signalEl = document.getElementById('signal');
        const screenEl = document.getElementById('gameScreen');
        const resultBox = document.getElementById('result');
        const resultMsg = document.getElementById('resultMessage');

        if (titleEl) titleEl.textContent = title;
        if (msgEl) msgEl.textContent = message;
        if (signalEl && iconClass) {
            signalEl.innerHTML = `<i class="fa-solid ${iconClass}"></i>`;
        }
        if (screenEl) {
            screenEl.classList.remove('waiting', 'go', 'early', 'done');
            if (screenClass) screenEl.classList.add(screenClass);
        }
        if (resultBox && resultMsg) {
            if (resultText) {
                resultMsg.textContent = resultText;
                resultBox.classList.remove('hidden');
            } else {
                resultBox.classList.add('hidden');
            }
        }
    }

    function syncArenaButtons() {
        const startBtn = document.getElementById('startButton');
        const nextBtn = document.getElementById('nextButton');

        if (startBtn) {
            startBtn.classList.toggle('hidden', arenaPhase !== 'idle' && arenaPhase !== 'finished');
            startBtn.innerHTML = arenaPhase === 'finished'
                ? '<i class="fa-solid fa-play"></i> Play Again'
                : '<i class="fa-solid fa-play"></i> Start Game';
        }
        if (nextBtn) {
            nextBtn.classList.toggle('hidden', arenaPhase !== 'round_done');
        }
    }

    function beginWaitingRound() {
        clearWaitTimer();
        arenaPhase = 'waiting';
        const cfg = getModeCfg();
        const isDuel = cfg.label === 'DUEL';

        setScreenState({
            title: 'Wait for Green...',
            message: isDuel
                ? 'Hold steady! When it turns green: P1 press A, P2 press L.'
                : 'Do not click yet. Wait for the green signal!',
            iconClass: 'fa-hourglass-half',
            screenClass: 'waiting',
            resultText: ''
        });
        syncArenaButtons();

        const delay = cfg.minMs + Math.random() * (cfg.maxMs - cfg.minMs);
        waitTimer = setTimeout(() => {
            if (arenaPhase !== 'waiting') return;
            arenaPhase = 'go';
            signalStartPerf = performance.now();
            setScreenState({
                title: 'CLICK / REACT NOW!',
                message: isDuel ? 'GO! Press A (Player 1) or L (Player 2)!' : 'GO! Click or press Space now!',
                iconClass: 'fa-bolt',
                screenClass: 'go',
                resultText: ''
            });
            syncArenaButtons();
        }, delay);
    }

    function startArenaSession() {
        clearWaitTimer();
        roundNum = 1;
        sessionTimes = [];
        updateArenaHUD();
        beginWaitingRound();
    }

    function resetArenaSession() {
        clearWaitTimer();
        arenaPhase = 'idle';
        roundNum = 0;
        sessionTimes = [];
        updateArenaHUD();
        syncArenaButtons();
        setScreenState({
            title: 'Ready?',
            message: 'Press Start or Space to begin your challenge.',
            iconClass: 'fa-bolt',
            screenClass: '',
            resultText: ''
        });
    }

    function recordValidReaction(ms, duelWinnerLabel = '') {
        const cleanMs = Math.max(50, Math.round(ms));
        const cfg = getModeCfg();
        const rating = getRating(cleanMs);
        const baseXP = cleanMs < 180 ? 90 : cleanMs < 240 ? 70 : cleanMs < 320 ? 50 : 35;
        const earnedXP = Math.max(15, Math.round(baseXP * cfg.xpMult));

        sessionTimes.push(cleanMs);
        updateArenaHUD();

        const st = readState();
        st.totalXP = (Number(st.totalXP) || 0) + earnedXP;
        if (cleanMs < 250) st.dailyCompleted = true;
        if (duelWinnerLabel) st.duelsWon = (Number(st.duelsWon) || 0) + 1;

        st.games.unshift({
            time: cleanMs,
            rating,
            mode: cfg.label,
            xp: earnedXP,
            date: new Date().toLocaleString()
        });

        let streak = 0;
        for (const g of st.games) {
            if (Number(g.time) < 250) streak++;
            else break;
        }
        st.bestStreak = Math.max(Number(st.bestStreak) || 0, streak);

        const level = Math.floor(st.totalXP / XP_PER_LEVEL) + 1;
        const bestAll = Math.min(...st.games.map(g => Number(g.time) || cleanMs));
        st.achievements = {
            ...st.achievements,
            firstGame: true,
            speedDemon: st.achievements.speedDemon || bestAll < 220,
            lightning: st.achievements.lightning || bestAll < 170,
            mythicReflex: st.achievements.mythicReflex || bestAll < 130,
            veteran: st.achievements.veteran || level >= 5,
            streakMaster: st.achievements.streakMaster || st.bestStreak >= 3,
            marathon: st.achievements.marathon || st.games.length >= 20,
            duelChampion: st.achievements.duelChampion || st.duelsWon >= 1
        };

        writeState(st);

        const prefix = duelWinnerLabel ? `${duelWinnerLabel} — ` : '';
        if (roundNum >= MAX_ROUNDS) {
            arenaPhase = 'finished';
            const avg = Math.round(sessionTimes.reduce((a, b) => a + b, 0) / sessionTimes.length);
            setScreenState({
                title: 'Session Complete!',
                message: 'Press Start / Play Again to run another 5-round set.',
                iconClass: 'fa-trophy',
                screenClass: 'done',
                resultText: `${prefix}${cleanMs}ms (${rating}, +${earnedXP} XP) • Session Avg: ${avg}ms`
            });
        } else {
            arenaPhase = 'round_done';
            setScreenState({
                title: `${cleanMs} ms`,
                message: 'Click "Next Round" or press Space for the next round.',
                iconClass: 'fa-gauge-high',
                screenClass: 'done',
                resultText: `${prefix}${cleanMs}ms — ${rating} (+${earnedXP} XP)`
            });
        }
        syncArenaButtons();
    }

    function handleFalseStart() {
        clearWaitTimer();
        const st = readState();
        st.earlyClicks = (Number(st.earlyClicks) || 0) + 1;
        writeState(st);

        arenaPhase = 'round_done';
        setScreenState({
            title: 'Too Early!',
            message: 'False start! Wait for the green signal before reacting.',
            iconClass: 'fa-triangle-exclamation',
            screenClass: 'early',
            resultText: 'False Start — 0 XP this round'
        });
        syncArenaButtons();
    }

    function handleArenaTrigger(duelWinnerLabel = '') {
        if (arenaPhase === 'idle' || arenaPhase === 'finished') {
            startArenaSession();
            return;
        }
        if (arenaPhase === 'waiting') {
            handleFalseStart();
            return;
        }
        if (arenaPhase === 'go') {
            const elapsed = performance.now() - signalStartPerf;
            recordValidReaction(elapsed, duelWinnerLabel);
            return;
        }
        if (arenaPhase === 'round_done' && roundNum < MAX_ROUNDS) {
            roundNum += 1;
            updateArenaHUD();
            beginWaitingRound();
        }
    }

    document.getElementById('startButton')?.addEventListener('click', (e) => {
        e.stopPropagation();
        startArenaSession();
    });

    document.getElementById('nextButton')?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (arenaPhase === 'round_done' && roundNum < MAX_ROUNDS) {
            roundNum += 1;
            updateArenaHUD();
            beginWaitingRound();
        }
    });

    document.getElementById('resetButton')?.addEventListener('click', (e) => {
        e.stopPropagation();
        resetArenaSession();
        showToast('Arena reset');
    });

    document.getElementById('gameScreen')?.addEventListener('click', () => {
        handleArenaTrigger();
    });

    document.addEventListener('keydown', (e) => {
        const tag = e.target?.tagName;
        if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

        const arenaVisible = document.getElementById('arena')?.classList.contains('active');
        if (!arenaVisible) return;

        if (e.code === 'Space') {
            e.preventDefault();
            handleArenaTrigger();
        } else if (e.key && e.key.toLowerCase() === 'r') {
            e.preventDefault();
            resetArenaSession();
        } else if (getModeCfg().label === 'DUEL') {
            const k = e.key.toLowerCase();
            if (k === 'a') {
                e.preventDefault();
                handleArenaTrigger('Player 1 Wins');
            } else if (k === 'l') {
                e.preventDefault();
                handleArenaTrigger('Player 2 Wins');
            }
        }
    });

    document.addEventListener('click', (e) => {
        const modeTrigger = e.target.closest('[data-mode]');
        if (!modeTrigger) return;
        const chosenMode = (modeTrigger.dataset.mode || '').toLowerCase();
        const modeSelect = document.getElementById('modeSelect');
        if (modeSelect && MODE_CONFIG[chosenMode]) {
            modeSelect.value = chosenMode;
            resetArenaSession();
        }
    });

    updateArenaHUD();
    syncArenaButtons();

    function renderAll() {
        document.getElementById('authModal')?.classList.add('hidden');
        document.getElementById('sidebarOverlay')?.classList.remove('show');
        document.getElementById('profileDropdown')?.classList.add('hidden');
        syncStateToAccount();
        applyShopVisuals(readState());
        renderRanks();
        renderAchievements();
        renderShop();
        updateAuthUI();
    }

    document.addEventListener('ra:state-updated', renderAll);
    document.addEventListener('ra:page-changed', renderAll);

    window.ReactionShop = {
        open: () => {
            showPage('shop');
            renderShop();
        },
        render: renderShop
    };

    window.ReactionAuth = {
        open: openAuthModal,
        close: closeAuthModal,
        getActiveEmail: () => localStorage.getItem(ACTIVE_EMAIL_KEY)
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', renderAll);
    } else {
        renderAll();
    }
})();