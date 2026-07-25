import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Loader2, RefreshCw, Globe, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, FileNode } from "@/lib/api";
import { RuntimeErrorAlert, RuntimeError } from "@/components/RuntimeErrorAlert";
import { SandpackProvider, SandpackPreview, useSandpack } from "@codesandbox/sandpack-react";

interface PreviewPanelProps {
  projectId: string;
  updatedFiles?: Map<string, string>;
  refreshTrigger?: number;
  runtimeError: RuntimeError | null;
  onDismiss: () => void;
  onFix: (error: RuntimeError) => void;
  onReportError?: (error: RuntimeError) => void;
}

function flattenFileTree(nodes: FileNode[]): string[] {
  const paths: string[] = [];
  for (const node of nodes) {
    if (node.type === "file") {
      paths.push(node.path);
    } else if (node.children) {
      paths.push(...flattenFileTree(node.children));
    }
  }
  return paths;
}

function SandpackErrorWatcher({
  onCatchError,
}: {
  onCatchError: (error: { message: string; title?: string }) => void;
}) {
  const { sandpack } = useSandpack();
  const { error } = sandpack;
  const lastReportedErrorRef = useRef<string | null>(null);

  useEffect(() => {
    if (error) {
      const errMsg = typeof error === "string" ? error : error.message || "Compilation failed";
      const errTitle = typeof error === "object" ? error.title : undefined;
      const errorKey = `${errTitle || ""}:${errMsg}`;

      if (lastReportedErrorRef.current !== errorKey) {
        lastReportedErrorRef.current = errorKey;
        onCatchError({ message: errMsg, title: errTitle });
      }
    } else {
      lastReportedErrorRef.current = null;
    }
  }, [error, onCatchError]);

  return null;
}

