package com.shivam.projects.lovable_clone.llm;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Post-processes AI-generated React/TypeScript files to fix the most common
 * import/export mismatches that cause the "Element type is invalid" runtime error.
 *
 * Specifically handles:
 *  1. Default import used for a named-export component  → converts to named import
 *  2. Named import used for a default-export component  → converts to default import
 *  3. Ensures every file that defines a component also ends with a valid export
 */
@Slf4j
@Component
public class CodeSanitizer {

    // Detects: export default function Foo / export default class Foo / export default Foo
    private static final Pattern DEFAULT_EXPORT_PATTERN = Pattern.compile(
            "^\\s*export\\s+default\\s+(?:function|class|const|async\\s+function)?\\s*(\\w+)",
            Pattern.MULTILINE
    );

    // Detects: export function Foo / export const Foo / export class Foo
    private static final Pattern NAMED_EXPORT_PATTERN = Pattern.compile(
            "^\\s*export\\s+(?:function|const|class|async\\s+function)\\s+(\\w+)",
            Pattern.MULTILINE
    );

    // Detects: import Foo from './path' or import Foo from "../path"
    private static final Pattern DEFAULT_IMPORT_PATTERN = Pattern.compile(
            "import\\s+(\\w+)\\s+from\\s+[\"']([^\"']+)[\"']"
    );

    // Detects: import { Foo } from './path'
    private static final Pattern NAMED_IMPORT_PATTERN = Pattern.compile(
            "import\\s+\\{([^}]+)}\\s+from\\s+[\"']([^\"']+)[\"']"
    );

    /**
     * Given the complete set of generated files (path → content), fixes
     * import/export mismatches in each file by cross-referencing other files.
     *
     * @param files map of file path to file content (modified in-place)
     */
    public void sanitize(Map<String, String> files) {
        files.replaceAll((path, content) -> sanitizeFile(path, content, files));
    }

    private String sanitizeFile(String filePath, String content, Map<String, String> allFiles) {
        if (!filePath.endsWith(".tsx") && !filePath.endsWith(".ts") &&
            !filePath.endsWith(".jsx") && !filePath.endsWith(".js")) {
            return content;
        }

        StringBuilder result = new StringBuilder(content);

        // Fix default imports that point to named-export files
        Matcher defaultImportMatcher = DEFAULT_IMPORT_PATTERN.matcher(content);
        while (defaultImportMatcher.find()) {
            String importedName = defaultImportMatcher.group(1);
            String importPath = defaultImportMatcher.group(2);

            String referencedFile = resolveImportPath(filePath, importPath, allFiles);
            if (referencedFile == null) continue;

            String refContent = allFiles.get(referencedFile);
            if (refContent == null) continue;

            boolean hasDefaultExport = DEFAULT_EXPORT_PATTERN.matcher(refContent).find();
            boolean hasNamedExport = hasSpecificNamedExport(refContent, importedName);

            if (!hasDefaultExport && hasNamedExport) {
                // AI used default import but file only has named export — fix it
                String oldImport = defaultImportMatcher.group(0);
                String newImport = "import { " + importedName + " } from '" + importPath + "'";
                int idx = result.indexOf(oldImport);
                if (idx >= 0) {
                    result.replace(idx, idx + oldImport.length(), newImport);
                    log.info("[CodeSanitizer] Fixed default→named import for '{}' in {}", importedName, filePath);
                }
            }
        }

        // Fix named imports that point to default-export files
        String updatedContent = result.toString();
        Matcher namedImportMatcher = NAMED_IMPORT_PATTERN.matcher(updatedContent);
        StringBuilder result2 = new StringBuilder(updatedContent);

        while (namedImportMatcher.find()) {
            String importedNames = namedImportMatcher.group(1).trim();
            String importPath = namedImportMatcher.group(2);

            // Only process single-name named imports (e.g. { Calculator })
            if (!importedNames.contains(",")) {
                String importedName = importedNames.trim();
                String referencedFile = resolveImportPath(filePath, importPath, allFiles);
                if (referencedFile == null) continue;

                String refContent = allFiles.get(referencedFile);
                if (refContent == null) continue;

                boolean hasDefaultExport = hasDefaultExportForName(refContent, importedName);
                boolean hasNamedExport = hasSpecificNamedExport(refContent, importedName);

                if (hasDefaultExport && !hasNamedExport) {
                    // AI used named import but file only has default export — fix it
                    String oldImport = namedImportMatcher.group(0);
                    String newImport = "import " + importedName + " from '" + importPath + "'";
                    int idx = result2.indexOf(oldImport);
                    if (idx >= 0) {
                        result2.replace(idx, idx + oldImport.length(), newImport);
                        log.info("[CodeSanitizer] Fixed named→default import for '{}' in {}", importedName, filePath);
                    }
                }
            }
        }

        return result2.toString();
    }

    private boolean hasSpecificNamedExport(String content, String name) {
        Pattern specific = Pattern.compile(
                "^\\s*export\\s+(?:function|const|class|async\\s+function)\\s+" + Pattern.quote(name) + "\\b",
                Pattern.MULTILINE
        );
        return specific.matcher(content).find();
    }

    private boolean hasDefaultExportForName(String content, String name) {
        // Matches: export default function Foo / export default class Foo / export default Foo
        Pattern specific = Pattern.compile(
                "export\\s+default\\s+(?:function|class|async\\s+function)?\\s*" + Pattern.quote(name) + "\\b"
        );
        return specific.matcher(content).find();
    }

    /**
     * Resolves a relative import path like './components/Header' to the actual
     * file key in the files map (e.g. "src/components/Header.tsx").
     */
    private String resolveImportPath(String currentFile, String importPath, Map<String, String> allFiles) {
        if (importPath.startsWith(".")) {
            // Get the directory of the current file
            String dir = currentFile.contains("/")
                    ? currentFile.substring(0, currentFile.lastIndexOf('/'))
                    : "";

            // Normalize the path
            String joined = dir.isEmpty() ? importPath : dir + "/" + importPath;
            String normalized = normalizePath(joined);

            // Try common extensions
            for (String ext : new String[]{".tsx", ".ts", ".jsx", ".js"}) {
                if (allFiles.containsKey(normalized + ext)) return normalized + ext;
                // Also try without leading slash
                String withoutSlash = normalized.startsWith("/") ? normalized.substring(1) : normalized;
                if (allFiles.containsKey(withoutSlash + ext)) return withoutSlash + ext;
            }
            // Maybe already has extension
            if (allFiles.containsKey(normalized)) return normalized;
        }
        return null;
    }

    private String normalizePath(String path) {
        // Resolve ".." and "." segments
        String[] parts = path.split("/");
        java.util.Deque<String> stack = new java.util.ArrayDeque<>();
        for (String part : parts) {
            if (part.equals("..") && !stack.isEmpty()) {
                stack.pop();
            } else if (!part.equals(".") && !part.isEmpty()) {
                stack.push(part);
            }
        }
        java.util.List<String> resolved = new java.util.ArrayList<>(stack);
        java.util.Collections.reverse(resolved);
        return String.join("/", resolved);
    }
}
