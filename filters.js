/**
 * filters.js
 * Provides filtering functionality for Nigeria's administrative divisions (states, local governments, wards).
 * Works with a single ward GeoJSON dataset that contains state and LGA information.
 * 
 * Field names from ward_fields.json:
 * - Ward name: wardname
 * - LGA name: lganame
 * - State name: statename
 * 
 * The filtering hierarchy ensures proper context:
 * 1. States are extracted from ward features
 * 2. LGAs are filtered within their parent state context
 * 3. Wards are filtered within their parent LGA and state context
 */

/**
 * Extract unique states from ward GeoJSON features
 * @param {Array} wardFeatures - Array of ward GeoJSON features
 * @returns {Array} Unique states with their names
 */
function extractStates(wardFeatures) {
    if (!wardFeatures || !Array.isArray(wardFeatures)) return [];
    
    const stateMap = new Map();
    
    wardFeatures.forEach(feature => {
        const props = feature.properties;
        if (props && props.statename && props.statecode) {
            stateMap.set(props.statecode, {
                name: props.statename,
                code: props.statecode
            });
        }
    });
    
    return Array.from(stateMap.values());
}

/**
 * Filter states based on provided criteria
 * @param {Array} wardFeatures - Array of ward GeoJSON features
 * @param {Object} criteria - Filter criteria (e.g. {name: 'Lagos'})
 * @returns {Array} Filtered states
 */
function filterStates(wardFeatures, criteria = {}) {
    const states = extractStates(wardFeatures);
    
    return states.filter(state => {
        return Object.entries(criteria).every(([key, value]) => {
            if (!value) return true;
            return state[key] && state[key].toLowerCase().includes(value.toLowerCase());
        });
    });
}

/**
 * Extract unique LGAs from ward GeoJSON features, optionally filtered by state
 * @param {Array} wardFeatures - Array of ward GeoJSON features
 * @param {string} stateName - Optional state name to filter by
 * @returns {Array} Unique LGAs with their names
 */
function extractLGAs(wardFeatures, stateName = null) {
    if (!wardFeatures || !Array.isArray(wardFeatures)) return [];
    
    const lgaMap = new Map();
    
    wardFeatures.forEach(feature => {
        const props = feature.properties;
        if (props && props.lganame && props.lgacode) {
            if (!stateName || (props.statename === stateName)) {
                lgaMap.set(props.lgacode, {
                    name: props.lganame,
                    code: props.lgacode,
                    statename: props.statename
                });
            }
        }
    });
    
    return Array.from(lgaMap.values());
}

/**
 * Filter local governments based on provided criteria
 * @param {Array} wardFeatures - Array of ward GeoJSON features
 * @param {Object} criteria - Filter criteria (e.g. {name: 'Ikeja', statename: 'Lagos'})
 * @returns {Array} Filtered local governments
 */
function filterLGAs(wardFeatures, criteria = {}) {
    const lgas = extractLGAs(wardFeatures);
    
    return lgas.filter(lga => {
        return Object.entries(criteria).every(([key, value]) => {
            if (!value) return true;
            if (key === 'name') key = 'name'; // For compatibility with previous API
            return lga[key] && lga[key].toLowerCase().includes(value.toLowerCase());
        });
    });
}

/**
 * Filter wards based on provided criteria
 * @param {Array} wardFeatures - Array of ward GeoJSON features
 * @param {Object} criteria - Filter criteria (e.g. {name: 'Ward 1', lganame: 'Ikeja', statename: 'Lagos'})
 * @returns {Array} Filtered wards
 */
function filterWards(wardFeatures, criteria = {}) {
    if (!wardFeatures || !Array.isArray(wardFeatures)) return [];
    
    return wardFeatures.filter(feature => {
        const props = feature.properties;
        if (!props) return false;
        
        return Object.entries(criteria).every(([key, value]) => {
            if (!value) return true;
            
            // Map the legacy keys to new keys
            if (key === 'name') key = 'wardname';
            
            return props[key] && typeof props[key] === 'string' && props[key].toLowerCase().includes(value.toLowerCase());
        });
    });
}

/**
 * Get all local governments within a state
 * @param {Array} wardFeatures - Array of ward GeoJSON features
 * @param {string} stateName - Name of the state
 * @returns {Array} Local governments in the specified state
 */
function getLGAsByState(wardFeatures, stateName) {
    return extractLGAs(wardFeatures, stateName);
}

/**
 * Get all wards within a local government
 * @param {Array} wardFeatures - Array of ward GeoJSON features
 * @param {string} lgaName - Name of the local government
 * @param {string} stateName - Name of the state (required for disambiguation)
 * @returns {Array} Wards in the specified local government
 */
function getWardsByLGA(wardFeatures, lgaName, stateName) {
    return filterWards(wardFeatures, { 
        lganame: lgaName, 
        statename: stateName 
    });
}

export { filterStates, filterLGAs, filterWards, getLGAsByState, getWardsByLGA };