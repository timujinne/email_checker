# npm Scripts Patterns

Best practices for organizing and composing npm scripts in frontend projects.

## Script Composition

### Sequential Execution

Run scripts one after another using `&&`:

```json
{
  "scripts": {
    "build": "npm run clean && npm run css:build && npm run js:build"
  }
}
```

Stops on first error. If `clean` fails, subsequent scripts don't run.

### Parallel Execution

#### Using npm-run-all

```bash
npm install -D npm-run-all
```

```json
{
  "scripts": {
    "dev": "npm-run-all --parallel css:watch js:watch server",
    "build": "npm-run-all clean css:build js:build"
  }
}
```

- `--parallel` (or `-p`): Run simultaneously
- `--sequential` (or `-s`): Run in order (default)

#### Using & (Unix only)

```json
{
  "scripts": {
    "dev": "npm run css:watch & npm run js:watch & npm run server"
  }
}
```

**Not recommended**: Non-cross-platform, harder to manage process cleanup.

### Pre and Post Hooks

Automatically run before/after main script:

```json
{
  "scripts": {
    "prebuild": "npm run clean",
    "build": "webpack --mode production",
    "postbuild": "npm run size-report"
  }
}
```

Running `npm run build` executes: `prebuild` → `build` → `postbuild`

**Standard hooks**:
- `pre<script>`: Before script
- `post<script>`: After script
- `preinstall`, `postinstall`: Before/after dependencies install
- `prepublishOnly`: Before npm publish (not `npm install`)

## Cross-Platform Compatibility

### Environment Variables

#### cross-env

```bash
npm install -D cross-env
```

```json
{
  "scripts": {
    "build:prod": "cross-env NODE_ENV=production webpack",
    "build:dev": "cross-env NODE_ENV=development webpack"
  }
}
```

Works on Windows, macOS, Linux.

### File Operations

Use cross-platform packages instead of shell commands:

#### rimraf (rm -rf)

```bash
npm install -D rimraf
```

```json
{
  "scripts": {
    "clean": "rimraf dist",
    "clean:all": "rimraf dist node_modules"
  }
}
```

#### mkdirp (mkdir -p)

```bash
npm install -D mkdirp
```

```json
{
  "scripts": {
    "prepare": "mkdirp dist/images dist/fonts"
  }
}
```

#### copyfiles (cp -r)

```bash
npm install -D copyfiles
```

```json
{
  "scripts": {
    "copy:assets": "copyfiles -u 1 src/assets/**/* dist/"
  }
}
```

### Path Handling

Use Node.js scripts for complex path operations:

**scripts/build.js**:
```javascript
const path = require('path');
const fs = require('fs');

const distPath = path.resolve(__dirname, '../dist');
fs.mkdirSync(distPath, { recursive: true });
```

```json
{
  "scripts": {
    "build": "node scripts/build.js"
  }
}
```

## Common Script Patterns

### Development Workflow

```json
{
  "scripts": {
    "dev": "npm-run-all --parallel css:watch js:watch server",
    "css:watch": "tailwindcss -i src/styles.css -o dist/styles.css --watch",
    "js:watch": "webpack --watch --mode development",
    "server": "webpack serve --mode development --port 8080"
  }
}
```

### Production Build

```json
{
  "scripts": {
    "build": "npm-run-all clean build:css build:js",
    "clean": "rimraf dist",
    "build:css": "tailwindcss -i src/styles.css -o dist/styles.css --minify",
    "build:js": "webpack --mode production"
  }
}
```

