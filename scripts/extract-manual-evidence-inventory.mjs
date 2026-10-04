import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { JSDOM } from "jsdom";

const root = path.resolve(import.meta.dirname, "..");
const evidencePath = path.join(root, "docs/manual/evidence-inventory.json");

const DIAGNOSTIC_SOURCES = [
    { path: "src/analysis/graph.ts", receiver: "issues", kind: "graph-issue" },
    { path: "src/analysis/fields.ts", receiver: "out", kind: "field-warning" },
    { path: "src/compiler/compile.ts", receiver: "warnings", kind: "export-warning" },
];
const TARGET_WARNING_SOURCE = "src/compiler/targetWarnings.ts";
const PANEL_TEST_SOURCE = "src/manual.coverage.test.ts";
const PERMISSION_FUNCTIONS = new Set([
    "tokenPermissions",
    "permissionsForPackNode",
    "permissionsForDialogueNode",
    "computePermissions",
    "compileProject",
]);
const DYNAMIC_TEMPLATE_LABEL = "Browse {TEMPLATES.length} templates";
const UI_REVIEW_CANDIDATES = [
    "Browse 14 templates",
    "Claim quest",
    "Exactly this answer, Contains these words or Matches a pattern",
    "Event",
    "equals",
    "Field",
    "Save the list of installed apps",
    "What to do",
    "apt-get install",
];

function slash(value) {
    return value.split(path.sep).join("/");
}

function filesUnder(directory, accept = () => true) {
    const absolute = path.join(root, directory);
    if (!existsSync(absolute)) return [];
    return readdirSync(absolute, { withFileTypes: true })
        .flatMap((entry) => {
            const relative = path.join(directory, entry.name);
            return entry.isDirectory() ? filesUnder(relative, accept) : accept(relative) ? [relative] : [];
        })
        .sort();
}

function readSource(relative) {
    const text = readFileSync(path.join(root, relative), "utf8");
    const scriptKind = relative.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
    const sourceFile = ts.createSourceFile(relative, text, ts.ScriptTarget.Latest, true, scriptKind);
    return { path: relative, text, sourceFile };
}

function lineAt(sourceFile, node) {
    return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function endLineAt(sourceFile, node) {
    return sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1;
}

function nearestFunction(node, sourceFile) {
    for (let parent = node.parent; parent; parent = parent.parent) {
        if (ts.isFunctionDeclaration(parent) && parent.name) return parent.name.text;
        if (ts.isMethodDeclaration(parent)) return parent.name.getText(sourceFile);
        if (ts.isMethodSignature(parent)) return parent.name.getText(sourceFile);
        if (ts.isVariableDeclaration(parent) && parent.initializer &&
            (ts.isArrowFunction(parent.initializer) || ts.isFunctionExpression(parent.initializer))) {
            return parent.name.getText(sourceFile);
        }
    }
    return "module";
}

function nearestFunctionNode(node) {
    for (let parent = node.parent; parent; parent = parent.parent) {
        if (ts.isFunctionLike(parent)) return parent;
    }
    return undefined;
}

function topLevelSymbol(node, sourceFile) {
    for (let parent = node.parent; parent; parent = parent.parent) {
        if (ts.isFunctionDeclaration(parent) && parent.name) return parent.name.text;
        if (ts.isVariableDeclaration(parent) && parent.parent.parent.parent === sourceFile) {
            return parent.name.getText(sourceFile);
        }
    }
    return nearestFunction(node, sourceFile);
}

function normalizeUiText(value) {
    return String(value)
        .replace(/\u00a0/g, " ")
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'")
        .replace(/\s+/g, " ")
        .trim();
}

function expressionPattern(node, sourceFile) {
    if (!node) return "";
    if (ts.isStringLiteralLike(node)) return node.text;
    if (ts.isTemplateExpression(node)) {
        return node.head.text + node.templateSpans.map((span) => `{${span.expression.getText(sourceFile)}}${span.literal.text}`).join("");
    }
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
        return expressionPattern(node.left, sourceFile) + expressionPattern(node.right, sourceFile);
    }
    if (ts.isParenthesizedExpression(node)) return expressionPattern(node.expression, sourceFile);
    if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) return expressionPattern(node.body, sourceFile);
    if (ts.isArrayLiteralExpression(node)) return node.elements.map((element) => expressionPattern(element, sourceFile)).join(" | ");
    if (ts.isCallExpression(node)) {
        return node.arguments
            .filter((argument) => ts.isArrowFunction(argument) || ts.isFunctionExpression(argument))
            .map((callback) => expressionPattern(callback.body, sourceFile))
            .join(" | ");
    }
    if (ts.isJsxText(node)) return node.text;
    if (ts.isJsxExpression(node)) {
        return node.expression ? `{${expressionPattern(node.expression, sourceFile) || node.expression.getText(sourceFile)}}` : "";
    }
    if (ts.isJsxElement(node) || ts.isJsxFragment(node)) {
        return node.children.map((child) => expressionPattern(child, sourceFile)).join("");
    }
    if (ts.isJsxSelfClosingElement(node)) return "";
    if (ts.isConditionalExpression(node)) {
        return `${expressionPattern(node.whenTrue, sourceFile)} | ${expressionPattern(node.whenFalse, sourceFile)}`;
    }
    return "";
}

