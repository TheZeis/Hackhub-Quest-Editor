/**
 * Maintainer-reviewed links from each feature-guide section to the shipped
 * editor surfaces that support it. The evidence generator copies this table
 * into docs/manual/evidence-inventory.json and rejects missing/stale anchors.
 *
 * `symbols` are searchable source symbols or deliberate source comments. Keep
 * this map about what the reader can actually use; a limitation row may cite
 * disabled or absent UI only to prove that the feature is not exposed.
 */
export const FEATURE_SOURCE_MAP = {
    "public/manual/appendices.html#glossary": {
        sources: [
            { path: "src/schema/nodes.ts", symbols: ["NodeDoc", "NODE_TYPES"], role: "Node and objective records." },
            { path: "src/schema/edges.ts", symbols: ["EdgeKind", "HANDLE_STYLE"], role: "Wire kinds and socket rules." },
            { path: "src/schema/project.ts", symbols: ["ProjectDocument", "ProjectSchema"], role: "The saved project shape." },
            { path: "src/schema/events.ts", symbols: ["CatalogueEvent", "EVENT_COUNT"], role: "Game event records." },
            { path: "src/toolpacks/schema.ts", symbols: ["ToolPack", "ToolPackSchema"], role: "Community addon data." },
            { path: "src/components/WarningList.tsx", symbols: ["WarningList"], role: "Warning and error display." },
        ],
    },
    "public/manual/appendices.html#shortcuts": {
        sources: [
            { path: "src/editor/shell/Overlays.tsx", symbols: ["SHORTCUT_GROUPS"], role: "The visible shortcut and gesture list." },
            { path: "src/hooks/useKeyboardShortcuts.ts", symbols: ["useKeyboardShortcuts", "isTypingTarget"], role: "Keyboard shortcut behavior." },
            { path: "src/editor/canvas/QuestCanvas.tsx", symbols: ["QuestCanvas", "WIRE_HELP"], role: "Canvas mouse gestures and wiring." },
            { path: "src/editor/canvas/wiring.ts", symbols: ["decideHeldDrop", "soleMatchingInput"], role: "Wire-drop behavior." },
        ],
    },
    "public/manual/appendices.html#limits": {
        sources: [
            { path: "src/analysis/graph.ts", symbols: ["analyseGraph"], role: "Graph checks and their limits." },
            { path: "src/compiler/compile.ts", symbols: ["warnUnstartableQuests", "warnWifi", "warnDialogue", "warnCommunityNodes", "warnHandbook", "computeWarningDetails", "compileProject"], role: "Export checks and emitted project data." },
            { path: "src/compiler/targetWarnings.ts", symbols: ["warnTargetMatching"], role: "Target-matching warnings." },
            { path: "src/compiler/simulate.ts", symbols: ["simulateProject", "recordingSdk", "buildProbes"], role: "What the dry run can and cannot check." },
            { path: "src/compiler/runtimeSource.ts", symbols: ["__qeRegisterProject", "Handbook.open"], role: "Quest runtime behavior and game-facing calls." },
            { path: "src/editor/shell/ExportDialog.tsx", symbols: ["ExportDialog", "Download .zip"], role: "Export remains available with warnings." },
            { path: "src/editor/shell/Overlays.tsx", symbols: ["NewProjectDialog"], role: "Starting over clears the current project." },
            { path: "src/store/autosave.ts", symbols: ["loadDraft", "clearDraft"], role: "Browser-local draft storage." },
            { path: "src/editor/shell/SettingsDialog.tsx", symbols: ["SettingsDialog"], role: "Settings are editor preferences." },
            { path: "src/editor/extras/ExtrasDialog.tsx", symbols: ["TABS", "Localization is PARKED"], role: "The translation screen is not exposed; active extras are listed separately." },
            { path: "src/editor/shell/DialoguesDialog.tsx", symbols: ["DialoguesDialog"], role: "Supported dialogue previews, not installable phone apps." },
        ],
        reviewNote: "This page records limitations; it must not imply that an unsupported game feature is available in the editor.",
    },
    "public/manual/appendices.html#events-list": {
        sources: [
            { path: "src/schema/events.ts", symbols: ["EVENTS", "EVENT_COUNT", "EVENT_GROUPS", "groupedEvents"], role: "The built-in game-event catalogue and picker groups." },
            { path: "reference/hackhub-events.json", symbols: ["generatedFrom", "events"], role: "The SDK-derived event names and payloads." },
        ],
    },
    "public/manual/appendices.html#events-recon": {
        sources: [{ path: "src/schema/events.ts", symbols: ["EVENT_GROUPS", "groupedEvents"], role: "The reconnaissance and terminal group." }],
    },
    "public/manual/appendices.html#events-web": {
        sources: [{ path: "src/schema/events.ts", symbols: ["EVENT_GROUPS", "groupedEvents"], role: "The browser and HTTP group." }],
    },
    "public/manual/appendices.html#events-access": {
        sources: [{ path: "src/schema/events.ts", symbols: ["EVENT_GROUPS", "groupedEvents"], role: "The access and exploitation group." }],
    },
    "public/manual/appendices.html#events-cracking": {
        sources: [{ path: "src/schema/events.ts", symbols: ["EVENT_GROUPS", "groupedEvents"], role: "The cracking and vulnerability-scanning group." }],
    },
    "public/manual/appendices.html#events-wifi": {
        sources: [{ path: "src/schema/events.ts", symbols: ["EVENT_GROUPS", "groupedEvents"], role: "The Bettercap and Wi-Fi group." }],
    },
    "public/manual/appendices.html#events-network": {
        sources: [{ path: "src/schema/events.ts", symbols: ["EVENT_GROUPS", "groupedEvents"], role: "The network and infrastructure group." }],
    },
    "public/manual/appendices.html#events-files": {
        sources: [{ path: "src/schema/events.ts", symbols: ["EVENT_GROUPS", "groupedEvents"], role: "The files group." }],
    },
    "public/manual/appendices.html#events-mail": {
        sources: [{ path: "src/schema/events.ts", symbols: ["EVENT_GROUPS", "groupedEvents"], role: "The e-mail group." }],
    },
    "public/manual/appendices.html#events-social": {
        sources: [{ path: "src/schema/events.ts", symbols: ["EVENT_GROUPS", "groupedEvents"], role: "The social and chat group." }],
    },
    "public/manual/appendices.html#events-world": {
        sources: [{ path: "src/schema/events.ts", symbols: ["EVENT_GROUPS", "groupedEvents"], role: "The bank, quest and miscellaneous group." }],
    },
    "public/manual/appendices.html#version": {
        sources: [
            { path: "src/compiler/compile.ts", symbols: ["EDITOR_BUILD"], role: "The editor build stamp included in export." },
            { path: "src/editor/canvas/DebugPanel.tsx", symbols: ["DebugPanel", "EDITOR_BUILD"], role: "The stamp shown in the editor's Debug panel." },
            { path: "src/editor/shell/StatusBar.tsx", symbols: ["StatusBar", "SDK_VERSION"], role: "The editor status bar." },
        ],
    },
    "public/manual/guides.html#inspector-tabs": {
        sources: [
            { path: "src/editor/inspector/InspectorPanel.tsx", symbols: ["InspectorPanel", "NodeInspector", "QuestInspector", "ModInspector"], role: "The inspector's tabs and panels." },
            { path: "src/schema/registry.ts", symbols: ["NODE_TYPES_REGISTRY", "FIELD_GROUPS"], role: "Node labels and editable fields." },
            { path: "src/schema/project.ts", symbols: ["QuestSchema", "ModSchema"], role: "Quest and mod settings stored in the project." },
        ],
    },
    "public/manual/guides.html#quest-settings": {
        sources: [
            { path: "src/editor/inspector/InspectorPanel.tsx", symbols: ["QuestInspector"], role: "Quest-level fields and controls." },
            { path: "src/schema/project.ts", symbols: ["QuestSchema", "createQuest"], role: "Quest fields and defaults." },
        ],
    },
    "public/manual/guides.html#mod-settings": {
        sources: [
            { path: "src/editor/inspector/InspectorPanel.tsx", symbols: ["ModInspector"], role: "Mod-level fields and controls." },
            { path: "src/schema/project.ts", symbols: ["ModSchema"], role: "Saved mod settings." },
            { path: "src/compiler/compile.ts", symbols: ["computePermissions", "buildManifest"], role: "Permissions and exported manifest values." },
        ],
    },
    "public/manual/guides.html#dialogues": {
        sources: [
            { path: "src/editor/shell/DialoguesDialog.tsx", symbols: ["DialoguesDialog", "PhoneCore"], role: "The dialogue preview window." },
            { path: "src/editor/inspector/sims/DialogueNodeEditor.tsx", symbols: ["DialogueNodeEditor"], role: "Dialogue node editing." },
            { path: "src/editor/inspector/sims/index.tsx", symbols: ["NODE_SIM_EDITORS"], role: "Specialized dialogue and message editors." },
            { path: "src/schema/nodes.ts", symbols: ["DialogueNodeDataSchema", "DialogueKindSchema"], role: "Saved dialogue choices and messages." },
        ],
    },
    "public/manual/guides.html#websites": {
        sources: [
            { path: "src/editor/websites/WebsiteBuilder.tsx", symbols: ["WebsiteBuilderDialog", "BrowserPreview"], role: "The website builder and its preview." },
            { path: "src/editor/websites/pageEditor.tsx", symbols: ["VisualPageEditor", "CodePageEditor"], role: "Page editing controls." },
            { path: "src/schema/project.ts", symbols: ["WebsiteSchema", "WebPageSchema"], role: "Saved website and page fields." },
            { path: "src/compiler/compile.ts", symbols: ["compileProject"], role: "Website export." },
        ],
    },
    "public/manual/guides.html#templates": {
        sources: [
            { path: "src/templates/index.ts", symbols: ["TEMPLATES", "getTemplate"], role: "Template names and contents." },
            { path: "src/editor/shell/Overlays.tsx", symbols: ["TemplatesDialog"], role: "The visible template picker." },
            { path: "src/schema/project.ts", symbols: ["createProject"], role: "A new project from a selected template." },
        ],
    },
    "public/manual/guides.html#dry-run": {
        sources: [
            { path: "src/editor/simulator/SimulatorDialog.tsx", symbols: ["SimulatorDialog", "PROBE_BADGE", "Run again"], role: "Visible dry-run labels, result placement and automatic run." },
            { path: "src/compiler/simulate.ts", symbols: ["recordingSdk", "buildProbes", "simulateProject", "unknown-event", "no-match", "internal"], role: "The rehearsal, sample event details, waits and reported outcomes." },
            { path: "src/compiler/compile.ts", symbols: ["compileProject"], role: "The compiled mod the rehearsal uses." },
        ],
        reviewNote: "A positive result only means the recording simulator matched its sample; it does not prove that the game sends or displays the event as expected.",
        errorSurfaces: [
            { id: "simulator.no-mod-file", sourceText: "the compiler produced no dist/mod.js — nothing to dry-run", manualText: "the compiler produced no dist/mod.js — nothing to dry-run" },
            { id: "simulator.registration-threw", sourceText: "the emitted mod threw while registering", manualText: "the emitted mod threw while registering" },
            { id: "simulator.quest-did-not-register", sourceText: "this quest did not register (no class was emitted for it)", manualText: "this quest did not register" },
            { id: "simulator.quest-threw", sourceText: "the quest's own code threw", manualText: "the quest's own code threw" },
            { id: "simulator.listener-threw", sourceText: "the listener threw:", manualText: "the listener threw" },
            { id: "simulator.conditions-did-not-match", sourceText: "the conditions did not match an event shaped the way this trigger expects", manualText: "the sample did not satisfy the condition" },
            { id: "simulator.unknown-event", sourceText: "this event is not in the game's catalogue", manualText: "community addon's event can still be real" },
            { id: "simulator.no-listener", sourceText: "the runtime registered no listener for this event", manualText: "no matching listener" },
        ],
    },
    "public/manual/guides.html#addons": {
        sources: [
            { path: "src/editor/shell/TopBar.tsx", symbols: ["Addons", "toolpacks"], role: "The Addons entry in the toolbar." },
            { path: "src/toolpacks/ToolPackManagerDialog.tsx", symbols: ["ToolPackManagerDialog", "readAsText", "No .json files in that selection", "not valid JSON", "file could not be read"], role: "File selection, loading results and user-facing file errors." },
            { path: "src/toolpacks/schema.ts", symbols: ["TOOLPACK_FORMAT", "parseToolPack", "describePackError"], role: "Addon format and field validation." },
            { path: "src/store/packs.ts", symbols: ["loadStored", "persist", "loadPack", "localStorage"], role: "Replacement, browser storage and reload behavior." },
            { path: "src/toolpacks/palette.ts", symbols: ["packEvents", "packNodeDefs"], role: "Where loaded addon events and nodes appear." },
        ],
        reviewNote: "Addons are JSON data, stored per browser rather than in the project. A dry run cannot verify that a related game mod is installed or emits the expected events.",
        errorSurfaces: [
            { id: "addon.invalid-json", sourceText: "this is not valid JSON", manualText: "this is not valid JSON" },
            { id: "addon.not-an-addon", sourceText: "This file is not an addon", manualText: "The file is not an addon" },
            { id: "addon.format-mismatch", sourceText: "this editor speaks format", manualText: "The format number is wrong" },
            { id: "addon.schema-field", sourceText: "describePackError", manualText: "A short path and message are shown" },
            { id: "addon.file-read", sourceText: "the file could not be read", manualText: "The file could not be read" },
            { id: "addon.no-json-file", sourceText: "No .json files in that selection", manualText: "No addon files were selected" },
            { id: "addon.multiple-files", sourceText: "for (const file of Array.from(files))", manualText: "You can select several files at once" },
            { id: "addon.local-storage", sourceText: "packs stay for this session only", manualText: "storage fails" },
            { id: "addon.invalid-saved-pack", sourceText: "Broken entries are skipped, not fatal", manualText: "saved addon can be skipped" },
        ],
    },
    "public/manual/guides.html#settings": {
        sources: [
            { path: "src/editor/shell/SettingsDialog.tsx", symbols: ["SettingsDialog", "ThemeCard", "DangerAction"], role: "Visible settings and reset controls." },
            { path: "src/editor/settings/theme.ts", symbols: ["THEMES", "setTheme"], role: "Editor theme choices." },
            { path: "src/editor/settings/uiFont.ts", symbols: ["UI_FONTS", "setUiFont"], role: "Interface font choices." },
            { path: "src/editor/canvas/CanvasGridBackground.tsx", symbols: ["CanvasGridBackground"], role: "Canvas grid appearance." },
            { path: "src/editor/canvas/wirePhysicsPref.ts", symbols: ["wirePhysicsEnabled"], role: "Springy-wire setting." },
            { path: "src/editor/canvas/wireMotion.ts", symbols: ["wireMotionEnabled"], role: "Animated-wire setting." },
        ],
    },
    "public/manual/guides.html#canvas-tools": {
        sources: [
            { path: "src/editor/canvas/QuestCanvas.tsx", symbols: ["QuestCanvas", "analyseGraph"], role: "Canvas toolbar, issue count and graph surface." },
            { path: "src/editor/canvas/arrange.ts", symbols: ["alignPositions", "distributePositions", "snapPositions"], role: "Alignment, spacing and snap calculations." },
            { path: "src/editor/canvas/DebugPanel.tsx", symbols: ["DebugPanel"], role: "The editor's diagnostic panel." },
            { path: "src/editor/shell/StatusBar.tsx", symbols: ["StatusBar"], role: "Selection, graph size and save status." },
            { path: "src/analysis/graph.ts", symbols: ["analyseGraph", "summariseIssues"], role: "Canvas issue checks." },
        ],
    },
    "public/manual/guides.html#pack-extras": {
        sources: [
            { path: "src/editor/extras/ExtrasDialog.tsx", symbols: ["ExtrasDialog", "TABS"], role: "The three active Extras sections." },
            { path: "src/schema/extras.ts", symbols: ["ExtrasSchema", "MenuItemSchema", "DesktopWidgetSchema", "ContextItemSchema"], role: "The three saved pack-extra types." },
            { path: "src/compiler/compile.ts", symbols: ["extrasPayload", "extrasAreEmpty"], role: "Pack-extra export and empty-project behavior." },
        ],
    },
    "public/manual/guides.html#menu-entry": {
        sources: [
            { path: "src/editor/extras/ExtrasDialog.tsx", symbols: ["ActionFields", "Start menu", "New menu entry"], role: "Start-menu entry controls." },
            { path: "src/schema/extras.ts", symbols: ["MenuItemSchema", "ExtraActionSchema"], role: "Entry fields and available actions." },
            { path: "src/compiler/compile.ts", symbols: ["extrasPayload"], role: "Exported start-menu entry." },
        ],
    },
    "public/manual/guides.html#desktop-widget": {
        sources: [
            { path: "src/editor/extras/ExtrasDialog.tsx", symbols: ["WidgetEditorDialog", "Edit what it looks like"], role: "Widget dimensions, position, opacity and page editor." },
            { path: "src/schema/extras.ts", symbols: ["DesktopWidgetSchema"], role: "Saved widget fields." },
            { path: "src/compiler/widgetHtml.ts", symbols: ["widgetPayload", "widgetHtml", "widgetPath"], role: "Widget registration and exported page." },
            { path: "src/compiler/compile.ts", symbols: ["widgetHtml", "desktop widget"], role: "Widget files included in export." },
        ],
    },
    "public/manual/guides.html#right-click-entry": {
        sources: [
            { path: "src/editor/extras/ExtrasDialog.tsx", symbols: ["TARGET_LABELS", "Right-click"], role: "Right-click entry controls and target choices." },
            { path: "src/schema/extras.ts", symbols: ["ContextItemSchema", "CONTEXT_TARGETS"], role: "Supported right-click locations." },
            { path: "src/compiler/compile.ts", symbols: ["extrasPayload"], role: "Exported right-click entries." },
        ],
    },
    "public/manual/guides.html#translated-words": {
        status: "limitation",
        sources: [
            { path: "src/editor/extras/ExtrasDialog.tsx", symbols: ["Localization is PARKED", "// { id: \"text\", label: \"Text & languages\" }"], role: "The language-editing tab is deliberately not available in the UI." },
            { path: "src/schema/extras.ts", symbols: ["TranslationsSchema", "GAME_LANGUAGES"], role: "Translation data types exist, but are not a supported authoring screen." },
            { path: "src/compiler/compile.ts", symbols: ["translationsAreEmpty", "translations"], role: "The compiler can carry translation data that is already present." },
        ],
        reviewNote: "The section documents a missing editor workflow. Do not describe the translation table or tell readers to enter translation tokens as a shipped feature.",
    },
    "public/manual/guides.html#extras-handbook": {
        sources: [
            { path: "src/editor/extras/ExtrasDialog.tsx", symbols: ["ActionFields", "HANDBOOK_ARTICLES", "handbookCategory"], role: "The handbook action's page and category controls." },
            { path: "src/compiler/runtimeSource.ts", symbols: ["Handbook.open", "the game lands on its own landing page"], role: "The current game-facing result and log message." },
            { path: "src/compiler/compile.ts", symbols: ["warnHandbook"], role: "Warnings for a blank handbook article." },
        ],
        reviewNote: "The game behavior was checked separately; the page field does not guarantee deep-link navigation in the current game build.",
    },
    "public/manual/guides.html#generate-tags": {
        sources: [
            { path: "src/editor/inspector/GenerateButton.tsx", symbols: ["GenerateButton", "Generate a"], role: "The dice button." },
            { path: "src/editor/inspector/Field.tsx", symbols: ["generateField", "listTokenSuggestions"], role: "Generated field values and tag suggestions." },
            { path: "src/lib/generate/index.ts", symbols: ["generateField"], role: "Generated sample values." },
            { path: "src/schema/common.ts", symbols: ["RUNTIME_TOKENS", "TARGET_IP_TOKEN"], role: "Runtime-filled tags." },
            { path: "src/editor/inspector/TokenInsert.tsx", symbols: ["TokenTextInput"], role: "The sparkle button that inserts a tag." },
        ],
    },
};
