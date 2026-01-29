const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS - allow requests from GitHub Pages and localhost
app.use(cors({
    origin: [
        'https://meowrhino.github.io',
        'http://localhost:3000',
        'http://localhost:5500',
        'http://127.0.0.1:5500',
    ],
    methods: ['GET'],
}));

// Rate limiting (simple in-memory)
const rateLimit = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 10; // max requests per window

function checkRateLimit(ip) {
    const now = Date.now();
    const entry = rateLimit.get(ip);
    if (!entry || now - entry.start > RATE_LIMIT_WINDOW) {
        rateLimit.set(ip, { start: now, count: 1 });
        return true;
    }
    if (entry.count >= RATE_LIMIT_MAX) return false;
    entry.count++;
    return true;
}

// Clean up rate limit map periodically
setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of rateLimit) {
        if (now - entry.start > RATE_LIMIT_WINDOW) rateLimit.delete(ip);
    }
}, 60000);

const IG_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'X-IG-App-ID': '936619743392459',
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'X-Requested-With': 'XMLHttpRequest',
};

// Health check
app.get('/', (req, res) => {
    res.json({ status: 'ok', service: 'igchecker-proxy' });
});

// Get profile info
app.get('/api/profile/:username', async (req, res) => {
    const ip = req.ip || req.connection.remoteAddress;
    if (!checkRateLimit(ip)) {
        return res.status(429).json({ error: 'Demasiadas peticiones. Espera un momento.' });
    }

    const { username } = req.params;
    const cleanUsername = username.replace('@', '').trim().toLowerCase();

    if (!cleanUsername || cleanUsername.length > 30) {
        return res.status(400).json({ error: 'Nombre de usuario inválido' });
    }

    try {
        const profileUrl = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${cleanUsername}`;
        const profileResponse = await fetch(profileUrl, { headers: IG_HEADERS });

        if (!profileResponse.ok) {
            const status = profileResponse.status;
            if (status === 404) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }
            return res.status(status).json({ error: 'Error al obtener perfil de Instagram' });
        }

        const profileData = await profileResponse.json();
        const user = profileData.data?.user;

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json({
            id: user.id,
            username: user.username,
            full_name: user.full_name,
            is_private: user.is_private,
            follower_count: user.edge_followed_by?.count,
            following_count: user.edge_follow?.count,
        });
    } catch (error) {
        console.error('Profile error:', error.message);
        res.status(500).json({ error: 'Error del servidor al obtener perfil' });
    }
});

// Get followers
app.get('/api/followers/:userId', async (req, res) => {
    const ip = req.ip || req.connection.remoteAddress;
    if (!checkRateLimit(ip)) {
        return res.status(429).json({ error: 'Demasiadas peticiones. Espera un momento.' });
    }

    const { userId } = req.params;

    try {
        const allUsers = [];
        let nextMaxId = null;
        let pages = 0;
        const MAX_PAGES = 10;

        do {
            let url = `https://www.instagram.com/api/v1/friendships/${userId}/followers/?count=50`;
            if (nextMaxId) url += `&max_id=${nextMaxId}`;

            const response = await fetch(url, { headers: IG_HEADERS });
            if (!response.ok) {
                if (allUsers.length > 0) break;
                return res.status(response.status).json({ error: 'Error al obtener seguidores' });
            }

            const data = await response.json();
            const users = (data.users || []).map(u => u.username);
            allUsers.push(...users);
            nextMaxId = data.next_max_id || null;
            pages++;
        } while (nextMaxId && pages < MAX_PAGES);

        res.json({ users: allUsers, total: allUsers.length });
    } catch (error) {
        console.error('Followers error:', error.message);
        res.status(500).json({ error: 'Error del servidor al obtener seguidores' });
    }
});

// Get following
app.get('/api/following/:userId', async (req, res) => {
    const ip = req.ip || req.connection.remoteAddress;
    if (!checkRateLimit(ip)) {
        return res.status(429).json({ error: 'Demasiadas peticiones. Espera un momento.' });
    }

    const { userId } = req.params;

    try {
        const allUsers = [];
        let nextMaxId = null;
        let pages = 0;
        const MAX_PAGES = 10;

        do {
            let url = `https://www.instagram.com/api/v1/friendships/${userId}/following/?count=50`;
            if (nextMaxId) url += `&max_id=${nextMaxId}`;

            const response = await fetch(url, { headers: IG_HEADERS });
            if (!response.ok) {
                if (allUsers.length > 0) break;
                return res.status(response.status).json({ error: 'Error al obtener seguidos' });
            }

            const data = await response.json();
            const users = (data.users || []).map(u => u.username);
            allUsers.push(...users);
            nextMaxId = data.next_max_id || null;
            pages++;
        } while (nextMaxId && pages < MAX_PAGES);

        res.json({ users: allUsers, total: allUsers.length });
    } catch (error) {
        console.error('Following error:', error.message);
        res.status(500).json({ error: 'Error del servidor al obtener seguidos' });
    }
});

app.listen(PORT, () => {
    console.log(`igchecker-proxy running on port ${PORT}`);
});
