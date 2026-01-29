// ============================================
// CONFIGURACIÓN
// ============================================
const PROXY_URL = 'https://igchecker.onrender.com';

// ============================================
// ESTADO DE LA APLICACIÓN
// ============================================
let currentData = null;

// ============================================
// ELEMENTOS DEL DOM
// ============================================
const elements = {
    // Screens
    inputScreen: document.getElementById('inputScreen'),
    loaderScreen: document.getElementById('loaderScreen'),
    resultsScreen: document.getElementById('resultsScreen'),

    // Input
    usernameInput: document.getElementById('username'),
    checkBtn: document.getElementById('checkBtn'),

    // Loader
    loadingUsername: document.getElementById('loadingUsername'),
    loaderTitle: document.getElementById('loaderTitle'),
    loaderStatus: document.getElementById('loaderStatus'),

    // Results
    resultUsername: document.getElementById('resultUsername'),
    exportBtn: document.getElementById('exportBtn'),
    resetBtn: document.getElementById('resetBtn'),

    // Lists
    mutualsList: document.getElementById('mutualsList'),
    followersList: document.getElementById('followersList'),
    followingList: document.getElementById('followingList'),

    // Counts
    mutualsCount: document.getElementById('mutualsCount'),
    followersCount: document.getElementById('followersCount'),
    followingCount: document.getElementById('followingCount'),
};

// ============================================
// FUNCIONES DE NAVEGACIÓN
// ============================================
function showScreen(screenName) {
    elements.inputScreen.classList.add('hidden');
    elements.loaderScreen.classList.add('hidden');
    elements.resultsScreen.classList.add('hidden');

    if (screenName === 'input') {
        elements.inputScreen.classList.remove('hidden');
    } else if (screenName === 'loader') {
        elements.loaderScreen.classList.remove('hidden');
    } else if (screenName === 'results') {
        elements.resultsScreen.classList.remove('hidden');
    }
}

// ============================================
// LOADER STATUS
// ============================================
let statusInterval = null;

function startLoaderMessages() {
    const messages = [
        'Despertando servidor...',
        'Conectando con Instagram...',
        'Esto puede tardar unos segundos...',
        'El servidor gratuito tarda en arrancar...',
        'Casi listo...',
        'Obteniendo perfil...',
        'Un momento más...',
    ];
    let index = 0;

    elements.loaderTitle.textContent = 'CONECTANDO...';
    elements.loaderStatus.textContent = messages[0];

    statusInterval = setInterval(() => {
        index++;
        if (index < messages.length) {
            elements.loaderStatus.textContent = messages[index];
        }
    }, 4000);
}

function updateLoaderStatus(title, status) {
    elements.loaderTitle.textContent = title;
    if (status) elements.loaderStatus.textContent = status;
}

function stopLoaderMessages() {
    if (statusInterval) {
        clearInterval(statusInterval);
        statusInterval = null;
    }
}

// ============================================
// FUNCIONES DE INSTAGRAM API (VIA PROXY)
// ============================================
async function fetchInstagramData(username) {
    const cleanUsername = username.replace('@', '').trim().toLowerCase();

    try {
        // Step 1: Get profile
        updateLoaderStatus('BUSCANDO PERFIL...', 'Obteniendo información de @' + cleanUsername);
        const profileResponse = await fetch(`${PROXY_URL}/api/profile/${cleanUsername}`);

        if (!profileResponse.ok) {
            const errData = await profileResponse.json().catch(() => ({}));
            if (profileResponse.status === 404) {
                throw new Error('Usuario no encontrado. Verifica que el @ sea correcto.');
            }
            if (profileResponse.status === 429) {
                throw new Error('Demasiadas peticiones. Espera un momento e intenta de nuevo.');
            }
            throw new Error(errData.error || 'Error al obtener el perfil');
        }

        const profile = await profileResponse.json();

        if (profile.is_private) {
            throw new Error('Este perfil es privado. Solo se pueden consultar perfiles públicos.');
        }

        // Step 2: Get followers and following in parallel
        updateLoaderStatus('OBTENIENDO LISTAS...', `Seguidores: ${profile.follower_count || '?'} · Seguidos: ${profile.following_count || '?'}`);

        const [followersRes, followingRes] = await Promise.all([
            fetch(`${PROXY_URL}/api/followers/${profile.id}`),
            fetch(`${PROXY_URL}/api/following/${profile.id}`),
        ]);

        if (!followersRes.ok || !followingRes.ok) {
            throw new Error('Error al obtener las listas de seguidores/seguidos');
        }

        const followersData = await followersRes.json();
        const followingData = await followingRes.json();

        updateLoaderStatus('PROCESANDO...', 'Comparando listas...');

        return {
            username: cleanUsername,
            followers: followersData.users,
            following: followingData.users,
        };
    } catch (error) {
        console.error('Error fetching Instagram data:', error);
        throw error;
    }
}

