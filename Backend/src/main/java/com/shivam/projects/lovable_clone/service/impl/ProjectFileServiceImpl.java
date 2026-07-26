package com.shivam.projects.lovable_clone.service.impl;

import com.shivam.projects.lovable_clone.dto.project.FileContentResponse;
import com.shivam.projects.lovable_clone.dto.project.FileNode;
import com.shivam.projects.lovable_clone.dto.project.FileTreeResponse;
import com.shivam.projects.lovable_clone.entity.Project;
import com.shivam.projects.lovable_clone.entity.ProjectFile;
import com.shivam.projects.lovable_clone.error.ResourceNotFoundException;
import com.shivam.projects.lovable_clone.mapper.ProjectFileMapper;
import com.shivam.projects.lovable_clone.repository.ProjectFileRepository;
import com.shivam.projects.lovable_clone.repository.ProjectRepository;
import com.shivam.projects.lovable_clone.service.ProjectFileService;
import io.minio.BucketExistsArgs;
import io.minio.GetObjectArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.net.URLConnection;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
@Slf4j
@RequiredArgsConstructor
public class ProjectFileServiceImpl implements ProjectFileService {

    private final ProjectRepository projectRepository;
    private final ProjectFileRepository projectFileRepository;
    private final MinioClient minioClient;
    private final ProjectFileMapper projectFileMapper;

    @Value("${minio.project-bucket}")
    private String projectBucket;

    private static final String BUCKET_NAME = "projects";


    @Override
    public FileTreeResponse getFileTree(Long projectId) {
        List<ProjectFile> projectFileList = projectFileRepository.findByProjectId(projectId);
        List<FileNode> projectFileNodes = projectFileMapper.toListOfFileNode(projectFileList);
        return new FileTreeResponse(projectFileNodes);
    }

    @Override
    public FileContentResponse getFileContent(Long projectId, String path) {
        String cleanPath = path.startsWith("/") ? path.substring(1) : path;
        String objectName = projectId + "/" + cleanPath;
        try (
                InputStream is = minioClient.getObject(
                        GetObjectArgs.builder()
                                .bucket(projectBucket)
                                .object(objectName)
                                .build())) {

            String content = new String(is.readAllBytes(), StandardCharsets.UTF_8);
            if (!content.contains("\n") && content.contains("\\n")) {
                content = content.replace("\\n", "\n").replace("\\r", "").replace("\\t", "\t");
            }
            return new FileContentResponse(cleanPath, content);
        } catch (Exception e) {
            log.error("Failed to read file: {}/{}", projectId, cleanPath, e);
            throw new RuntimeException("Failed to read file content", e);
        }
    }

    @Override
    public void saveFile(Long projectId, String path, String content) {
        Project project = projectRepository.findById(projectId).orElseThrow(
                () -> new ResourceNotFoundException("Project", projectId.toString())
        );

        String cleanPath = path.startsWith("/") ? path.substring(1) : path;
        String objectKey = projectId + "/" + cleanPath;

        if (content != null && !content.contains("\n") && content.contains("\\n")) {
            content = content.replace("\\n", "\n").replace("\\r", "").replace("\\t", "\t");
        }

        try {
            byte[] contentBytes = content == null ? new byte[0] : content.getBytes(StandardCharsets.UTF_8);
            InputStream inputStream = new ByteArrayInputStream(contentBytes);

            boolean exists = minioClient.bucketExists(BucketExistsArgs.builder().bucket(projectBucket).build());
            if (!exists) {
                minioClient.makeBucket(MakeBucketArgs.builder().bucket(projectBucket).build());
            }

            // saving the file content
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(projectBucket)
                            .object(objectKey)
                            .stream(inputStream, contentBytes.length, -1)
                            .contentType(determineContentType(path))
                            .build());

            // Saving the metaData
            ProjectFile file = projectFileRepository.findByProjectIdAndPath(projectId, cleanPath)
                    .orElseGet(() -> ProjectFile.builder()
                            .project(project)
                            .path(cleanPath)
                            .minioObjectKey(objectKey) // Use the key we generated
                            .createdAt(Instant.now())
                            .build());

            file.setUpdatedAt(Instant.now());
            projectFileRepository.save(file);
            log.info("Saved file: {}", objectKey);
        } catch (Exception e) {
            log.error("Failed to save file {}/{}", projectId, cleanPath, e);
            throw new RuntimeException("File save failed", e);
        }

    }

    @Override
    public byte[] downloadProjectZip(Long projectId) {
        try (var output = new java.io.ByteArrayOutputStream(); var zip = new ZipOutputStream(output)) {
            List<ProjectFile> files = projectFileRepository.findByProjectId(projectId).stream()
                    .sorted(Comparator.comparing(ProjectFile::getPath))
                    .toList();

            for (ProjectFile file : files) {
                String path = file.getPath().replace('\\', '/');
                while (path.startsWith("/")) {
                    path = path.substring(1);
                }
                if (path.isBlank() || path.contains("../")) {
                    throw new IllegalStateException("Invalid project file path: " + path);
                }

                zip.putNextEntry(new ZipEntry(path));
                try (InputStream input = minioClient.getObject(GetObjectArgs.builder()
                        .bucket(projectBucket)
                        .object(file.getMinioObjectKey())
                        .build())) {
                    input.transferTo(zip);
                }
                zip.closeEntry();
            }

            zip.finish();
            return output.toByteArray();
        } catch (Exception e) {
            log.error("Failed to create download archive for project {}", projectId, e);
            throw new RuntimeException("Failed to create project archive", e);
        }
    }

    private String determineContentType(String path) {
        String type = URLConnection.guessContentTypeFromName(path);
        if (type != null) return type;
        if (path.endsWith(".jsx") || path.endsWith(".ts") || path.endsWith(".tsx")) return "text/javascript";
        if (path.endsWith(".json")) return "application/json";
        if (path.endsWith(".css")) return "text/css";

        return "text/plain";
    }
}
