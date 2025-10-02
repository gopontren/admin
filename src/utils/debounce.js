/**
 * =================================================================
 * Debounce Utility
 * =================================================================
 * Fungsi ini menunda eksekusi sebuah fungsi sampai setelah
 * `delay` milidetik berlalu sejak terakhir kali dipanggil.
 * Berguna untuk event seperti input pencarian.
 * =================================================================
 */
export function debounce(func, delay) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}
