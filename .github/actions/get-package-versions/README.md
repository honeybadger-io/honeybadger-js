# Get Monorepo Package Versions Github Action

This action reads package versions from the monorepo and stores them as an array to a variable.

## Outputs

### `packages`

An array in the structure of:

```json
[
  {
    "name": "@honeybadger-io/core",
    "version": "4.2.1"
  },
  {
    "name": "@honeybadger-io/js",
    "version": "4.3"
  }
]
```

## Example usage

uses: .github/actions/get-package-versions

## Developing

1. Modify `index.js`
2. Install `npm i -g @vercel/ncc` to compile action to a single file 
3. Run `npm run build`
4. Make sure you commit `dist/index.js` for your changes to take effect