export function PreviewPanel({
  projectId,
  updatedFiles,
  refreshTrigger = 0,
  runtimeError,
  onDismiss,
  onFix,
}: PreviewPanelProps) {
  const [filesMap, setFilesMap] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [hasRunPreview, setHasRunPreview] = useState(false);
  const [hasPendingUpdates, setHasPendingUpdates] = useState(false);
  const [previewVersion, setPreviewVersion] = useState(0);
  const [capturedError, setCapturedError] = useState<RuntimeError | null>(null);

  const fetchAllFiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const tree = await api.getFiles(projectId);
      const paths = flattenFileTree(tree);

      const fileContents = await Promise.all(
        paths.map(async (path) => {
          try {
            const content = await api.getFileContent(projectId, path);
            return { path, content };
          } catch {
            return { path, content: "" };
          }
        })
      );

      const map: Record<string, string> = {};
      fileContents.forEach(({ path, content }) => {
        if (content) map[path] = content;
      });
      setFilesMap(map);
    } catch (error) {
      console.error("Failed to load preview files:", error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchAllFiles();
  }, [fetchAllFiles]);

  // Auto-clear captured error and recompile Sandpack whenever AI generates/fixes files
  useEffect(() => {
    if (updatedFiles && updatedFiles.size > 0) {
      setCapturedError(null);
      onDismiss();
      if (hasRunPreview) {
        setHasPendingUpdates(false);
        setPreviewVersion((prev) => prev + 1);
      }
    }
  }, [updatedFiles, refreshTrigger]);

  const handleRunPreview = () => {
    setHasRunPreview(true);
    setHasPendingUpdates(false);
    setCapturedError(null);
    onDismiss();
    setPreviewVersion((prev) => prev + 1);
    fetchAllFiles();
  };

  const handleSandboxError = useCallback((err: { message: string; title?: string }) => {
    const errorObj: RuntimeError = {
      message: String(err.message || "Sandbox Error"),
      source: "Sandbox Error",
      filename: err.title || "Preview",
    };
    setCapturedError(errorObj);
  }, []);

  const activeError = runtimeError || capturedError;

  const sandpackFiles = useMemo(() => {
    const combined: Record<string, { code: string }> = {};

    // 1. Add files fetched from backend
    Object.entries(filesMap).forEach(([path, content]) => {
      const formattedKey = path.startsWith("/") ? path : `/${path}`;
      combined[formattedKey] = { code: content };
    });

    // 2. Overlay live streaming updatedFiles from AI chat
    if (updatedFiles) {
      updatedFiles.forEach((content, path) => {
        const formattedKey = path.startsWith("/") ? path : `/${path}`;
        combined[formattedKey] = { code: content };
      });
    }

    // 3. Guarantee Tailwind CDN in every html file
    const htmlKeys = Object.keys(combined).filter((k) => k.endsWith(".html"));
    if (htmlKeys.length === 0) {
      combined["/index.html"] = {
        code: `<!doctype html>
<html lang="en" style="height: 100%; width: 100%; margin: 0; padding: 0;">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Preview</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      html, body, #root {
        height: 100% !important;
        min-height: 100vh !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
      }
    </style>
  </head>
  <body style="height: 100%; width: 100%; margin: 0; padding: 0;">
    <div id="root" style="height: 100%; width: 100%;"></div>
  </body>
</html>`,
      };
    } else {
      htmlKeys.forEach((key) => {
        let htmlCode = combined[key].code;
        if (!htmlCode.includes("cdn.tailwindcss.com")) {
          if (htmlCode.includes("</head>")) {
            htmlCode = htmlCode.replace("</head>", '  <script src="https://cdn.tailwindcss.com"></script>\n  </head>');
          } else {
            htmlCode = `<script src="https://cdn.tailwindcss.com"></script>\n` + htmlCode;
          }
          combined[key].code = htmlCode;
        }
      });
    }

    // 4. Ensure index.css exists with Tailwind import fallback
    const cssKeys = Object.keys(combined).filter((k) => k.endsWith("index.css"));
    if (cssKeys.length === 0) {
      combined["/src/index.css"] = {
        code: `@import url('https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css');\n@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\nhtml, body, #root {\n  height: 100%;\n  min-height: 100vh;\n  width: 100%;\n  margin: 0;\n  padding: 0;\n}`,
      };
    } else {
      cssKeys.forEach((key) => {
        let cssCode = combined[key].code;
        if (!cssCode.includes("tailwindcss") && !cssCode.includes("tailwind.min.css")) {
          cssCode = `@import url('https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css');\n` + cssCode;
          combined[key].code = cssCode;
        }
      });
    }

    // 5. Fix common AI icon mismatch errors (e.g. Delete -> Trash2 in lucide-react)
    Object.keys(combined).forEach((key) => {
      if (key.endsWith(".tsx") || key.endsWith(".jsx") || key.endsWith(".js") || key.endsWith(".ts")) {
        let code = combined[key].code;
        if (code.includes("from 'lucide-react'") || code.includes('from "lucide-react"')) {
          code = code.replace(/\bDelete\b/g, "Trash2");
          combined[key].code = code;
        }
      }
    });

    // 6. Auto-format raw JSX snippets into valid React components if export/function is missing
    Object.keys(combined).forEach((key) => {
      if (key.endsWith(".tsx") || key.endsWith(".jsx") || key.endsWith(".js") || key.endsWith(".ts")) {
        let code = combined[key].code.trim();

        if (!code.includes("export default") && !code.includes("export function") && !code.includes("function ") && !code.includes("const ") && !code.includes("class ")) {
          const fileBasename = key.split("/").pop()?.replace(/\.(jsx|tsx|js|ts)$/, "") || "App";
          const compName = fileBasename.charAt(0).toUpperCase() + fileBasename.slice(1);
          code = `import React from 'react';\n\nexport default function ${compName}() {\n  return (\n${code}\n  );\n}`;
          combined[key].code = code;
        }
      }
    });

    // 7. Robust export reconciler: guarantee BOTH default and named exports exist for all components
    Object.keys(combined).forEach((key) => {
      if (key.endsWith(".tsx") || key.endsWith(".jsx") || key.endsWith(".js") || key.endsWith(".ts")) {
        let code = combined[key].code;

        const compNameMatch =
          code.match(/(?:export\s+(?:default\s+)?)?(?:function|const|class)\s+([A-Z][a-zA-Z0-9_]*)/) ||
          code.match(/export\s+default\s+([A-Z][a-zA-Z0-9_]*)/);

        if (compNameMatch) {
          const compName = compNameMatch[1];
          if (!code.includes("export default")) {
            code += `\n\nexport default ${compName};`;
          }
          if (!new RegExp(`export\\s+{[^}]*\\b${compName}\\b`).test(code) && !code.includes(`export { ${compName} }`)) {
            code += `\nexport { ${compName} };`;
          }
          combined[key].code = code;
        }
      }
    });

    // 8. Auto-fix missing component imports in JSX files (e.g. <Header /> without import Header)
    Object.keys(combined).forEach((key) => {
      if (key.endsWith(".tsx") || key.endsWith(".jsx") || key.endsWith(".js") || key.endsWith(".ts")) {
        let code = combined[key].code;
        const jsxTagMatches = [...code.matchAll(/<([A-Z][a-zA-Z0-9_]*)\b/g)];
        const missingImports: string[] = [];

        jsxTagMatches.forEach((m) => {
          const compName = m[1];
          const matchingCompPath = Object.keys(combined).find(
            (k) => k.includes(`/src/components/${compName}.`) || k.includes(`src/components/${compName}.`)
          );

          if (matchingCompPath) {
            const hasImport = new RegExp(`import\\s+${compName}\\b|import\\s+{[^}]*\\b${compName}\\b`).test(code);
            if (!hasImport) {
              const relPath = matchingCompPath.startsWith("/src/")
                ? matchingCompPath.replace("/src/", "./")
                : matchingCompPath.replace("src/", "./");
              const cleanRelPath = relPath.replace(/\.(jsx|tsx|js|ts)$/, "");
              missingImports.push(`import ${compName} from '${cleanRelPath}';`);
            }
          }
        });

        if (missingImports.length > 0) {
          const uniqueImports = [...new Set(missingImports)].join("\n");
          combined[key].code = `${uniqueImports}\n${code}`;
        }
      }
    });

    // 9. Check for components in src/components/
    const componentFiles = Object.keys(combined).filter(
      (k) => k.includes("/src/components/") && (k.endsWith(".jsx") || k.endsWith(".tsx"))
    );

    const hasApp = combined["/src/App.tsx"] || combined["src/App.tsx"] || combined["/src/App.jsx"] || combined["src/App.jsx"];
    
    if (!hasApp && componentFiles.length === 0) {
      combined["/src/App.tsx"] = {
        code: `import React from 'react';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
      <h1 className="text-3xl font-bold">React App</h1>
    </div>
  );
}`,
      };
    }

    // 10. Sandpack entry point index.tsx
    const hasIndexFile = combined["/src/index.tsx"] || combined["src/index.tsx"] || combined["/src/index.jsx"] || combined["src/index.jsx"] || combined["/src/index.js"] || combined["src/index.js"];

    if (!hasIndexFile) {
      const hasAppJsx = !!(combined["/src/App.jsx"] || combined["src/App.jsx"]);
      const appImportPath = hasAppJsx ? "./App.jsx" : "./App";
      combined["/src/index.tsx"] = {
        code: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '${appImportPath}';
import './index.css';

const rootEl = document.getElementById('root');
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}`,
      };
    }

    return combined;
  }, [filesMap, updatedFiles]);

  return (
    <div className="flex flex-col h-full w-full bg-background relative overflow-hidden">
      {/* CSS Overrides for 100% Full-Height Sandpack Preview */}
      <style>{`
        .sp-wrapper, .sp-layout, .sp-preview, .sp-preview-container, .sp-preview-iframe, iframe {
          height: 100% !important;
          min-height: 100% !important;
          width: 100% !important;
          display: flex !important;
          flex-direction: column !important;
          flex: 1 !important;
          border: none !important;
        }
      `}</style>

      {/* URL / Toolbar */}
      <div className="h-12 shrink-0 flex items-center justify-between gap-2 px-3 border-b border-border/50 bg-panel">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex-1 flex items-center h-8 px-3 rounded-md bg-muted/50 text-sm text-muted-foreground max-w-md">
            <Globe className="w-3.5 h-3.5 mr-2 shrink-0 text-emerald-400" />
            <span className="truncate text-xs font-mono">
              {hasRunPreview ? "In-Browser Sandbox (Running)" : "Click 'Run Preview' to launch"}
            </span>
          </div>

          {hasPendingUpdates && hasRunPreview && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse">
              Code updated
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {hasRunPreview && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRunPreview}
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              title="Refresh Preview"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          )}

          <Button
            onClick={handleRunPreview}
            size="sm"
            className={`h-7 px-3 text-xs font-medium transition-all ${
              hasPendingUpdates
                ? "bg-amber-500 hover:bg-amber-600 text-black font-semibold shadow-lg shadow-amber-500/20"
                : "bg-primary hover:bg-primary/90 text-primary-foreground"
            }`}
          >
            <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
            {hasRunPreview ? (hasPendingUpdates ? "Update Preview" : "Re-run Preview") : "Run Preview"}
          </Button>
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 h-full w-full bg-[#1a1a1a] relative overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
            <p className="text-sm text-muted-foreground">Loading workspace files...</p>
          </div>
        ) : !hasRunPreview ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 shadow-xl">
              <Globe className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">Preview Ready</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-6">
              Click <span className="font-semibold text-foreground">Run Preview</span> above to compile and view your application in the live sandbox.
            </p>
            <Button onClick={handleRunPreview} size="default" className="bg-primary hover:bg-primary/90 text-primary-foreground px-6">
              <Play className="w-4 h-4 mr-2 fill-current" /> Run Preview
            </Button>
          </div>
        ) : (
          <SandpackProvider
            key={`${projectId}-${previewVersion}`}
            template="react-ts"
            files={sandpackFiles}
            customSetup={{
              dependencies: {
                "lucide-react": "^0.469.0",
                "clsx": "^2.1.1",
                "tailwind-merge": "^2.6.0",
                "class-variance-authority": "^0.7.1",
                "react-router-dom": "^6.30.0",
              },
            }}
            theme="dark"
            options={{
              recompileMode: "immediate",
              recompileDelay: 300,
            }}
            className="h-full w-full flex-1 flex flex-col"
          >
            <SandpackErrorWatcher onCatchError={handleSandboxError} />
            <SandpackPreview
              style={{ height: "100%", width: "100%", flex: 1 }}
              className="h-full w-full flex-1"
              showRefreshButton={false}
              showOpenInCodeSandbox={false}
              showRestartButton={false}
            />
          </SandpackProvider>
        )}
      </div>

      {/* Error Alert Overlay */}
      <RuntimeErrorAlert
        error={activeError}
        onDismiss={() => {
          setCapturedError(null);
          onDismiss();
        }}
        onFix={(err) => {
          setCapturedError(null);
          onFix(err);
        }}
      />
    </div>
  );
}