function literalFragments(node, sourceFile, variables = new Map(), seen = new Set()) {
    if (!node) return [];
    if (ts.isStringLiteralLike(node)) return [node.text];
    if (ts.isTemplateExpression(node)) {
        return [node.head.text, ...node.templateSpans.map((span) => span.literal.text)].filter(Boolean);
    }
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
        return [...literalFragments(node.left, sourceFile, variables, seen), ...literalFragments(node.right, sourceFile, variables, seen)];
    }
    if (ts.isConditionalExpression(node)) {
        return [...literalFragments(node.whenTrue, sourceFile, variables, seen), ...literalFragments(node.whenFalse, sourceFile, variables, seen)];
    }
    if (ts.isParenthesizedExpression(node)) return literalFragments(node.expression, sourceFile, variables, seen);
    if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) return literalFragments(node.body, sourceFile, variables, seen);
    if (ts.isCallExpression(node)) {
        return node.arguments.flatMap((argument) => literalFragments(argument, sourceFile, variables, seen));
    }
    if (ts.isIdentifier(node) && variables.has(node.text) && !seen.has(node.text)) {
        const nextSeen = new Set(seen);
        nextSeen.add(node.text);
        return variables.get(node.text).flatMap((value) => literalFragments(value, sourceFile, variables, nextSeen));
    }
    if (ts.isArrayLiteralExpression(node)) {
        return node.elements.flatMap((element) => literalFragments(element, sourceFile, variables, seen));
    }
    return [];
}

function variableInitializers(scopeNode) {
    const variables = new Map();
    if (!scopeNode) return variables;
    function visit(node) {
        if (node !== scopeNode && ts.isFunctionLike(node)) return;
        if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
            const values = variables.get(node.name.text) ?? [];
            values.push(node.initializer);
            variables.set(node.name.text, values);
        }
        if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isIdentifier(node.left)) {
            const values = variables.get(node.left.text);
            if (values) values.push(node.right);
        }
        ts.forEachChild(node, visit);
    }
    visit(scopeNode);
    return variables;
}

function resolveExpression(node, sourceFile, variables, seen = new Set()) {
    if (!node) return { expression: "", resolved: "" };
    const expression = node.getText(sourceFile);
    if (ts.isIdentifier(node) && variables.has(node.text) && !seen.has(node.text)) {
        const nextSeen = new Set(seen);
        nextSeen.add(node.text);
        const values = variables.get(node.text)
            .map((value) => resolveExpression(value, sourceFile, variables, nextSeen).resolved)
            .filter(Boolean);
        return { expression, resolved: [...new Set(values)].join(" | ") };
    }
    return { expression, resolved: expressionPattern(node, sourceFile) || expression };
}

function slug(value) {
    const stop = new Set(["the", "this", "that", "with", "from", "when", "what", "into", "your", "its", "and", "for", "are", "has", "have", "does", "not", "one", "can", "will", "who", "their", "they", "them", "then", "here", "there", "only", "but", "was", "you", "all", "out", "more", "some", "any", "one", "now"]);
    const words = String(value)
        .replace(/\{[^}]*\}/g, " ")
        .toLowerCase()
        .match(/[a-z0-9]+/g) ?? [];
    return words.filter((word) => !stop.has(word)).slice(0, 5).join("-") || "message";
}

function sourceCitation(relative, sourceFile, node, symbol) {
    return {
        path: relative,
        symbol,
        line: lineAt(sourceFile, node),
        endLine: endLineAt(sourceFile, node),
    };
}

function htmlPages() {
    return filesUnder("public/manual", (file) => file.endsWith(".html")).map((relative) => {
        const html = readFileSync(path.join(root, relative), "utf8");
        const document = new JSDOM(html).window.document;
        return { path: relative, html, document, text: document.body?.textContent?.replace(/\s+/g, " ").trim() ?? "" };
    });
}