### Testing

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "cypress run",
    "test:e2e:open": "cypress open"
  }
}
```

### Code Quality

```json
{
  "scripts": {
    "lint": "eslint src/**/*.js",
    "lint:fix": "eslint src/**/*.js --fix",
    "format": "prettier --write 'src/**/*.{js,css,html}'",
    "typecheck": "tsc --noEmit"
  }
}
```

### Deployment

```json
{
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist",
    "deploy:staging": "netlify deploy --prod=false",
    "deploy:prod": "netlify deploy --prod"
  }
}
```

## Script Organization

### Namespace with Prefixes

Group related scripts:

```json
{
  "scripts": {
    "dev": "npm-run-all --parallel dev:*",
    "dev:css": "tailwindcss --watch",
    "dev:js": "webpack serve",
    "dev:api": "node server.js",

    "build": "npm-run-all build:*",
    "build:clean": "rimraf dist",
    "build:css": "tailwindcss --minify",
    "build:js": "webpack --mode production",

    "test": "npm-run-all test:*",
    "test:unit": "jest",
    "test:e2e": "cypress run",
    "test:lint": "eslint src"
  }
}
```

Pattern matching with npm-run-all:
- `dev:*` - Runs all scripts starting with `dev:`
- `build:*` - Runs all scripts starting with `build:`

### Logical Grouping

```json
{
  "scripts": {
    // Development
    "start": "npm run dev",
    "dev": "npm-run-all --parallel css:watch webpack:serve",

    // Production
    "build": "npm-run-all clean build:css build:js",
    "build:fast": "npm-run-all --parallel build:css build:js",

    // Testing
    "test": "jest",
    "test:ci": "jest --ci --coverage",

    // Utilities
    "clean": "rimraf dist",
    "analyze": "webpack-bundle-analyzer dist/stats.json",
    "size": "size-limit"
  }
}
```

## Advanced Patterns

### Conditional Execution

Using `if-env`:

```bash
npm install -D if-env
```

```json
{
  "scripts": {
    "build": "if-env NODE_ENV=production && npm run build:prod || npm run build:dev",
    "build:prod": "webpack --mode production",
    "build:dev": "webpack --mode development"
  }
}
```

### Silent Mode

Suppress npm output:

```json
{
  "scripts": {
    "build": "npm run clean --silent && npm run webpack --silent"
  }
}
```

Or use `-s` flag:
```bash
npm run build -s
```

### Passing Arguments

```json
{
  "scripts": {
    "webpack": "webpack"
  }
}
```

```bash
npm run webpack -- --mode production --watch
```

Double dash `--` passes arguments to the script.

### Environment-Specific Scripts

```json
{
  "scripts": {
    "start": "if-env",
    "start:development": "webpack serve --mode development",
    "start:production": "node server.js",

    "build": "if-env",
    "build:development": "webpack --mode development",
    "build:production": "webpack --mode production"
  }
}
```

Set `NODE_ENV=production` to run production variants.

## Performance Tips

### Parallel Builds

```json
{
  "scripts": {
    "build:slow": "npm run css && npm run js && npm run html",
    "build:fast": "npm-run-all --parallel css js html"
  }
}
```

### Caching

```json
{
  "scripts": {
    "build": "webpack --mode production",
    "build:cache": "webpack --mode production --cache"
  }
}
```

### Incremental Builds

```json
{
  "scripts": {
    "dev": "webpack serve --hot",
    "dev:hmr": "webpack serve --hot --inline"
  }
}
```

## Debugging Scripts

### Verbose Output

```bash
npm run build --verbose
```

### Dry Run

Some tools support dry-run:

```json
{
  "scripts": {
    "deploy:dry": "netlify deploy --dry-run"
  }
}
```

### Echo Commands

```json
{
  "scripts": {
    "build": "echo 'Starting build...' && webpack && echo 'Build complete!'"
  }
}
```

## Best Practices

1. **Use descriptive names**: `build:css` not `bcss`
2. **Group related scripts**: Use prefixes (`dev:*`, `build:*`)
3. **Document complex scripts**: Add comments to README
4. **Keep scripts simple**: Extract complex logic to files
5. **Use cross-platform tools**: Avoid shell-specific commands
6. **Fail fast**: Use `&&` for critical sequences
7. **Avoid deeply nested scripts**: Maximum 2-3 levels
8. **Use npm-run-all**: Better than custom orchestration
9. **Test on all platforms**: Windows, macOS, Linux
10. **Version control**: Commit scripts, not binaries

## Common Pitfalls

### Avoid Direct Shell Commands

```json
{
  "scripts": {
    "clean": "rm -rf dist"  // BAD: Fails on Windows
  }
}
```

Use rimraf instead:

```json
{
  "scripts": {
    "clean": "rimraf dist"  // GOOD: Cross-platform
  }
}
```

### Quote Paths with Spaces

```json
{
  "scripts": {
    "build": "webpack --output-path \"dist/my folder\""
  }
}
```

### Use Double Dash for Arguments

```bash
npm run test -- --watch  // CORRECT
npm run test --watch     // INCORRECT: --watch passed to npm, not test
```
