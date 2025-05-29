// Utility function to load HTML components
async function loadComponent(elementId, componentPath) {
    try {
        const response = await fetch(componentPath);
        if (!response.ok) {
            throw new Error(`Failed to load component: ${componentPath}`);
        }
        const html = await response.text();
        document.getElementById(elementId).innerHTML = html;
    } catch (error) {
        console.error('Error loading component:', error);
    }
}

export { loadComponent };