function parseTemplateRegistry(pages) {
    const parsed = readSource("src/templates/index.ts");
    let registryDeclaration;
    function find(node) {
        if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === "TEMPLATES") {
            registryDeclaration = node;
            return;
        }
        ts.forEachChild(node, find);
    }
    find(parsed.sourceFile);
    const array = registryDeclaration?.initializer;
    if (!array || !ts.isArrayLiteralExpression(array)) throw new Error("Could not read src/templates/index.ts#TEMPLATES as an array");
    const templates = array.elements.map((element) => {
        const properties = new Map();
        if (ts.isObjectLiteralExpression(element)) {
            for (const property of element.properties) {
                if (ts.isPropertyAssignment(property)) properties.set(property.name.getText(parsed.sourceFile).replace(/^['"]|['"]$/g, ""), property.initializer);
            }
        }
        const value = (key) => {
            const node = properties.get(key);
            if (!node) return undefined;
            if (ts.isStringLiteralLike(node)) return node.text;
            if (ts.isNumericLiteral(node)) return Number(node.text);
            return undefined;
        };
        const id = value("id");
        const name = value("name");
        const description = value("description");
        const difficulty = value("difficulty");
        const nodeCount = value("nodeCount");
        const mentionedIn = pages.filter((page) => page.text.includes(name)).map((page) => page.path);
        const sourceNode = ts.isObjectLiteralExpression(element) ? element : registryDeclaration;
        return {
            id,
            name,
            description,
            difficulty,
            nodeCount,
            manualReferences: mentionedIn,
            source: {
                path: parsed.path,
                symbol: `TEMPLATES[${JSON.stringify(id)}]`,
                line: lineAt(parsed.sourceFile, sourceNode),
            },
        };
    });
    return templates;
}

function propertyName(node, sourceFile) {
    return node?.name ? node.name.getText(sourceFile).replace(/^['\"]|['\"]$/g, "") : "";
}

function isUiPropertyName(name) {
    return ["label", "addLabel", "placeholder", "title", "aria-label", "ariaLabel", "buttonLabel", "emptyLabel"].includes(name);
}

function isRenderedUiOption(node, sourceFile) {
    for (let ancestor = node.parent; ancestor; ancestor = ancestor.parent) {
        if (!ts.isArrayLiteralExpression(ancestor)) continue;
        let call = ancestor.parent;
        while (call && (ts.isParenthesizedExpression(call) || ts.isAsExpression(call) || ts.isSatisfiesExpression(call))) call = call.parent;
        if (call && ts.isPropertyAccessExpression(call) && call.name.text === "map") call = call.parent;
        if (!call || !ts.isCallExpression(call) || !ts.isPropertyAccessExpression(call.expression) || call.expression.name.text !== "map") continue;
        const callback = call.arguments[0];
        if (!callback || !(ts.isArrowFunction(callback) || ts.isFunctionExpression(callback))) continue;
        const parameter = callback.parameters[0]?.name.getText(sourceFile);
        if (!parameter) continue;
        let hasUiElement = false;
        function findUiElement(current) {
            if (ts.isJsxElement(current) && isUiElement(current, sourceFile)) hasUiElement = true;
            if (!hasUiElement) ts.forEachChild(current, findUiElement);
        }
        findUiElement(callback.body);
        if (hasUiElement && callback.body.getText(sourceFile).includes(parameter)) return true;
    }
    return false;
}

function isUiLiteral(node, sourceFile) {
    const parent = node.parent;
    if (ts.isPropertyAssignment(parent) && parent.initializer === node && isUiPropertyName(propertyName(parent, sourceFile))) return true;
    if (ts.isPropertyAssignment(parent) && parent.initializer === node && propertyName(parent, sourceFile) === "name" && topLevelSymbol(node, sourceFile) === "TEMPLATES") return true;
    if (ts.isJsxAttribute(parent) && parent.initializer === node && isUiPropertyName(propertyName(parent, sourceFile))) return true;
    if (["CONDITION_OP_LABELS", "HANDLE_STYLE", "DIALOGUE_KIND_LABELS"].includes(topLevelSymbol(node, sourceFile))) return true;
    if (isRenderedUiOption(node, sourceFile)) return true;
    let insideJsxExpression = false;
    for (let ancestor = parent; ancestor; ancestor = ancestor.parent) {
        if (ts.isJsxExpression(ancestor)) insideJsxExpression = true;
        if (ts.isJsxElement(ancestor)) return insideJsxExpression && isUiElement(ancestor, sourceFile);
    }
    return false;
}

function jsxTagName(element, sourceFile) {
    return element.openingElement.tagName.getText(sourceFile).split(".").at(-1) ?? "";
}

function isUiElement(element, sourceFile) {
    const tag = jsxTagName(element, sourceFile);
    if (["button", "option", "label", "summary", "h1", "h2", "h3", "Section", "DialogTitle", "AlertDialogTitle", "DialogDescription"].includes(tag) ||
        /(?:Button|Trigger|Title|MenuItem|SelectItem)$/.test(tag)) return true;
    return element.openingElement.attributes.properties.some((attribute) => {
        if (!ts.isJsxAttribute(attribute)) return false;
        const name = propertyName(attribute, sourceFile);
        if (name === "className" && attribute.initializer) {
            const classText = attribute.initializer.getText(sourceFile);
            if (classText.includes("font-semibold") && classText.includes("uppercase")) return true;
        }
        if (name !== "role" || !attribute.initializer || !ts.isStringLiteralLike(attribute.initializer)) return false;
        return ["button", "tab", "menuitem", "option", "radio", "switch"].includes(attribute.initializer.text);
    });
}

function sourceTextIndex() {
    const candidates = filesUnder("src", (file) => /\.(?:ts|tsx)$/.test(file) &&
        !/(?:\.test\.|\.spec\.|\/__tests__\/)/.test(file) && file !== "src/compiler/runtimeSource.ts");
    const records = [];
    const add = (parsed, node, kind, value, isUi = false) => {
        const text = normalizeUiText(value);
        if (!text || text.length > 240) return;
        records.push({
            text,
            normalized: normalizeUiText(text),
            path: parsed.path,
            line: lineAt(parsed.sourceFile, node),
            symbol: topLevelSymbol(node, parsed.sourceFile),
            kind,
            isUi,
        });
    };
    for (const relative of candidates) {
        const parsed = readSource(relative);
        function visit(node) {
            if (ts.isStringLiteralLike(node)) {
                add(parsed, node, "string-literal", node.text, isUiLiteral(node, parsed.sourceFile));
            }
            if (ts.isJsxText(node)) {
                const parent = node.parent;
                const isUi = ts.isJsxElement(parent) && isUiElement(parent, parsed.sourceFile);
                add(parsed, node, "jsx-text", node.text, isUi);
            }
            if (ts.isTemplateExpression(node)) {
                add(parsed, node, "template-pattern", expressionPattern(node, parsed.sourceFile), isUiLiteral(node, parsed.sourceFile));
            }
            if (ts.isJsxAttribute(node) && node.initializer && ts.isStringLiteralLike(node.initializer)) {
                add(parsed, node, "jsx-attribute", node.initializer.text, isUiPropertyName(propertyName(node, parsed.sourceFile)));
            }
            if (ts.isJsxElement(node)) {
                add(parsed, node, "jsx-composed", expressionPattern(node, parsed.sourceFile), isUiElement(node, parsed.sourceFile));
            }
            ts.forEachChild(node, visit);
        }
        visit(parsed.sourceFile);
    }
    return records;
}

function sourceMatches(label, records) {
    const normalized = normalizeUiText(label);
    return records.filter((record) => record.isUi && record.normalized === normalized)
        .sort((a, b) => {
            const rank = (record) => record.path === "src/schema/registry.ts" ? 0 :
                record.kind === "jsx-composed" ? 1 : record.path.startsWith("src/editor/") ? 2 : 3;
            return rank(a) - rank(b) || a.path.localeCompare(b.path) || a.line - b.line;
        });
}

function candidateSourceMatches(label, records) {
    const tokens = (value) => new Set(normalizeUiText(value).toLowerCase().match(/[a-z0-9]+/g) ?? []);
    const wanted = tokens(label);
    if (!wanted.size) return [];
    const candidates = records.filter((record) => record.isUi).map((record) => {
        const got = tokens(record.text);
        const overlap = [...wanted].filter((word) => got.has(word)).length;
        const score = overlap / new Set([...wanted, ...got]).size;
        const recordNormalized = record.normalized.toLowerCase();
        const labelNormalized = normalizeUiText(label).toLowerCase();
        const contains = recordNormalized.includes(labelNormalized) ||
            (wanted.size > 1 && labelNormalized.includes(recordNormalized));
        return { record, score, contains };
    }).filter(({ record, score, contains }) => (contains || score >= 0.35) && record.text.length >= 5 && record.text.length <= 100)
        .sort((a, b) => b.score - a.score || Number(b.contains) - Number(a.contains) || a.record.path.localeCompare(b.record.path));
    return candidates.slice(0, 4).map(({ record, score }) => ({
        path: record.path,
        symbol: record.symbol,
        line: record.line,
        text: record.text,
        similarity: Number(score.toFixed(2)),
    }));
}

function collectUiLabels(pages, records, templates) {
    const byText = new Map();
    for (const page of pages) {
        for (const element of page.document.querySelectorAll("b.ui")) {
            const label = normalizeUiText(element.textContent ?? "");
            if (!label) continue;
            const row = byText.get(label) ?? {
                label,
                occurrences: 0,
                manualReferences: new Set(),
                nestedCodeOccurrences: 0,
            };
            row.occurrences += 1;
            row.manualReferences.add(page.path);
            if (element.querySelector("code")) row.nestedCodeOccurrences += 1;
            byText.set(label, row);
        }
    }
    const templateCount = templates.length;
    return [...byText.values()].map((row) => {
        const exact = sourceMatches(row.label, records);
        let dynamicMatch = false;
        let dynamicCitation;
        const dynamic = row.label.match(/^Browse\s+(\d+)\s+templates$/);
        if (dynamic && Number(dynamic[1]) === templateCount) {
            const pattern = records.find((record) => record.text === DYNAMIC_TEMPLATE_LABEL);
            if (pattern) {
                dynamicMatch = true;
                dynamicCitation = {
                    path: pattern.path,
                    symbol: pattern.symbol,
                    line: pattern.line,
                    pattern: pattern.text,
                    renderedCount: templateCount,
                };
            }
        }
        const manualReferences = [...row.manualReferences].sort();
        return {
            label: row.label,
            occurrences: row.occurrences,
            manualReferences,
            nestedCodeOccurrences: row.nestedCodeOccurrences,
            matchStatus: exact.length ? "source-match" : dynamicMatch ? "dynamic-source-match" : "unmatched",
            sourceMatches: exact.slice(0, 4).map(({ path: sourcePath, symbol, line, kind, text }) => ({
                path: sourcePath,
                symbol,
                line,
                kind,
                text,
            })),
            ...(dynamicCitation ? { dynamicSource: dynamicCitation } : {}),
            ...(exact.length === 0 && !dynamicMatch ? { candidateSources: candidateSourceMatches(row.label, records) } : {}),
        };
    }).sort((a, b) => a.label.localeCompare(b.label));
}

function expressionDefinitions(node, variables, sourceFile) {
    if (!ts.isIdentifier(node) || !variables.has(node.text)) return [];
    return variables.get(node.text).map((definition) => ({
        path: sourceFile.fileName,
        line: lineAt(sourceFile, definition),
        endLine: endLineAt(sourceFile, definition),
        expression: definition.getText(sourceFile),
    }));
}

function diagnosticExpressions(argument, sourceFile, scope) {
    const variables = variableInitializers(scope);
    const expressions = [];
    if (argument && ts.isObjectLiteralExpression(argument)) {
        for (const property of argument.properties) {
            if (!ts.isPropertyAssignment(property)) continue;
            const key = property.name.getText(sourceFile).replace(/^['"]|['"]$/g, "");
            if (!["label", "detail", "nextStep", "text", "level", "severity", "path"].includes(key)) continue;
            const resolved = resolveExpression(property.initializer, sourceFile, variables);
            expressions.push({
                key,
                expression: resolved.expression,
                resolvedPattern: resolved.resolved,
                literals: literalFragments(property.initializer, sourceFile, variables),
                definitions: expressionDefinitions(property.initializer, variables, sourceFile),
            });
        }
    } else if (argument) {
        const resolved = resolveExpression(argument, sourceFile, variables);
        expressions.push({
            key: "message",
            expression: resolved.expression,
            resolvedPattern: resolved.resolved,
            literals: literalFragments(argument, sourceFile, variables),
            definitions: expressionDefinitions(argument, variables, sourceFile),
        });
    }
    return expressions;
}

function buildDiagnosticId(relative, symbol, expressions, ordinal) {
    const label = expressions.find((entry) => entry.key === "label")?.resolvedPattern;
    const message = expressions.filter((entry) => ["detail", "text", "message", "return"].includes(entry.key))
        .map((entry) => entry.resolvedPattern || entry.literals.join(" "))
        .join(" ");
    return `${relative}#${symbol}/${slug(label || message || `site-${ordinal}`)}`;
}

function collectDiagnostics() {
    const rows = [];
    for (const spec of DIAGNOSTIC_SOURCES) {
        const parsed = readSource(spec.path);
        const seenIds = new Map();
        function visit(node) {
            if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) &&
                node.expression.name.text === "push" && node.expression.expression.getText(parsed.sourceFile) === spec.receiver &&
                node.arguments.length > 0 && !ts.isSpreadElement(node.arguments[0])) {
                const argument = node.arguments[0];
                const scope = nearestFunctionNode(node);
                const expressions = diagnosticExpressions(argument, parsed.sourceFile, scope);
                const symbol = nearestFunction(node, parsed.sourceFile);
                const baseId = buildDiagnosticId(spec.path, symbol, expressions, rows.length + 1);
                const repeat = (seenIds.get(baseId) ?? 0) + 1;
                seenIds.set(baseId, repeat);
                rows.push({
                    id: repeat === 1 ? baseId : `${baseId}-${repeat}`,
                    kind: spec.kind,
                    emission: `${spec.receiver}.push`,
                    source: sourceCitation(spec.path, parsed.sourceFile, node, symbol),
                    expressions,
                });
            }
            ts.forEachChild(node, visit);
        }
        visit(parsed.sourceFile);
    }

    const parsed = readSource(TARGET_WARNING_SOURCE);
    const seenIds = new Map();
    function visitTargetReturns(node) {
        if (ts.isReturnStatement(node)) {
            const symbol = nearestFunction(node, parsed.sourceFile);
            const functionScope = nearestFunctionNode(node);
            const variables = variableInitializers(functionScope);
            const fragments = literalFragments(node.expression, parsed.sourceFile, variables);
            if (symbol.startsWith("warn") && fragments.length > 0) {
                const expression = resolveExpression(node.expression, parsed.sourceFile, variables);
                const expressions = [{
                    key: "return",
                    expression: expression.expression,
                    resolvedPattern: expression.resolved,
                    literals: fragments,
                }];
                const baseId = buildDiagnosticId(parsed.path, symbol, expressions, rows.length + 1);
                const repeat = (seenIds.get(baseId) ?? 0) + 1;
                seenIds.set(baseId, repeat);
                rows.push({
                    id: repeat === 1 ? baseId : `${baseId}-${repeat}`,
                    kind: "target-warning",
                    emission: "return warning text",
                    source: sourceCitation(parsed.path, parsed.sourceFile, node, symbol),
                    expressions,
                });
            }
        }
        ts.forEachChild(node, visitTargetReturns);
    }
    visitTargetReturns(parsed.sourceFile);
    return rows;
}

function escapeRegex(value) {
    const backslash = String.fromCharCode(92);
    const special = "^$.*+?()[]{}|";
    return [...value].map((char) => special.includes(char) || char.charCodeAt(0) === 92 ? backslash + char : char).join("");
}
function flexibleOffset(text, snippet) {
    const direct = text.indexOf(snippet);
    if (direct >= 0) return direct;
    const whitespace = new RegExp(String.fromCharCode(92) + "s+");
    const pattern = snippet.trim().split(whitespace).map(escapeRegex).join(String.fromCharCode(92) + "s+");
    return new RegExp(pattern).exec(text)?.index ?? -1;
}

function parsePanelMessageInventory(pages) {
    const parsed = readSource(PANEL_TEST_SOURCE);
    let declaration;
    function find(node) {
        if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === "PANEL_MESSAGES") {
            declaration = node;
            return;
        }
        ts.forEachChild(node, find);
    }
    find(parsed.sourceFile);
    if (!declaration?.initializer || !ts.isArrayLiteralExpression(declaration.initializer)) {
        throw new Error(`${PANEL_TEST_SOURCE} no longer has a parseable PANEL_MESSAGES evidence list`);
    }
    const manualPage = pages.find((page) => page.path === "public/manual/checking.html");
    return declaration.initializer.elements.map((element, index) => {
        const values = new Map();
        if (ts.isObjectLiteralExpression(element)) {
            for (const property of element.properties) {
                if (ts.isPropertyAssignment(property) && ts.isStringLiteralLike(property.initializer)) {
                    values.set(property.name.getText(parsed.sourceFile), property.initializer.text);
                }
            }
        }
        const sourcePath = values.get("src");
        const sourceSnippet = values.get("inSource");
        const docsSnippet = values.get("inDocs");
        const sourceText = readFileSync(path.join(root, sourcePath), "utf8");
        const sourceOffset = flexibleOffset(sourceText, sourceSnippet);
        const docsOffset = manualPage ? flexibleOffset(manualPage.html, docsSnippet) : -1;
        return {
            id: `panel-${String(index + 1).padStart(2, "0")}`,
            source: {
                path: sourcePath,
                symbol: "panel message source snippet (tracked by G11)",
                line: sourceOffset < 0 ? null : sourceText.slice(0, sourceOffset).split("\n").length,
                snippet: sourceSnippet,
            },
            manual: {
                path: "public/manual/checking.html",
                line: docsOffset < 0 ? null : manualPage.html.slice(0, docsOffset).split("\n").length,
                snippet: docsSnippet,
            },
            sourceTest: sourceCitation(parsed.path, parsed.sourceFile, element, "PANEL_MESSAGES"),
        };
    });
}

function parseManualMessageBlocks(pages) {
    const blocks = [];
    for (const page of pages) {
        for (const heading of page.document.querySelectorAll('h3[id^="msg-"]')) {
            const quote = heading.nextElementSibling?.tagName === "BLOCKQUOTE"
                ? heading.nextElementSibling.textContent.replace(/\s+/g, " ").trim()
                : "";
            const id = heading.id;
            const offset = page.html.indexOf(`id="${id}"`);
            blocks.push({
                id,
                title: heading.textContent.replace(/\s+/g, " ").trim(),
                quote,
                manual: {
                    path: page.path,
                    anchor: `#${id}`,
                    line: offset < 0 ? null : page.html.slice(0, offset).split("\n").length,
                },
            });
        }
    }
    return blocks;
}

function diagnosticQuoteEvidence(site, manualBlocks) {
    const tokens = (value) => normalizeUiText(value)
        .toLowerCase()
        .replace(/\{[^}]*\}/g, " ")
        .match(/[a-z0-9]+/g) ?? [];
    const sourcePhrases = site.expressions
        .filter((entry) => ["detail", "text", "message", "return"].includes(entry.key))
        .flatMap((entry) => [...entry.literals, entry.resolvedPattern])
        .filter((value) => tokens(value).length >= 4);
    const label = site.expressions.find((entry) => entry.key === "label")?.resolvedPattern;
    const labelMatch = label && manualBlocks.find((block) => normalizeUiText(block.title).toLowerCase() === normalizeUiText(label).toLowerCase());
    if (labelMatch) {
        return {
            status: "heading-candidate",
            manual: labelMatch.manual,
            matchedPhrase: label,
            method: "diagnostic label equals a manual message heading; content still needs review",
        };
    }
    let best;
    for (const sourcePhrase of sourcePhrases) {
        const sourceTokens = tokens(sourcePhrase);
        for (const block of manualBlocks) {
            const quoteTokens = tokens(block.quote);
            let longest = [];
            for (let i = 0; i < sourceTokens.length; i++) {
                for (let j = 0; j < quoteTokens.length; j++) {
                    let length = 0;
                    while (sourceTokens[i + length] && sourceTokens[i + length] === quoteTokens[j + length]) length++;
                    if (length > longest.length) longest = sourceTokens.slice(i, i + length);
                }
            }
            if (longest.length < 4) continue;
            const candidate = {
                status: "phrase-candidate",
                manual: block.manual,
                matchedPhrase: longest.join(" "),
                matchingWords: longest.length,
                method: "four-or-more adjacent normalized words overlap; this is a search lead, not proof of coverage",
            };
            if (!best || candidate.matchingWords > best.matchingWords) best = candidate;
        }
    }
    return best ?? { status: "no-quote-candidate", manual: null, matchedPhrase: null, method: "no four-word phrase match in checking.html message quotations" };
}

function manualTableRows(page, headingId) {
    const heading = page?.document.getElementById(headingId);
    const table = heading?.nextElementSibling?.tagName === "P" ? heading.nextElementSibling.nextElementSibling : heading?.nextElementSibling;
    if (!table || table.tagName !== "TABLE") return [];
    return [...table.querySelectorAll("tbody tr")].map((row) => [...row.querySelectorAll("td")].map((cell) => cell.textContent.replace(/\s+/g, " ").trim()));
}

function collectPermissions(pages) {
    const parsed = readSource("src/compiler/compile.ts");
    const producerRows = [];
    const seen = new Set();
    const add = (node, owner) => {
        const key = `${node.text}|${lineAt(parsed.sourceFile, node)}|${owner}`;
        if (seen.has(key)) return;
        seen.add(key);
        producerRows.push({
            permission: node.text,
            source: sourceCitation(parsed.path, parsed.sourceFile, node, owner),
            literal: node.text,
        });
    };
    function visit(node) {
        if (ts.isStringLiteralLike(node)) {
            let mapArrayValue = false;
            if (ts.isArrayLiteralExpression(node.parent)) {
                for (let parent = node.parent.parent; parent; parent = parent.parent) {
                    if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name) && parent.name.text === "PERMISSIONS_BY_NODE_TYPE") {
                        mapArrayValue = true;
                        break;
                    }
                    if (ts.isFunctionLike(parent)) break;
                }
            }
            if (mapArrayValue) add(node, "PERMISSIONS_BY_NODE_TYPE");
        }
        if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) &&
            ["push", "add"].includes(node.expression.name.text) &&
            ["perms", "permissions"].includes(node.expression.expression.getText(parsed.sourceFile))) {
            const owner = nearestFunction(node, parsed.sourceFile);
            if (PERMISSION_FUNCTIONS.has(owner)) {
                for (const argument of node.arguments) {
                    if (ts.isStringLiteralLike(argument)) add(argument, owner);
                }
            }
        }
        ts.forEachChild(node, visit);
    }
    visit(parsed.sourceFile);
    const permissionNames = [...new Set(producerRows.map((row) => row.permission))].sort();
    const byPermission = permissionNames.map((permission) => ({
        name: permission,
        producers: producerRows.filter((row) => row.permission === permission),
    }));
    const exportPage = pages.find((page) => page.path === "public/manual/export.html");
    const manualPermissions = manualTableRows(exportPage, "permissions").map((cells) => cells[0]).filter(Boolean);
    return {
        source: { path: parsed.path, symbols: ["PERMISSIONS_BY_NODE_TYPE", ...PERMISSION_FUNCTIONS] },
        rows: byPermission,
        manual: {
            path: "public/manual/export.html",
            anchor: "#permissions",
            rows: manualPermissions,
            missing: permissionNames.filter((name) => !manualPermissions.includes(name)),
            stale: manualPermissions.filter((name) => !permissionNames.includes(name)),
        },
    };
}

