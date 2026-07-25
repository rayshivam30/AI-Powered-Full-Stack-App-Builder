package com.shivam.projects.lovable_clone.service.impl;

import com.shivam.projects.lovable_clone.dto.project.PreviewResponse;
import com.shivam.projects.lovable_clone.service.PreviewService;
import com.shivam.projects.lovable_clone.service.ProjectFileService;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Duration;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Service
@RequiredArgsConstructor
@Slf4j
public class DockerPreviewService implements PreviewService {

    private static final Duration COMMAND_TIMEOUT = Duration.ofMinutes(5);
    private static final Pattern PORT_PATTERN = Pattern.compile(":(\\d+)$");
    private static final String DOCKERFILE = """
            FROM node:22-alpine AS build
            WORKDIR /app
            COPY package*.json ./
            RUN npm install --ignore-scripts
            COPY . .
            RUN npm run build

            FROM nginxinc/nginx-unprivileged:1.27-alpine
            COPY --from=build /app/dist /usr/share/nginx/html
            EXPOSE 8080
            """;

    private final ProjectFileService projectFileService;
    private final Set<String> runningContainers = ConcurrentHashMap.newKeySet();

    @Value("${preview.docker.command:docker}")
    private String dockerCommand;

    @Value("${preview.docker.host:127.0.0.1}")
    private String previewHost;

    @Override
    public synchronized PreviewResponse deploy(Long projectId) {
        String containerName = "lovable-preview-" + projectId;
        String imageName = containerName + ":latest";
        Path context = null;
        try {
            context = Files.createTempDirectory("lovable-preview-" + projectId + "-");
            extractProject(projectFileService.downloadProjectZip(projectId), context);
            ensureBaseFiles(context);
            Files.writeString(context.resolve("Dockerfile"), DOCKERFILE, StandardCharsets.UTF_8);
            run(false, "rm", "-f", containerName);
            run(true, "build", "--tag", imageName, context.toString());
            run(true, "run", "--detach", "--rm", "--name", containerName,
                    "--publish", previewHost + "::8080", "--network", "none", "--read-only",
                    "--tmpfs", "/tmp", "--tmpfs", "/var/cache/nginx", "--cap-drop", "ALL",
                    "--security-opt", "no-new-privileges", "--pids-limit", "128", "--memory", "256m",
                    "--cpus", "1", imageName);
            String port = run(true, "port", containerName, "8080/tcp").trim();
            Matcher matcher = PORT_PATTERN.matcher(port);
            if (!matcher.find()) throw new IllegalStateException("Docker did not return a preview port: " + port);
            runningContainers.add(containerName);
            return new PreviewResponse(URI.create("http://localhost:" + matcher.group(1)).toString());
        } catch (Exception ex) {
            log.error("Preview deployment failed for project {}: {}", projectId, ex.getMessage(), ex);
            run(false, "rm", "-f", containerName);
            throw new IllegalStateException("Deployment failed: " + ex.getMessage(), ex);
        } finally {
            deleteDirectory(context);
        }
    }

    @PreDestroy
    void stopPreviews() {
        runningContainers.forEach(container -> run(false, "rm", "-f", container));
    }

    private void extractProject(byte[] archive, Path target) throws IOException {
        try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(archive))) {
            for (ZipEntry entry; (entry = zip.getNextEntry()) != null; ) {
                Path output = target.resolve(entry.getName()).normalize();
                if (!output.startsWith(target) || entry.isDirectory()) continue;
                Files.createDirectories(output.getParent());
                Files.copy(zip, output, StandardCopyOption.REPLACE_EXISTING);
            }
        }
    }

    private String run(boolean required, String... arguments) {
        try {
            String[] command = new String[arguments.length + 1];
            command[0] = dockerCommand;
            System.arraycopy(arguments, 0, command, 1, arguments.length);
            Process process = new ProcessBuilder(command).redirectErrorStream(true).start();
            String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8).trim();
            if (!process.waitFor(COMMAND_TIMEOUT.toSeconds(), TimeUnit.SECONDS)) {
                process.destroyForcibly();
                throw new IllegalStateException("Docker command timed out");
            }
            if (required && process.exitValue() != 0) throw new IllegalStateException(output);
            return output;
        } catch (IOException ex) {
            if (required) throw new IllegalStateException("Docker command failed", ex);
            log.debug("Docker cleanup command failed", ex);
            return "";
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Docker command interrupted", ex);
        }
    }

    private void ensureBaseFiles(Path context) throws IOException {
        Path packageJson = context.resolve("package.json");
        if (!Files.exists(packageJson)) {
            Files.writeString(packageJson, """
                    {
                      "name": "react-app",
                      "private": true,
                      "version": "0.0.0",
                      "type": "module",
                      "scripts": {
                        "dev": "vite",
                        "build": "vite build",
                        "preview": "vite preview"
                      },
                      "dependencies": {
                        "react": "^18.3.1",
                        "react-dom": "^18.3.1",
                        "lucide-react": "^0.469.0",
                        "clsx": "^2.1.1",
                        "tailwind-merge": "^2.6.0"
                      },
                      "devDependencies": {
                        "@types/react": "^18.3.18",
                        "@types/react-dom": "^18.3.5",
                        "@vitejs/plugin-react": "^4.3.4",
                        "autoprefixer": "^10.4.20",
                        "postcss": "^8.4.49",
                        "tailwindcss": "^3.4.17",
                        "typescript": "~5.6.2",
                        "vite": "^6.0.5"
                      }
                    }
                    """, StandardCharsets.UTF_8);
        }

        Path indexHtml = context.resolve("index.html");
        if (!Files.exists(indexHtml)) {
            Files.writeString(indexHtml, """
                    <!doctype html>
                    <html lang="en">
                      <head>
                        <meta charset="UTF-8" />
                        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                        <title>React App</title>
                      </head>
                      <body>
                        <div id="root"></div>
                        <script type="module" src="/src/main.tsx"></script>
                      </body>
                    </html>
                    """, StandardCharsets.UTF_8);
        }

        Path viteConfig = context.resolve("vite.config.ts");
        if (!Files.exists(viteConfig) && !Files.exists(context.resolve("vite.config.js"))) {
            Files.writeString(viteConfig, """
                    import { defineConfig } from 'vite'
                    import react from '@vitejs/plugin-react'

                    export default defineConfig({
                      plugins: [react()],
                    })
                    """, StandardCharsets.UTF_8);
        }
    }

    private void deleteDirectory(Path directory) {
        if (directory == null) return;
        try (var paths = Files.walk(directory)) {
            paths.sorted((left, right) -> right.compareTo(left)).forEach(path -> {
                try { Files.deleteIfExists(path); }
                catch (IOException ex) { log.warn("Could not remove temporary preview file {}", path, ex); }
            });
        } catch (IOException ex) {
            log.warn("Could not remove temporary preview directory {}", directory, ex);
        }
    }
}
