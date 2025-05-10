import JSON5 from 'json5';

// This is the entry point for the plugin code environment.
// It runs in a separate thread from the UI.
figma.showUI(__html__, { width: 500, height: 600 });

// Listen for messages from the UI
figma.ui.onmessage = msg => {
  console.log('Code: Received message from UI:', msg);

  if (msg.type === 'import-tokens') {
    try {
      const data = JSON5.parse(msg.json);
      console.log('Code: JSON parsed successfully:', data);

      console.log('Code: Message type is "import-tokens". Starting token import process...');
      try {
        console.log('Code: Attempting to parse JSON...');
        const data = JSON5.parse(msg.json) as any;
        console.log('Code: JSON parsed successfully:', data);

        // Basic check if data is an object
        if (!data || typeof data !== 'object') {
            console.error('Code: Parsed data is not a valid object.');
            figma.notify('Error: Invalid JSON structure.');
            return; // Stop processing if JSON is invalid
        }

        let tokensImported = false; // Flag to check if any tokens were processed

        // --- Step 1: Collect all variables to create (name, type, collection, value) ---
        type PendingVar = {
          name: string;
          type: VariableResolvedDataType;
          value: any;
          collection: VariableCollection;
          modeId: string;
        };
        const pendingVars: PendingVar[] = [];

        // Helper to collect variables recursively for colors
        function collectColorVars(obj: any, collection: VariableCollection, modeId: string, prefix: string = '') {
          for (const [key, val] of Object.entries(obj)) {
            if (val && typeof val === 'object' && '$value' in val) {
              const name = prefix ? `${prefix}/${key}` : key;
              pendingVars.push({ name, type: 'COLOR', value: val.$value, collection, modeId });
            } else if (val && typeof val === 'object') {
              collectColorVars(val, collection, modeId, prefix ? `${prefix}/${key}` : key);
            }
          }
        }

        // 1. Colors
        if (data.color && typeof data.color === 'object') {
          tokensImported = true;
          let colorCollection = getOrCreateCollection('Colors');
          const colorModeId = colorCollection.modes[0].modeId;
          collectColorVars(data.color, colorCollection, colorModeId);
        }

        // 2. Spacing
        if (data.layout?.spacing && typeof data.layout.spacing === 'object') {
          tokensImported = true;
          let spacingCollection = getOrCreateCollection('Spacing');
          const modeId = spacingCollection.modes[0].modeId;
          for (const [key, token] of Object.entries(data.layout.spacing)) {
            if (token && typeof token === 'object' && '$value' in token) {
              pendingVars.push({ name: `spacing/${key}`, type: 'FLOAT', value: token.$value, collection: spacingCollection, modeId });
            }
          }
        }

        // 3. Border Radius
        if (data.layout?.borderRadius && typeof data.layout.borderRadius === 'object') {
          tokensImported = true;
          let radiusCollection = getOrCreateCollection('BorderRadius');
          const modeId = radiusCollection.modes[0].modeId;
          for (const [key, token] of Object.entries(data.layout.borderRadius)) {
            if (token && typeof token === 'object' && '$value' in token) {
              pendingVars.push({ name: `borderRadius/${key}`, type: 'FLOAT', value: token.$value, collection: radiusCollection, modeId });
            }
          }
        }

        // 4. Screens
        if (data.layout?.screens && typeof data.layout.screens === 'object') {
          tokensImported = true;
          let screensCollection = getOrCreateCollection('Screens');
          const modeId = screensCollection.modes[0].modeId;
          for (const [key, token] of Object.entries(data.layout.screens)) {
            if (token && typeof token === 'object' && '$value' in token) {
              pendingVars.push({ name: `screens/${key}`, type: 'FLOAT', value: token.$value, collection: screensCollection, modeId });
            }
          }
        }

        // 5. Effects
        if (data.effects?.boxShadow && typeof data.effects.boxShadow === 'object') {
          tokensImported = true;
          let effectsCollection = getOrCreateCollection('Effects');
          const modeId = effectsCollection.modes[0].modeId;
          for (const [key, token] of Object.entries(data.effects.boxShadow)) {
            if (token && typeof token === 'object' && '$value' in token) {
              pendingVars.push({ name: `boxShadow/${key}`, type: 'STRING', value: token.$value, collection: effectsCollection, modeId });
            }
          }
        }

        // 6. Typography
        if (data.typography && typeof data.typography === 'object') {
          tokensImported = true;
          if (data.typography.fontSize && typeof data.typography.fontSize === 'object') {
            let fontSizeCollection = getOrCreateCollection('Design Tokens/FontSize');
            const modeId = fontSizeCollection.modes[0].modeId;
            for (const [key, token] of Object.entries(data.typography.fontSize)) {
              if (token && typeof token === 'object' && '$value' in token) {
                pendingVars.push({ name: `fontSize/${key}`, type: 'FLOAT', value: token.$value, collection: fontSizeCollection, modeId });
              }
            }
          }
          if (data.typography.lineHeight && typeof data.typography.lineHeight === 'object') {
            let lineHeightCollection = getOrCreateCollection('LineHeight');
            const modeId = lineHeightCollection.modes[0].modeId;
            for (const [key, token] of Object.entries(data.typography.lineHeight)) {
              if (token && typeof token === 'object' && '$value' in token) {
                pendingVars.push({ name: `lineHeight/${key}`, type: 'FLOAT', value: token.$value, collection: lineHeightCollection, modeId });
              }
            }
          }
        }

        // --- Step 2: Create all variables first and store in a map ---
        const nameToVar: Map<string, Variable> = new Map();
        for (const v of pendingVars) {
          // Fix: Figma variable names must not contain invalid characters (like spaces, dots, etc.)
          // Only allow: letters, numbers, /, -, _
          // Replace invalid chars with _
          const safeName = v.name.replace(/[^a-zA-Z0-9/_-]/g, '_');
          if (!nameToVar.has(safeName)) {
            try {
              const variable = figma.variables.createVariable(safeName, v.collection, v.type);
              nameToVar.set(safeName, variable);
            } catch (err) {
              console.error('Error creating variable:', safeName, err);
            }
          }
        }

        // --- Step 3: Set values or aliases ---
        for (const v of pendingVars) {
          // Use safeName for lookup
          const safeName = v.name.replace(/[^a-zA-Z0-9/_-]/g, '_');
          const variable = nameToVar.get(safeName)!;
          let isAlias = false;
          if (typeof v.value === 'string') {
            const aliasPath = extractAliasPath(v.value);
            if (aliasPath) {
              const safeAliasPath = aliasPath.replace(/[^a-zA-Z0-9/_-]/g, '_');
              if (nameToVar.has(safeAliasPath)) {
                variable.setValueForMode(v.modeId, { type: 'VARIABLE_ALIAS', id: nameToVar.get(safeAliasPath)!.id });
                isAlias = true;
              }
            }
          }
          if (!isAlias) {
            // مقدار مستقیم
            if (v.type === 'COLOR') {
              variable.setValueForMode(v.modeId, hexToRgb(v.value));
            } else if (v.type === 'FLOAT') {
              variable.setValueForMode(v.modeId, parseUnitValue(v.value));
            } else {
              variable.setValueForMode(v.modeId, v.value);
            }
          }
        }

        // Show success notification only if some tokens were processed
        if (tokensImported) {
            figma.notify('Tokens import process finished. Check console for details and Figma Variables panel.');
            console.log('Code: Token import process completed.');
        } else {
            figma.notify('No valid tokens found in the JSON to import.');
            console.log('Code: No valid tokens found to import.');
        }

      } catch (error: any) { // Explicitly type error
        console.error('Code: Error importing tokens:', error);
        figma.notify(`Error importing tokens: ${error.message}`);
      }
    } catch (error) {
      console.error('Code: Error importing tokens:', error);
      figma.notify(`Error importing tokens: ${error.message}`);
    }
  } else {
    console.log('Code: Received message with unknown type:', msg.type);
  }
};

