// Test to reproduce the DOMParser/XMLSerializer issue with gradients

const originalSvg = `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="testGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ff0000" stop-opacity="1"/>
      <stop offset="50%" stop-color="#00ff00" stop-opacity="1"/>
      <stop offset="100%" stop-color="#0000ff" stop-opacity="1"/>
    </linearGradient>
    <radialGradient id="testRadial" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffff00" stop-opacity="1"/>
      <stop offset="100%" stop-color="#ff00ff" stop-opacity="0.5"/>
    </radialGradient>
  </defs>
  <rect width="100" height="50" fill="url(#testGradient)"/>
  <circle cx="50" cy="75" r="20" fill="url(#testRadial)" stroke="#000000"/>
</svg>`;

console.log('=== DOM Parser/Serializer Test ===');
console.log('Original SVG length:', originalSvg.length);
console.log('Original contains linearGradient:', originalSvg.includes('linearGradient'));
console.log('Original contains radialGradient:', originalSvg.includes('radialGradient'));

// Test what happens when we parse and serialize without any changes
const parser = new DOMParser();
const doc = parser.parseFromString(originalSvg, 'image/svg+xml');
const svgElement = doc.documentElement;

// Check for parsing errors
const parserError = svgElement.querySelector('parsererror');
if (parserError) {
    console.error('Parser error:', parserError.textContent);
} else {
    console.log('✓ No parser errors');
}

// Serialize back
const serializer = new XMLSerializer();
const serializedSvg = serializer.serializeToString(svgElement);

console.log('\n=== After Parse/Serialize (no changes) ===');
console.log('Serialized SVG length:', serializedSvg.length);
console.log('Serialized contains linearGradient:', serializedSvg.includes('linearGradient'));
console.log('Serialized contains radialGradient:', serializedSvg.includes('radialGradient'));

console.log('\n=== Comparison ===');
console.log('Length changed:', originalSvg.length !== serializedSvg.length);
console.log('Content identical:', originalSvg === serializedSvg);

console.log('\n=== Original SVG ===');
console.log(originalSvg);

console.log('\n=== Serialized SVG ===');
console.log(serializedSvg);

// Test the specific applySvgColorTransform scenario
function testApplySvgColorTransform(svgString, colorConfig) {
    if (!svgString || !colorConfig || !colorConfig.mappings) {
        console.log('Early return - no processing needed');
        return svgString;
    }
    
    console.log('Processing SVG with colorConfig:', colorConfig);
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const svgElement = doc.documentElement;
    
    // Check for parser errors
    const parserError = svgElement.querySelector('parsererror');
    if (parserError) {
        console.error('SVG parsing error:', parserError.textContent);
        return svgString;
    }
    
    // Process mappings (even if empty)
    Object.entries(colorConfig.mappings).forEach(([path, colorConfig]) => {
        console.log('Processing path:', path, 'colorConfig:', colorConfig);
        // Element finding and color setting would happen here
    });
    
    const serializer = new XMLSerializer();
    return serializer.serializeToString(svgElement);
}

console.log('\n=== Testing applySvgColorTransform scenarios ===');

// Scenario 1: No config (should return original)
const result1 = testApplySvgColorTransform(originalSvg, null);
console.log('No config - returned original:', result1 === originalSvg);

// Scenario 2: Config with empty mappings (this is the problematic case)
const emptyMappingsConfig = { mappings: {} };
const result2 = testApplySvgColorTransform(originalSvg, emptyMappingsConfig);
console.log('Empty mappings - length changed:', originalSvg.length !== result2.length);
console.log('Empty mappings - identical:', originalSvg === result2);

// Scenario 3: Config with null mappings
const nullMappingsConfig = { mappings: null };
const result3 = testApplySvgColorTransform(originalSvg, nullMappingsConfig);
console.log('Null mappings - returned original:', result3 === originalSvg);

if (typeof module !== 'undefined') {
    module.exports = { testApplySvgColorTransform, originalSvg };
}