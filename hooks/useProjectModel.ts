import { useState } from 'react';
import { ProjectData, ProjectVersion, BoundingBox, ProjectMetadata } from '../types';
import { generateId, blobToBase64, base64ToBlob, triggerDownload } from '../utils/fileUtils';
import {
    buildSyncedProject as syncProjectBoxes,
    renameProjectVersion,
    updateProjectMetadata as applyProjectMetadata,
} from '../utils/projectModelUtils';

export const useProjectModel = () => {
    const [project, setProject] = useState<ProjectData | null>(null);
    const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);

    // Derived state for the view
    const [pdfFile, setPdfFile] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);

    // Auto-save State
    const [autoSaveInterval, setAutoSaveInterval] = useState<number>(0);
    const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
    const [autoSaveError, setAutoSaveError] = useState<string | null>(null);

    // --- Helpers ---

    const buildSyncedProject = syncProjectBoxes;

    // --- Actions ---

    const initializeProjectFromPdf = async (file: File) => {
        const base64 = await blobToBase64(file);
        const vId = generateId();

        const newVersion: ProjectVersion = {
            id: vId,
            name: "v1 - Initial",
            createdAt: new Date().toISOString(),
            fileName: file.name,
            pdfData: base64,
            boxes: []
        };

        const newProject: ProjectData = {
            id: generateId(),
            name: file.name.replace('.pdf', ''),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            metadata: {
                client: '',
                documentType: '',
                status: 'Draft',
                reviewer: '',
            },
            versions: [newVersion],
            activeVersionId: vId
        };

        setProject(newProject);
        setLastAutoSave(null);
        setAutoSaveError(null);

        const url = URL.createObjectURL(file);
        setPdfFile(url);
        setFileHandle(null);
    };

    const loadProject = async (data: ProjectData, handle: FileSystemFileHandle | null = null) => {
        const activeVersion = data.versions.find(v => v.id === data.activeVersionId) || data.versions[0];
        if (!activeVersion) throw new Error("Invalid project file: No versions found.");

        if (pdfFile) URL.revokeObjectURL(pdfFile);

        const blob = await base64ToBlob(activeVersion.pdfData);
        const url = URL.createObjectURL(blob);

        setProject(data);
        setPdfFile(url);
        setFileHandle(handle);
        setCurrentPage(1);

        // Caller must sync boxes (setBoxes) after this
        return activeVersion.boxes;
    };

    const switchVersion = async (versionId: string, currentBoxes: BoundingBox[]) => {
        if (!project) return null;

        // 1. Sync current
        const syncedProj = buildSyncedProject(project, currentBoxes);

        // 2. Find target
        const targetVersion = syncedProj.versions.find(v => v.id === versionId);
        if (!targetVersion) return null;

        // 3. Load PDF
        if (pdfFile) URL.revokeObjectURL(pdfFile);
        const blob = await base64ToBlob(targetVersion.pdfData);
        const url = URL.createObjectURL(blob);
        setPdfFile(url);

        // 4. Update Project State
        setProject({
            ...syncedProj,
            activeVersionId: versionId
        });

        setCurrentPage(1);
        return targetVersion.boxes;
    };

    const createNewVersion = async (file: File, currentBoxes: BoundingBox[], shouldCopyTags: boolean) => {
        if (!project) return null;

        const syncedProj = buildSyncedProject(project, currentBoxes);
        const base64 = await blobToBase64(file);
        const vId = generateId();
        const nextVersionNum = syncedProj.versions.length + 1;
        const nextBoxes = shouldCopyTags ? [...currentBoxes] : [];

        const newVersion: ProjectVersion = {
            id: vId,
            name: `v${nextVersionNum} - ${file.name}`,
            createdAt: new Date().toISOString(),
            fileName: file.name,
            pdfData: base64,
            boxes: nextBoxes
        };

        const updatedProject: ProjectData = {
            ...syncedProj,
            versions: [...syncedProj.versions, newVersion],
            activeVersionId: vId,
            updatedAt: new Date().toISOString()
        };

        setProject(updatedProject);

        if (pdfFile) URL.revokeObjectURL(pdfFile);
        const url = URL.createObjectURL(file);
        setPdfFile(url);

        return nextBoxes;
    };

    const saveProject = async (currentBoxes: BoundingBox[], options: { saveAs?: boolean; fileName?: string } = {}) => {
        if (!project) return;
        const updatedProject = buildSyncedProject(project, currentBoxes);

        const jsonString = JSON.stringify(updatedProject, null, 2);
        const downloadName = options.fileName || `${updatedProject.name}_project.json`;

        // @ts-ignore
        const isIframe = window.self !== window.top;

        if (fileHandle && !isIframe && !options.saveAs) {
            setProject(updatedProject);
            try {
                // @ts-ignore
                const writable = await fileHandle.createWritable();
                await writable.write(jsonString);
                await writable.close();
            } catch (err) {
                console.warn("Direct save failed", err);
                triggerDownload(jsonString, downloadName);
            }
        } else {
            triggerDownload(jsonString, downloadName);
        }
    };

    const updateProjectMetadata = (metadata: ProjectMetadata) => {
        setProject(prev => prev ? applyProjectMetadata(prev, metadata) : prev);
    };

    const renameVersion = (versionId: string, name: string) => {
        setProject(prev => prev ? renameProjectVersion(prev, versionId, name) : prev);
    };

    return {
        project,
        setProject,
        fileHandle,
        pdfFile,
        currentPage,
        setCurrentPage,
        initializeProjectFromPdf,
        loadProject,
        switchVersion,
        createNewVersion,
        saveProject,
        updateProjectMetadata,
        renameVersion,
        autoSaveInterval,
        setAutoSaveInterval,
        lastAutoSave,
        setLastAutoSave,
        autoSaveError,
        setAutoSaveError,
        buildSyncedProject // Exposed for external auto-save orchestration
    };
};
