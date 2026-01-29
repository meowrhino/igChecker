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
// FUNCIONES DE INSTAGRAM API
// ============================================
async function fetchInstagramData(username) {
    const cleanUsername = username.replace('@', '').trim().toLowerCase();
    
    try {
        // Intentar obtener datos básicos del perfil
        const profileResponse = await fetch(
            `https://www.instagram.com/api/v1/users/web_profile_info/?username=${cleanUsername}`,
            {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'X-IG-App-ID': '936619743392459',
                },
            }
        );

        if (!profileResponse.ok) {
            throw new Error('No se pudo obtener el perfil');
        }

        const profileData = await profileResponse.json();
        const userId = profileData.data.user.id;

        // Intentar obtener seguidores y seguidos
        const [followersResponse, followingResponse] = await Promise.all([
            fetch(`https://www.instagram.com/api/v1/friendships/${userId}/followers/`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'X-IG-App-ID': '936619743392459',
                },
            }),
            fetch(`https://www.instagram.com/api/v1/friendships/${userId}/following/`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'X-IG-App-ID': '936619743392459',
                },
            }),
        ]);

        if (!followersResponse.ok || !followingResponse.ok) {
            throw new Error('No se pudieron obtener las listas');
        }

        const followersData = await followersResponse.json();
        const followingData = await followingResponse.json();

        const followers = followersData.users.map(u => u.username);
        const following = followingData.users.map(u => u.username);

        return {
            username: cleanUsername,
            followers,
            following,
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

    // Encontrar mutuos y solo seguidores
    followers.forEach(user => {
        if (followingSet.has(user)) {
            mutuals.push(user);
        } else {
            onlyFollowers.push(user);
        }
    });

    // Encontrar solo siguiendo
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
    
    // Actualizar username
    elements.resultUsername.textContent = data.username;
    
    // Actualizar contadores
    elements.mutualsCount.textContent = comparison.mutuals.length;
    elements.followersCount.textContent = comparison.onlyFollowers.length;
    elements.followingCount.textContent = comparison.onlyFollowing.length;
    
    // Renderizar listas
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
    
    showNotification('JSON descargado correctamente');
}

// ============================================
// FUNCIONES DE NOTIFICACIÓN
// ============================================
function showNotification(message) {
    // Simple console log por ahora
    // Podrías implementar un toast notification aquí
    console.log('Notificación:', message);
}

// ============================================
// MANEJADORES DE EVENTOS
// ============================================
async function handleCheck() {
    const username = elements.usernameInput.value.trim();
    
    if (!username) {
        alert('Por favor, ingresa un nombre de usuario');
        return;
    }
    
    // Mostrar loader
    elements.loadingUsername.textContent = `@${username.replace('@', '')}`;
    showScreen('loader');
    
    try {
        const data = await fetchInstagramData(username);
        displayResults(data);
    } catch (error) {
        showScreen('input');
        alert('No se pudieron obtener los datos. Instagram bloquea requests directos desde el navegador. Por favor, intenta de nuevo más tarde o usa otro método.');
        console.error(error);
    }
}

function handleReset() {
    elements.usernameInput.value = '';
    currentData = null;
    showScreen('input');
}

// ============================================
// EVENT LISTENERS
// ============================================
elements.checkBtn.addEventListener('click', handleCheck);
elements.usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleCheck();
    }
});
elements.exportBtn.addEventListener('click', exportJSON);
elements.resetBtn.addEventListener('click', handleReset);

// ============================================
// INICIALIZACIÓN
// ============================================
showScreen('input');
console.log('Instagram List Comparator cargado correctamente');
