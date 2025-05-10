

# Figma Design Token Plugin

A Figma plugin to import Design Tokens from a JSON file and convert them into Figma Variables and Styles.

## Features

- Parse JSON Tokens (`color`, `typography`, `layout`, `effects`)
- Create and group Variables in a dedicated Variable Collection
- Convert hex colors to RGBA for Figma
- Generate Text Styles for basic `fontSize` tokens
- Easy to extend for additional token types

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/omid-d3v/figma-token-plugin.git
   cd figma-token-plugin

Install dependencies:

npm install

Development

Watch mode (rebuilds on file change):

npm run watch

Build for production:

npm run build

Loading in Figma

Open Figma desktop app.

Go to Plugins → Development → Import Plugin from Manifest...

Select the manifest.json file in the project root.

Run the plugin from Plugins → Development → Token Importer.

Usage

Paste your Design Tokens JSON into the UI textarea.

Click Import.

Variables and Styles will be created under the Design Tokens/Colors collection.

JSON Format Example
```json
{
  "color": {
    "primary": {
      "50": { "$value": "#F0FDFB", "$type": "color" },
      "100": { "$value": "#CCFBF1", "$type": "color" }
    }
  }
}

