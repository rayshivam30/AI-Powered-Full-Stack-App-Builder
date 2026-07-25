import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { SandpackProvider, SandpackPreview } from "@codesandbox/sandpack-react";
import { api, FileNode } from "@/lib/api";
import { Loader2, Sparkles } from "lucide-react";

// Helper to flatten file tree
function flattenFileTree(nodes: FileNode[], result: Record<string, string> = {}): Record<string, string> {
  for (const node of nodes) {
    if (node.type === "file") {
      result[node.path] = "";
    } else if (node.children) {
      flattenFileTree(node.children, result);
    }
  }
  return result;
}

export function LiveView() {
  const { projectId } = useParams<{ projectId: string }>();
  const [filesMap, setFilesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    loadProjectFiles();
  }, [projectId]);

  const loadProjectFiles = async () => {
    if (!projectId) return;
    try {
      const tree = await api.getProjectFiles(projectId);
      const emptyPaths = flattenFileTree(tree);
      const paths = Object.keys(emptyPaths);

      const contents = await Promise.all(
        paths.map((p) => api.getFileContent(projectId, p).catch(() => ""))
      );

      const map: Record<string, string> = {};
      paths.forEach((p, idx) => {
        const formattedPath = p.startsWith("/") ? p : `/${p}`;
        map[formattedPath] = contents[idx];
      });

      setFilesMap(map);
    } catch (error) {
      console.error("Failed to load live project files:", error);
    } finally {
      setLoading(false);
    }
  };

  const sandpackFiles = useMemo(() => {
    const combined: Record<string, { code: string }> = {};

    // 1. Add files from backend map
    Object.entries(filesMap).forEach(([path, content]) => {
      const formattedKey = path.startsWith("/") ? path : `/${path}`;
      combined[formattedKey] = { code: content };
    });

    // 2. Guarantee HTML file with Tailwind CDN
    const htmlKeys = Object.keys(combined).filter((k) => k.endsWith(".html"));
    if (htmlKeys.length === 0) {
      combined["/index.html"] = {
        code: `<!doctype html>
<html lang="en" style="height: 100%; width: 100%; margin: 0; padding: 0;">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Live Web Application</title>
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

    // 3. Guarantee CSS file with Tailwind import fallback
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

    // 4. Guarantee App entry component
    const hasApp = combined["/src/App.tsx"] || combined["src/App.tsx"] || combined["/src/App.jsx"] || combined["src/App.jsx"];
    const componentFiles = Object.keys(combined).filter(
      (k) => k.includes("/src/components/") && (k.endsWith(".jsx") || k.endsWith(".tsx"))
    );

    if (!hasApp && componentFiles.length > 0) {
      const firstCompKey = componentFiles[0];
      const compNameMatch = firstCompKey.match(/\/src\/components\/([^/.]+)\.(jsx|tsx)$/);
      const compName = compNameMatch ? compNameMatch[1] : "Component";
      const importPath = `./components/${compName}`;

      combined["/src/App.tsx"] = {
        code: `import React from 'react';
import ${compName} from '${importPath}';

export default function App() {
  return (
    <div className="w-full min-h-screen">
      <${compName} />
    </div>
  );
}`,
      };
    }

    // 5. Guarantee index.tsx entry file mounting App into #root
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
  }, [filesMap]);

  if (loading) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center text-white gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-slate-400 font-medium">Launching live application...</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-background relative flex flex-col">
      <style>{`
        html, body, #root, .sp-wrapper, .sp-layout, .sp-preview, .sp-preview-container, .sp-preview-iframe, iframe {
          height: 100% !important;
          min-height: 100vh !important;
          max-height: 100vh !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          flex: 1 !important;
          border: none !important;
        }
      `}</style>

      <SandpackProvider
        template="react-ts"
        files={sandpackFiles}
        customSetup={{
          dependencies: {
            "react": "^18.3.1",
            "react-dom": "^18.3.1",
            "lucide-react": "^0.469.0",
            "clsx": "^2.1.1",
            "tailwind-merge": "^2.6.0"
          }
        }}
        options={{
          recompileMode: "immediate",
        }}
      >
        <SandpackPreview
          style={{ height: "100vh", width: "100vw", border: "none" }}
          showRefreshButton={false}
          showOpenInCodeSandbox={false}
        />
      </SandpackProvider>

      {/* Floating badge */}
      <div className="fixed bottom-3 right-3 z-50 pointer-events-none">
        <div className="bg-slate-900/90 backdrop-blur-md text-white text-[11px] font-medium px-3 py-1.5 rounded-full border border-slate-700/50 shadow-xl flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-amber-400 fill-current" />
          <span>Published with <strong>Lovable</strong></span>
        </div>
      </div>
    </div>
  );
}
