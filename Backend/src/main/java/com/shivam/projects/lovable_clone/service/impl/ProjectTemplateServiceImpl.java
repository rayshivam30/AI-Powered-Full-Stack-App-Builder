package com.shivam.projects.lovable_clone.service.impl;

import com.shivam.projects.lovable_clone.entity.Project;
import com.shivam.projects.lovable_clone.entity.ProjectFile;
import com.shivam.projects.lovable_clone.error.ResourceNotFoundException;
import com.shivam.projects.lovable_clone.repository.ProjectFileRepository;
import com.shivam.projects.lovable_clone.repository.ProjectRepository;
import com.shivam.projects.lovable_clone.service.ProjectFileService;
import com.shivam.projects.lovable_clone.service.ProjectTemplateService;
import io.minio.*;
import io.minio.messages.Item;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RequiredArgsConstructor
@Service
@Slf4j
public class ProjectTemplateServiceImpl implements ProjectTemplateService {

    private final MinioClient minioClient;
    private final ProjectFileRepository projectFileRepository;
    private final ProjectRepository projectRepository;
    private final ProjectFileService projectFileService;

    private static final String TEMPLATE_BUCKET = "starter-projects";
    private static final String TARGET_BUCKET = "projects";
    private static final String TEMPLATE_NAME = "react-vite-tailwind-daisyui-starter";

    @Override
    public void initializeProjectFromTemplate(Long projectId) {
        Project project = projectRepository.findById(projectId).orElseThrow(
                () -> new ResourceNotFoundException("Project", projectId.toString()));

        boolean initialized = false;
        try {
            boolean bucketExists = minioClient.bucketExists(
                    BucketExistsArgs.builder().bucket(TEMPLATE_BUCKET).build()
            );

            if (bucketExists) {
                Iterable<Result<Item>> results = minioClient.listObjects(
                        ListObjectsArgs.builder()
                                .bucket(TEMPLATE_BUCKET)
                                .prefix(TEMPLATE_NAME + "/")
                                .recursive(true)
                                .build()
                );

                List<ProjectFile> filesToSave = new ArrayList<>();
                for (Result<Item> result : results) {
                    Item item = result.get();
                    String sourceKey = item.objectName();
                    String cleanPath = sourceKey.replaceFirst(TEMPLATE_NAME + "/", "");
                    String destKey = projectId + "/" + cleanPath;

                    minioClient.copyObject(
                            CopyObjectArgs.builder()
                                    .bucket(TARGET_BUCKET)
                                    .object(destKey)
                                    .source(
                                            CopySource.builder()
                                                    .bucket(TEMPLATE_BUCKET)
                                                    .object(sourceKey)
                                                    .build()
                                    )
                                    .build()
                    );

                    ProjectFile pf = ProjectFile.builder()
                            .project(project)
                            .path(cleanPath)
                            .minioObjectKey(destKey)
                            .createdAt(Instant.now())
                            .updatedAt(Instant.now())
                            .build();

                    filesToSave.add(pf);
                }

                if (!filesToSave.isEmpty()) {
                    projectFileRepository.saveAll(filesToSave);
                    initialized = true;
                }
            }
        } catch (Exception e) {
            log.warn("Could not copy from MinIO template bucket: {}. Using default starter files.", e.getMessage());
        }

        if (!initialized) {
            log.info("Initializing project {} with fallback React Vite template files.", projectId);
            createDefaultTemplateFiles(projectId);
        }
    }

    private void createDefaultTemplateFiles(Long projectId) {
        Map<String, String> defaultFiles = Map.of(
                "package.json", """
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
                        """,
                "index.html", """
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
                        """,
                "src/main.tsx", """
                        import React from 'react'
                        import ReactDOM from 'react-dom/client'
                        import App from './App.tsx'
                        import './index.css'

                        ReactDOM.createRoot(document.getElementById('root')!).render(
                          <React.StrictMode>
                            <App />
                          </React.StrictMode>,
                        )
                        """,
                "src/App.tsx", """
                        import React from 'react'

                        export default function App() {
                          return (
                            <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
                              <h1 className="text-3xl font-bold">React App</h1>
                            </div>
                          )
                        }
                        """,
                "src/index.css", """
                        @tailwind base;
                        @tailwind components;
                        @tailwind utilities;
                        """,
                "vite.config.ts", """
                        import { defineConfig } from 'vite'
                        import react from '@vitejs/plugin-react'

                        export default defineConfig({
                          plugins: [react()],
                        })
                        """
        );

        defaultFiles.forEach((path, content) -> projectFileService.saveFile(projectId, path, content));
    }
}





















