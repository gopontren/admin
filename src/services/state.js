// File ini berfungsi sebagai "sumber kebenaran" untuk data sesi admin dashboard.

const APP_STATE_KEY = 'goPontrenDashboardSession';

/**
 * Menyimpan data sesi pengguna ke localStorage.
 * @param {object} sessionData - Data yang didapat setelah login (user, token).
 */
export function saveSession(sessionData) {
    try {
        localStorage.setItem(APP_STATE_KEY, JSON.stringify(sessionData));
    } catch (e) {
        console.error("Gagal menyimpan sesi:", e);
    }
}

/**
 * Mengambil data sesi pengguna dari localStorage.
 * @returns {object | null} Data sesi yang tersimpan atau null jika tidak ada.
 */
export function getSession() {
    try {
        const session = localStorage.getItem(APP_STATE_KEY);
        return session ? JSON.parse(session) : null;
    } catch (e) {
        console.error("Gagal mengambil sesi:", e);
        return null;
    }
}

/**
 * Menghapus sesi pengguna (untuk logout).
 */
export function clearSession() {
    localStorage.removeItem(APP_STATE_KEY);
}