// ============================================
// FUNCIONES DE COMPARACIÓN
// ============================================
function compareUsers(followers, following) {
    const followersSet = new Set(followers);
    const followingSet = new Set(following);

    const mutuals = [];
    const onlyFollowers = [];
    const onlyFollowing = [];

    followers.forEach(user => {
        if (followingSet.has(user)) {
            mutuals.push(user);
        } else {
            onlyFollowers.push(user);
        }
    });

    following.forEach(user => {
        if (!followersSet.has(user)) {
            onlyFollowing.push(user);
        }
    });

    return {
        mutuals: mutuals.sort(),
        onlyFollowers: onlyFollowers.sort(),
        onlyFollowing: onlyFollowing.sort(),
    };
}

// ============================================
// FUNCIONES DE RENDERIZADO
// ============================================
function renderList(container, users) {
    container.innerHTML = '';

    if (users.length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'card-list-empty';
        emptyDiv.textContent = 'Ninguno';
        container.appendChild(emptyDiv);
        return;
    }

    users.forEach(user => {
        const userDiv = document.createElement('div');
        userDiv.className = 'card-list-item';
        userDiv.textContent = `@${user}`;
        container.appendChild(userDiv);
    });
}

function displayResults(data) {
    const comparison = compareUsers(data.followers, data.following);

    currentData = {
        username: data.username,
        followers: data.followers,
        following: data.following,
        ...comparison,
    };

    elements.resultUsername.textContent = data.username;

    elements.mutualsCount.textContent = comparison.mutuals.length;
    elements.followersCount.textContent = comparison.onlyFollowers.length;
    elements.followingCount.textContent = comparison.onlyFollowing.length;

    renderList(elements.mutualsList, comparison.mutuals);
    renderList(elements.followersList, comparison.onlyFollowers);
    renderList(elements.followingList, comparison.onlyFollowing);

    showScreen('results');
}

// ============================================
// FUNCIONES DE EXPORTACIÓN
// ============================================
function exportJSON() {
    if (!currentData) return;

    const jsonString = JSON.stringify(currentData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentData.username}_instagram_data.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// ============================================
// MANEJADORES DE EVENTOS
// ============================================
async function handleCheck() {
    const username = elements.usernameInput.value.trim();

    if (!username) {
        elements.usernameInput.focus();
        return;
    }

    elements.loadingUsername.textContent = `@${username.replace('@', '')}`;
    showScreen('loader');
    startLoaderMessages();

    try {
        const data = await fetchInstagramData(username);
        stopLoaderMessages();
        displayResults(data);
    } catch (error) {
        stopLoaderMessages();
        showScreen('input');
        alert(error.message || 'Error al obtener los datos. Intenta de nuevo.');
    }
}

function handleReset() {
    elements.usernameInput.value = '';
    currentData = null;
    showScreen('input');
    elements.usernameInput.focus();
}

// ============================================
// EVENT LISTENERS
// ============================================
elements.checkBtn.addEventListener('click', handleCheck);
elements.usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleCheck();
});
elements.exportBtn.addEventListener('click', exportJSON);
elements.resetBtn.addEventListener('click', handleReset);

// ============================================
// INICIALIZACIÓN
// ============================================
showScreen('input');
elements.usernameInput.focus();
