# Graph Report - .  (2026-07-11)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 103 nodes · 97 edges · 13 communities (9 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `45aa0101`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- devDependencies
- compilerOptions
- page.tsx
- dependencies
- package.json
- include
- layout.tsx
- next-auth.d.ts
- lib
- route.ts
- next.config.mjs
- postcss.config.mjs
- tailwind.config.ts

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `scripts` - 5 edges
3. `include` - 5 edges
4. `lib` - 4 edges
5. `AVAILABLE_MODES` - 3 edges
6. `next` - 2 edges
7. `react` - 2 edges
8. `react-dom` - 2 edges
9. `next-auth` - 2 edges
10. `lucide-react` - 2 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (13 total, 4 thin omitted)

### Community 0 - "devDependencies"
Cohesion: 0.11
Nodes (19): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, postcss, tailwindcss, @types/node (+11 more)

### Community 1 - "compilerOptions"
Cohesion: 0.12
Nodes (17): ./src/*, compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, module (+9 more)

### Community 2 - "page.tsx"
Cohesion: 0.18
Nodes (6): playfair, Player, Track, Track, AVAILABLE_MODES, GameMode

### Community 3 - "dependencies"
Cohesion: 0.18
Nodes (11): lucide-react, next, next-auth, dependencies, lucide-react, next, next-auth, react (+3 more)

### Community 4 - "package.json"
Cohesion: 0.22
Nodes (8): name, private, scripts, build, dev, lint, start, version

### Community 5 - "include"
Cohesion: 0.25
Nodes (7): next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts, **/*.tsx, exclude, include

### Community 6 - "layout.tsx"
Cohesion: 0.33
Nodes (4): inter, metadata, viewport, Providers()

### Community 7 - "next-auth.d.ts"
Cohesion: 0.40
Nodes (4): JWT, next-auth, next-auth/jwt, Session

### Community 8 - "lib"
Cohesion: 0.50
Nodes (4): dom, dom.iterable, esnext, lib

## Knowledge Gaps
- **60 isolated node(s):** `nextConfig`, `name`, `version`, `private`, `dev` (+55 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.098) - this node is a cross-community bridge._
- **Why does `compilerOptions` connect `compilerOptions` to `lib`, `include`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **What connects `nextConfig`, `name`, `version` to the rest of the system?**
  _60 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._