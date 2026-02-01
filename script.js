// ============================================
// ESTADO
// ============================================
let currentData = null;
let followersData = null;
let followingData = null;

// ============================================
// ELEMENTOS DEL DOM
// ============================================
const elements = {
    inputScreen: document.getElementById('inputScreen'),
    loaderScreen: document.getElementById('loaderScreen'),
    resultsScreen: document.getElementById('resultsScreen'),

    followersFile: document.getElementById('followersFile'),
    followingFile: document.getElementById('followingFile'),
    followersZone: document.getElementById('followersZone'),
    followingZone: document.getElementById('followingZone'),
    followersFileName: document.getElementById('followersFileName'),
    followingFileName: document.getElementById('followingFileName'),
    checkBtn: document.getElementById('checkBtn'),

    resultUsername: null,
    exportBtn: document.getElementById('exportBtn'),
    resetBtn: document.getElementById('resetBtn'),

    mutualsList: document.getElementById('mutualsList'),
    followersList: document.getElementById('followersList'),
    followingList: document.getElementById('followingList'),
    mutualsCount: document.getElementById('mutualsCount'),
    followersCount: document.getElementById('followersCount'),
    followingCount: document.getElementById('followingCount'),

    // Name generator
    baseName: document.getElementById('baseName'),
    numOptions: document.getElementById('numOptions'),
    generateBtn: document.getElementById('generateBtn'),
    generatorResults: document.getElementById('generatorResults'),
    generatorStatus: document.getElementById('generatorStatus'),
};

// ============================================
// NAVEGACION
// ============================================
function showScreen(screenName) {
    elements.inputScreen.classList.add('hidden');
    elements.loaderScreen.classList.add('hidden');
    elements.resultsScreen.classList.add('hidden');

    if (screenName === 'input') elements.inputScreen.classList.remove('hidden');
    else if (screenName === 'loader') elements.loaderScreen.classList.remove('hidden');
    else if (screenName === 'results') elements.resultsScreen.classList.remove('hidden');
}

// ============================================
// PARSEO DE JSON DE INSTAGRAM
// ============================================
function extractUsernames(jsonData) {
    let entries = [];

    // Format 1: wrapped with top-level key
    if (jsonData.relationships_followers) {
        entries = jsonData.relationships_followers;
    } else if (jsonData.relationships_following) {
        entries = jsonData.relationships_following;
    }
    // Format 2: plain array
    else if (Array.isArray(jsonData)) {
        entries = jsonData;
    }

    return entries
        .map(entry => {
            if (entry.string_list_data && entry.string_list_data.length > 0) {
                return entry.string_list_data[0].value;
            }
            return null;
        })
        .filter(Boolean);
}

function readJSONFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                resolve(data);
            } catch {
                reject(new Error('El archivo no es un JSON valido'));
            }
        };
        reader.onerror = () => reject(new Error('Error al leer el archivo'));
        reader.readAsText(file);
    });
}

// ============================================
// FILE UPLOAD
// ============================================
function setupUploadZone(zone, fileInput, fileNameEl, onLoad) {
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            fileNameEl.textContent = file.name;
            zone.classList.add('upload-zone-loaded');
            onLoad(file);
        }
    });

    zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('upload-zone-drag');
    });

    zone.addEventListener('dragleave', () => {
        zone.classList.remove('upload-zone-drag');
    });

    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('upload-zone-drag');
        if (e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            fileInput.files = e.dataTransfer.files;
            fileNameEl.textContent = file.name;
            zone.classList.add('upload-zone-loaded');
            onLoad(file);
        }
    });
}

function updateCheckButton() {
    elements.checkBtn.disabled = !(followersData && followingData);
}

// ============================================
// COMPARACION
// ============================================
function compareUsers(followers, following) {
    const followersSet = new Set(followers);
    const followingSet = new Set(following);

    const mutuals = [];
    const onlyFollowers = [];
    const onlyFollowing = [];

    followers.forEach(user => {
        if (followingSet.has(user)) mutuals.push(user);
        else onlyFollowers.push(user);
    });

    following.forEach(user => {
        if (!followersSet.has(user)) onlyFollowing.push(user);
    });

    return {
        mutuals: mutuals.sort(),
        onlyFollowers: onlyFollowers.sort(),
        onlyFollowing: onlyFollowing.sort(),
    };
}

// ============================================
// RENDERIZADO
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
        userDiv.textContent = '@' + user;
        container.appendChild(userDiv);
    });
}

function displayResults(followers, following) {
    const comparison = compareUsers(followers, following);

    currentData = {
        followers,
        following,
        ...comparison,
    };

    elements.mutualsCount.textContent = comparison.mutuals.length;
    elements.followersCount.textContent = comparison.onlyFollowers.length;
    elements.followingCount.textContent = comparison.onlyFollowing.length;

    renderList(elements.mutualsList, comparison.mutuals);
    renderList(elements.followersList, comparison.onlyFollowers);
    renderList(elements.followingList, comparison.onlyFollowing);

    showScreen('results');
}

