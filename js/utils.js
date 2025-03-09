import turf from '@turf/turf';

/**
 * Merges multiple geometries into a single polygon safely.
 */
function mergeGeometries(features) {
    if (!features || features.length === 0) return null;

    try {
        const geometries = features.map(feature => feature.geometry);
        let merged = geometries.reduce((acc, geometry) => {
            return acc ? turf.union(acc, geometry) : geometry;
        });

        return merged || null;
    } catch (error) {
        console.error("Error merging geometries:", error);
        return null;
    }
}

/**
 * Displays a notification message with different types (success, error, warning, info).
 * @param {string} message - The notification message.
 * @param {string} type - Type of notification ('success', 'error', 'warning', 'info').
 */
function showNotification(message, type = 'info') {
    // Remove existing notification if present
    const existingNotification = document.querySelector('.map-notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'map-notification';

    // Notification style configuration
    const typeConfig = {
        success: { icon: 'check-circle', color: '#27ae60' },
        error: { icon: 'exclamation-triangle', color: '#e74c3c' },
        warning: { icon: 'exclamation-circle', color: '#f39c12' },
        info: { icon: 'info-circle', color: '#3498db' }
    };

    const { icon, color } = typeConfig[type] || typeConfig.info;

    // Apply styles
    Object.assign(notification.style, {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        backgroundColor: 'white',
        color: '#333',
        padding: '12px 20px',
        borderRadius: '8px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
        zIndex: '2000',
        display: 'flex',
        alignItems: 'center',
        borderLeft: `4px solid ${color}`,
        maxWidth: '300px'
    });

    notification.innerHTML = `
        <i class="fas fa-${icon}" style="margin-right: 10px; color: ${color};"></i>
        <span>${message}</span>
    `;

    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

export { mergeGeometries, showNotification };