function collectExportOutputs(pages) {
    const parsed = readSource("src/compiler/compile.ts");
    let compileProject;
    function findFunction(node) {
        if (ts.isFunctionDeclaration(node) && node.name?.text === "compileProject") compileProject = node;
        ts.forEachChild(node, findFunction);
    }
    findFunction(parsed.sourceFile);
    if (!compileProject) throw new Error("Could not find src/compiler/compile.ts#compileProject");
    let filesArray;
    function findFiles(node) {
        if (ts.isPropertyAssignment(node) && node.name.getText(parsed.sourceFile) === "files" && ts.isArrayLiteralExpression(node.initializer)) {
            filesArray = node.initializer;
        }
        ts.forEachChild(node, findFiles);
    }
    findFiles(compileProject);
    if (!filesArray) throw new Error("Could not find the files array returned by compileProject");
    const fixed = filesArray.elements.flatMap((element) => {
        if (!ts.isObjectLiteralExpression(element)) return [];
        const pathProperty = element.properties.find((property) => ts.isPropertyAssignment(property) && property.name.getText(parsed.sourceFile) === "path");
        if (!pathProperty || !ts.isStringLiteralLike(pathProperty.initializer)) return [];
        return [{
            path: pathProperty.initializer.text,
            source: sourceCitation(parsed.path, parsed.sourceFile, pathProperty, "compileProject.files"),
        }];
    });
    const imageAssetFunction = (() => {
        let found;
        function search(node) {
            if (ts.isFunctionDeclaration(node) && node.name?.text === "imageAsset") found = node;
            ts.forEachChild(node, search);
        }
        search(parsed.sourceFile);
        return found;
    })();
    const imageAssetCitation = imageAssetFunction
        ? sourceCitation(parsed.path, parsed.sourceFile, imageAssetFunction, "imageAsset")
        : { path: parsed.path, symbol: "imageAsset", line: null };
    const widget = readSource("src/compiler/widgetHtml.ts");
    const widgetPathNode = (() => {
        let found;
        function search(node) {
            if (ts.isFunctionDeclaration(node) && node.name?.text === "widgetPath") found = node;
            ts.forEachChild(node, search);
        }
        search(widget.sourceFile);
        return found;
    })();
    const widgetCitation = widgetPathNode
        ? sourceCitation(widget.path, widget.sourceFile, widgetPathNode, "widgetPath")
        : { path: widget.path, symbol: "widgetPath", line: null };
    const imageCalls = [];
    const questImageCalls = [];
    function findAssetCalls(node) {
        if (ts.isCallExpression(node)) {
            const callee = ts.isIdentifier(node.expression)
                ? node.expression.text
                : ts.isPropertyAccessExpression(node.expression) ? node.expression.name.text : "";
            if (callee === "imageAsset" && node.arguments.length > 1 && ts.isStringLiteralLike(node.arguments[1])) {
                imageCalls.push({ name: node.arguments[1].text, source: sourceCitation(parsed.path, parsed.sourceFile, node, "compileProject.imageAsset") });
            }
            if (callee === "extractImage" && node.arguments.length > 1) {
                questImageCalls.push({
                    slot: expressionPattern(node.arguments[1], parsed.sourceFile),
                    source: sourceCitation(parsed.path, parsed.sourceFile, node, "compileProject.extractImage"),
                });
            }
        }
        ts.forEachChild(node, findAssetCalls);
    }
    findAssetCalls(compileProject);
    const imageTrigger = (name) => imageCalls.find((call) => call.name === name)?.source ?? null;
    const optionalFamilies = [
        {
            id: "mod-icon",
            pattern: "assets/icon.{png|jpg}",
            condition: "project.mod.icon contains a supported PNG/JPEG data URL",
            sources: [imageAssetCitation, imageTrigger("icon")].filter(Boolean),
        },
        {
            id: "mod-cover",
            pattern: "assets/cover.{png|jpg}",
            condition: "project.mod.cover contains a supported PNG/JPEG data URL",
            sources: [imageAssetCitation, imageTrigger("cover")].filter(Boolean),
        },
        {
            id: "quest-images",
            pattern: "assets/q{sequence}-{slot}.{png|jpg}",
            slots: questImageCalls.map((call) => call.slot),
            condition: "a quest image slot contains a supported PNG/JPEG data URL",
            sources: [imageAssetCitation, ...questImageCalls.map((call) => call.source)],
        },
        {
            id: "desktop-widgets",
            pattern: "widgets/{widget-id}.html",
            condition: "the project has at least one desktop widget",
            sources: [widgetCitation],
        },
    ];
    const exportPage = pages.find((page) => page.path === "public/manual/export.html");
    const manualFiles = manualTableRows(exportPage, "zip-contents").map((cells) => cells[0]).filter(Boolean);
    return {
        fixed,
        optionalFamilies,
        manual: {
            path: "public/manual/export.html",
            anchor: "#zip-contents",
            fixedPaths: manualFiles,
            missingFixed: fixed.map((row) => row.path).filter((file) => !manualFiles.includes(file)),
            staleFixed: manualFiles.filter((file) => !fixed.some((row) => row.path === file)),
            undocumentedOptionalFamilies: optionalFamilies.map((family) => family.id),
        },
    };
}