// ============================================
// EXPORTACION
// ============================================
function exportJSON() {
    if (!currentData) return;

    const jsonString = JSON.stringify(currentData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'instagram_comparacion.json';
    a.click();
    URL.revokeObjectURL(url);
}

// ============================================
// HANDLERS
// ============================================
async function handleCheck() {
    showScreen('loader');

    // Small delay so loader renders
    await new Promise(r => setTimeout(r, 300));

    try {
        const followers = extractUsernames(followersData);
        const following = extractUsernames(followingData);

        if (followers.length === 0 && following.length === 0) {
            throw new Error('No se encontraron usuarios en los archivos. Verifica que sean los archivos correctos de Instagram.');
        }

        displayResults(followers, following);
    } catch (error) {
        showScreen('input');
        alert(error.message);
    }
}

function handleReset() {
    followersData = null;
    followingData = null;
    currentData = null;

    elements.followersFile.value = '';
    elements.followingFile.value = '';
    elements.followersFileName.textContent = 'followers_1.json';
    elements.followingFileName.textContent = 'following.json';
    elements.followersZone.classList.remove('upload-zone-loaded');
    elements.followingZone.classList.remove('upload-zone-loaded');
    elements.checkBtn.disabled = true;

    showScreen('input');
}

// ============================================
// NAME GENERATOR (underscore only)
// ============================================
const NAME_LIMIT = 30;

function generatePoeticString(base) {
    base = base.replace(/\s+/g, '_');
    let name = base;

    while (name.length < NAME_LIMIT) {
        const spacesLeft = NAME_LIMIT - name.length;
        const howMany = Math.floor(Math.random() * spacesLeft) + 1;
        const fill = '_'.repeat(howMany);
        const pos = Math.floor(Math.random() * (name.length + 1));
        name = name.slice(0, pos) + fill + name.slice(pos);
    }

    return name.slice(0, NAME_LIMIT);
}

function generateUniqueNames(baseName, quantity) {
    const uniqueSet = new Set();
    const results = [];
    let attempts = 0;
    const maxAttempts = quantity * 100;

    while (results.length < quantity && attempts < maxAttempts) {
        const candidate = generatePoeticString(baseName);
        if (!uniqueSet.has(candidate)) {
            uniqueSet.add(candidate);
            results.push(candidate);
        }
        attempts++;
    }

    return { list: results, exhausted: results.length < quantity, attempts };
}

function handleGenerate() {
    const baseName = elements.baseName.value.trim();
    if (!baseName) {
        elements.baseName.focus();
        return;
    }

    const quantity = parseInt(elements.numOptions.value, 10) || 5;
    const { list, exhausted, attempts } = generateUniqueNames(baseName, quantity);

    elements.generatorResults.innerHTML = '';

    list.forEach(name => {
        const item = document.createElement('div');
        item.className = 'generator-item';

        const text = document.createElement('span');
        text.className = 'generator-text';
        text.textContent = name;

        const btn = document.createElement('button');
        btn.className = 'btn btn-copy';
        btn.textContent = 'COPIAR';
        btn.addEventListener('click', () => {
            navigator.clipboard.writeText(name).then(() => {
                btn.textContent = 'COPIADO';
                setTimeout(() => { btn.textContent = 'COPIAR'; }, 1500);
            });
        });

        item.appendChild(text);
        item.appendChild(btn);
        elements.generatorResults.appendChild(item);
    });

    if (exhausted) {
        elements.generatorStatus.textContent = list.length + ' de ' + quantity + ' generados (maximo alcanzado)';
    } else {
        elements.generatorStatus.textContent = list.length + ' nombres generados';
    }
}

// ============================================
// EVENT LISTENERS
// ============================================
setupUploadZone(elements.followersZone, elements.followersFile, elements.followersFileName, async (file) => {
    try {
        followersData = await readJSONFile(file);
        updateCheckButton();
    } catch (e) {
        alert(e.message);
        followersData = null;
        updateCheckButton();
    }
});

setupUploadZone(elements.followingZone, elements.followingFile, elements.followingFileName, async (file) => {
    try {
        followingData = await readJSONFile(file);
        updateCheckButton();
    } catch (e) {
        alert(e.message);
        followingData = null;
        updateCheckButton();
    }
});

elements.checkBtn.addEventListener('click', handleCheck);
elements.exportBtn.addEventListener('click', exportJSON);
elements.resetBtn.addEventListener('click', handleReset);
elements.generateBtn.addEventListener('click', handleGenerate);
elements.baseName.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleGenerate();
});

// ============================================
// INIT
// ============================================
showScreen('input');
