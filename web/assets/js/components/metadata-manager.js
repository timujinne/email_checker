/**
 * Metadata Manager Component
 * Handles management of Countries and Categories
 */
class MetadataManager {
    constructor() {
        this.metadata = {
            countries: [],
            categories: []
        };
        this.modalId = 'metadata-manager-modal';
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;

        this.renderModal();
        await this.loadMetadata();
        this.initialized = true;
    }

    /**
     * Load metadata from API
     */
    async loadMetadata() {
        try {
            const response = await window.api.get('/api/metadata');
            this.metadata = response.data;
            this.renderLists();
        } catch (error) {
            console.error('Failed to load metadata:', error);
            window.toast.error('Failed to load metadata');
        }
    }

    /**
     * Render the modal structure
     */
    renderModal() {
        if (document.getElementById(this.modalId)) return;

        const modalHtml = `
            <dialog id="${this.modalId}" class="modal">
                <div class="modal-box w-11/12 max-w-4xl">
                    <h3 class="font-bold text-lg mb-4">🏷️ Metadata Manager</h3>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <!-- Countries Section -->
                        <div class="bg-base-200 p-4 rounded-lg">
                            <h4 class="font-semibold mb-3 flex items-center gap-2">
                                🌍 Countries
                                <span class="badge badge-sm badge-neutral" id="country-count">0</span>
                            </h4>
                            
                            <div class="flex gap-2 mb-4">
                                <input type="text" id="new-country-input" 
                                       class="input input-bordered input-sm flex-1" 
                                       placeholder="Add new country...">
                                <button class="btn btn-sm btn-primary" onclick="window.metadataManager.addItem('country')">
                                    Add
                                </button>
                            </div>

                            <div id="countries-list" class="h-96 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                <!-- Countries will be rendered here -->
                                <div class="flex justify-center items-center h-full text-slate-400">
                                    <span class="loading loading-spinner"></span>
                                </div>
                            </div>
                        </div>

                        <!-- Categories Section -->
                        <div class="bg-base-200 p-4 rounded-lg">
                            <h4 class="font-semibold mb-3 flex items-center gap-2">
                                🏷️ Categories
                                <span class="badge badge-sm badge-neutral" id="category-count">0</span>
                            </h4>
                            
                            <div class="flex gap-2 mb-4">
                                <input type="text" id="new-category-input" 
                                       class="input input-bordered input-sm flex-1" 
                                       placeholder="Add new category...">
                                <button class="btn btn-sm btn-primary" onclick="window.metadataManager.addItem('category')">
                                    Add
                                </button>
                            </div>

                            <div id="categories-list" class="h-96 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                <!-- Categories will be rendered here -->
                                <div class="flex justify-center items-center h-full text-slate-400">
                                    <span class="loading loading-spinner"></span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="modal-action">
                        <form method="dialog">
                            <button class="btn">Close</button>
                        </form>
                    </div>
                </div>
                <form method="dialog" class="modal-backdrop">
                    <button>close</button>
                </form>
            </dialog>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Bind Enter key events
        document.getElementById('new-country-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') window.metadataManager.addItem('country');
        });
        document.getElementById('new-category-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') window.metadataManager.addItem('category');
        });
    }

    /**
     * Render the lists of items
     */
    renderLists() {
        this.renderList('country', this.metadata.countries);
        this.renderList('category', this.metadata.categories);

        // Update counts
        document.getElementById('country-count').textContent = this.metadata.countries.length;
        document.getElementById('category-count').textContent = this.metadata.categories.length;
    }

    /**
     * Render a single list
     */
    renderList(type, items) {
        const containerId = type === 'country' ? 'countries-list' : 'categories-list';
        const container = document.getElementById(containerId);

        if (!items || items.length === 0) {
            container.innerHTML = `
                <div class="text-center text-slate-400 py-8 text-sm">
                    No ${type === 'country' ? 'countries' : 'categories'} found
                </div>
            `;
            return;
        }

        const systemValues = ['Unknown', 'Mixed', 'Europe', 'General'];

        container.innerHTML = items.map(item => {
            const isSystem = systemValues.includes(item);
            return `
                <div class="flex items-center justify-between p-2 bg-base-100 rounded hover:bg-base-300 transition-colors group">
                    <span class="font-medium text-sm">${item}</span>
                    ${!isSystem ? `
                        <button class="btn btn-ghost btn-xs text-error opacity-0 group-hover:opacity-100 transition-opacity"
                                onclick="window.metadataManager.removeItem('${type}', '${item}')"
                                title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : `
                        <span class="text-xs text-slate-400 px-2" title="System value">🔒</span>
                    `}
                </div>
            `;
        }).join('');
    }

    /**
     * Add a new item
     */
    async addItem(type) {
        const inputId = type === 'country' ? 'new-country-input' : 'new-category-input';
        const input = document.getElementById(inputId);
        const value = input.value.trim();

        if (!value) return;

        try {
            const response = await window.api.post('/api/metadata/add', {
                type: type,
                value: value
            });

            if (response.data.success) {
                window.toast.success(`Added ${type}: ${value}`);
                input.value = '';
                // Refresh list
                await this.loadMetadata();
            } else {
                window.toast.error(response.data.message || 'Failed to add item');
            }
        } catch (error) {
            console.error(`Failed to add ${type}:`, error);
            window.toast.error(`Failed to add ${type}`);
        }
    }

    /**
     * Remove an item
     */
    async removeItem(type, value) {
        if (!confirm(`Are you sure you want to delete "${value}"?`)) return;

        try {
            const response = await window.api.post('/api/metadata/remove', {
                type: type,
                value: value
            });

            if (response.data.success) {
                window.toast.success(`Removed ${type}: ${value}`);
                // Refresh list
                await this.loadMetadata();
            } else {
                window.toast.error(response.data.message || 'Failed to remove item');
            }
        } catch (error) {
            console.error(`Failed to remove ${type}:`, error);
            window.toast.error(`Failed to remove ${type}`);
        }
    }

    /**
     * Open the manager modal
     */
    open() {
        if (!this.initialized) {
            this.init();
        }
        document.getElementById(this.modalId).showModal();
    }
}

// Initialize and export
window.metadataManager = new MetadataManager();