function flattenFieldCitationRows(nodeType, fields) {
    return fields.flatMap((field) => [
        { node: nodeType, path: field.path, source: field.source },
        ...(field.fields ? flattenFieldCitationRows(nodeType, field.fields) : []),
    ]);
}

function collectGuideSections(pages) {
    const wanted = new Set(["public/manual/guides.html", "public/manual/how-do-i.html", "public/manual/appendices.html"]);
    return pages.filter((page) => wanted.has(page.path)).flatMap((page) => [...page.document.querySelectorAll("h2[id], h3[id]")].map((heading) => ({
        title: heading.textContent.replace(/\s+/g, " ").trim(),
        manual: { path: page.path, anchor: `#${heading.id}` },
    })));
}

export function collectEvidenceInventory() {
    const pages = htmlPages();
    const templateRows = parseTemplateRegistry(pages);
    const sourceRecords = sourceTextIndex();
    const uiRows = collectUiLabels(pages, sourceRecords, templateRows);
    const diagnosticSites = collectDiagnostics();
    const panelMessages = parsePanelMessageInventory(pages);
    const manualMessages = parseManualMessageBlocks(pages);
    const diagnostics = diagnosticSites.map((site) => ({
        ...site,
        manualQuoteEvidence: diagnosticQuoteEvidence(site, manualMessages),
    }));
    const permissions = collectPermissions(pages);
    const exportOutputs = collectExportOutputs(pages);
    const nodeInventory = JSON.parse(readFileSync(path.join(root, "docs/manual/inventory.json"), "utf8"));
    const manualOccurrences = uiRows.reduce((sum, row) => sum + row.occurrences, 0);
    const unmatchedUi = uiRows.filter((row) => row.matchStatus === "unmatched").map((row) => row.label);
    const templatesNotMentioned = templateRows.filter((row) => row.manualReferences.length === 0).map((row) => row.id);

    return {
        schemaVersion: 1,
        generatedBy: "scripts/extract-manual-evidence-inventory.mjs",
        editorBuild: nodeInventory.editorBuild,
        nodeInventory: {
            path: "docs/manual/inventory.json",
            counts: nodeInventory.counts,
            categories: nodeInventory.categories,
            edgeKinds: nodeInventory.edgeKinds,
            eventGroups: nodeInventory.eventGroups,
            nodeTypeCitations: nodeInventory.nodes.map(({ type, label, source }) => ({ type, label, source })),
            fieldCitations: nodeInventory.nodes.flatMap((node) => flattenFieldCitationRows(node.type, node.fields)),
            socketCitations: nodeInventory.nodes.flatMap((node) => [
                ...node.targets.map((socket) => ({ node: node.type, direction: "input", ...socket })),
                ...node.sources.map((socket) => ({ node: node.type, direction: "output", ...socket })),
            ]),
            events: nodeInventory.events,
        },
        diagnostics: {
            sourceFiles: [...DIAGNOSTIC_SOURCES.map((source) => ({ path: source.path, symbol: "message-emission sites" })), { path: TARGET_WARNING_SOURCE, symbol: "warnServices / warnVersions / warnVulns" }],
            sites: diagnostics,
            panelMessages,
            currentManualBlocks: manualMessages,
            evidenceCounts: {
                sourceSites: diagnostics.length,
                graphIssues: diagnostics.filter((row) => row.kind === "graph-issue").length,
                fieldWarnings: diagnostics.filter((row) => row.kind === "field-warning").length,
                exportWarnings: diagnostics.filter((row) => row.kind === "export-warning" || row.kind === "target-warning").length,
                panelMessages: panelMessages.length,
                manualMessageBlocks: manualMessages.length,
                sourceSitesWithQuoteCandidate: diagnostics.filter((row) => row.manualQuoteEvidence.status !== "no-quote-candidate").length,
                sourceSitesWithoutQuoteCandidate: diagnostics.filter((row) => row.manualQuoteEvidence.status === "no-quote-candidate").length,
            },
            noQuoteCandidateSites: diagnostics.filter((row) => row.manualQuoteEvidence.status === "no-quote-candidate").map((row) => row.id),
            quoteMatchingNote: "Lexical matching against checking.html blockquotes is a search aid only; it does not establish semantic or complete coverage.",
        },
        uiLabels: {
            manualPageSet: "public/manual/**/*.html",
            occurrences: manualOccurrences,
            uniqueLabels: uiRows.length,
            exactSourceMatches: uiRows.filter((row) => row.matchStatus === "source-match").length,
            dynamicSourceMatches: uiRows.filter((row) => row.matchStatus === "dynamic-source-match").length,
            unmatchedLabels: unmatchedUi,
            reviewCandidates: UI_REVIEW_CANDIDATES,
            rows: uiRows,
        },
        templates: {
            source: { path: "src/templates/index.ts", symbol: "TEMPLATES" },
            count: templateRows.length,
            manualSections: [
                { path: "public/manual/guides.html", anchor: "#templates" },
                { path: "public/manual/tutorial.html", anchor: "#new-project" },
            ],
            rows: templateRows,
            namesNotMentionedInManual: templatesNotMentioned,
        },
        permissions,
        exportOutputs,
        featureReference: {
            manualSections: collectGuideSections(pages),
            sourceMapping: "not yet normalized: feature surfaces are spread across editor panels, schema and compiler modules",
        },
    };
}

if (process.argv.includes("--write")) {
    const inventory = collectEvidenceInventory();
    mkdirSync(path.dirname(evidencePath), { recursive: true });
    writeFileSync(evidencePath, JSON.stringify(inventory, null, 2) + "\n");
    console.log(`Wrote ${slash(path.relative(root, evidencePath))}`);
    console.log(`  ${inventory.diagnostics.evidenceCounts.sourceSites} emitted diagnostic sites · ${inventory.diagnostics.evidenceCounts.panelMessages} panel messages · ${inventory.diagnostics.evidenceCounts.manualMessageBlocks} manual message blocks`);
    console.log(`  ${inventory.uiLabels.occurrences} quoted UI occurrences · ${inventory.uiLabels.uniqueLabels} unique labels · ${inventory.uiLabels.unmatchedLabels.length} unmatched`);
    console.log(`  ${inventory.templates.count} templates · ${inventory.permissions.rows.length} permissions · ${inventory.exportOutputs.fixed.length} fixed outputs + ${inventory.exportOutputs.optionalFamilies.length} optional families`);
}
