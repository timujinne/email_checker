/**
 * Placeholder Pages Component
 * Provides fallback UI for pages under development
 */

class PlaceholderPages {
    static createPlaceholder(icon, title, description, features = []) {
        const featuresList = features.length > 0 
            ? `
                <div class="mt-6">
                    <h3 class="text-sm font-semibold text-slate-900 dark:text-white mb-3">Функционал:</h3>
                    <ul class="space-y-2">
                        ${features.map(f => `
                            <li class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                <span class="text-base">${f.icon}</span>
                                <span>${f.text}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `
            : '';

        return `
            <div class="mb-8">
                <h1 class="text-4xl font-bold text-slate-900 dark:text-white">${icon} ${title}</h1>
                <p class="text-slate-600 dark:text-slate-400 mt-2">${description}</p>
            </div>

            <div class="bg-white dark:bg-slate-900 rounded-lg shadow p-12 text-center">
                <div class="text-6xl mb-4 opacity-20">${icon}</div>
                <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-3">${title}</h2>
                <p class="text-slate-600 dark:text-slate-400 max-w-md mx-auto mb-6">
                    ${description}
                </p>
                
                <div class="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <span class="text-sm text-blue-900 dark:text-blue-300">
                        🚀 В разработке (будет доступно в ближайшем обновлении)
                    </span>
                </div>

                ${featuresList}
            </div>
        `;
    }
}

// Export to window
window.PlaceholderPages = PlaceholderPages;