// Helper function to convert Hex to RGB for Figma Variables
function hexToRgb(hex: string) {
    // Remove # if it exists
    const cleanHex = hex.startsWith('#') ? hex.slice(1) : hex;
    // Parse hex values
    const bigint = parseInt(cleanHex, 16);
    // Extract R, G, B values
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    // Figma uses RGB values between 0 and 1
    return { r: r / 255, g: g / 255, b: b / 255, a: 1 }; // Assuming full opacity (a=1)
}

// Helper: convert rem/px/number to px (for spacing, borderRadius, fontSize, etc.)
function parseUnitValue(val: string | number): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    if (val.endsWith('rem')) return parseFloat(val) * 16;
    if (val.endsWith('px')) return parseFloat(val);
    return parseFloat(val);
  }
  return 0;
}

// Helper: extract alias path from {color.neutral.800.value} or $color.neutral.800.value
function extractAliasPath(val: string): string | null {
  if (val.startsWith('$')) return val.slice(1).replace(/\.value$/, '').replace(/\./g, '/');
  const match = val.match(/^\{(.+?)\}$/);
  if (match) return match[1].replace(/\.value$/, '').replace(/\./g, '/');
  return null;
}

// Helper: find variable by path in all collections
function findVariableIdByPath(path: string): string | undefined {
  // path: "color/neutral/800" or "spacing/1"
  for (const collection of figma.variables.getLocalVariableCollections()) {
    const variable = collection.variables.find(v => v.name === path);
    if (variable) return variable.id;
  }
  return undefined;
}

// Helper: create or get a variable collection
function getOrCreateCollection(name: string) {
  let col = figma.variables.getLocalVariableCollections().find(c => c.name === name);
  if (!col) {
    col = figma.variables.createVariableCollection(name);
    if (col.modes.length === 0) col.addMode('Default');
  }
  return col;
}

// Helper: create variable and set value or alias
function createVariableWithAlias(name: string, collection: VariableCollection, type: VariableResolvedDataType, value: any, modeId: string) {
  const variable = figma.variables.createVariable(name, collection, type);
  if (typeof value === 'string') {
    const aliasPath = extractAliasPath(value);
    if (aliasPath) {
      const aliasId = findVariableIdByPath(aliasPath);
      if (aliasId) {
        variable.setValueForMode(modeId, { type: 'VARIABLE_ALIAS', id: aliasId });
        return;
      }
    }
  }
  // Fallback: set direct value
  if (type === 'COLOR') variable.setValueForMode(modeId, hexToRgb(value));
  else variable.setValueForMode(modeId, parseUnitValue(value));
}