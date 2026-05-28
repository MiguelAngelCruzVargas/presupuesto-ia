/**
 * StorageService
 * Handles local persistence of projects using LocalStorage
 */

import { generateId } from '../utils/helpers';
import { APP_CONFIG, createDefaultProjectInfo } from '../config/appConfig';

const STORAGE_KEY = 'presupuesto_ia_projects';

export class StorageService {
    static normalizeProject(projectData) {
        const now = new Date().toISOString();
        const id = projectData.id || projectData.projectInfo?.id || generateId();
        const projectInfo = createDefaultProjectInfo({
            id,
            project: projectData.projectInfo?.project || projectData.project || 'Sin Nombre',
            client: projectData.projectInfo?.client || projectData.client || '',
            location: projectData.projectInfo?.location || projectData.location || APP_CONFIG.defaultCountry,
            ...projectData.projectInfo
        });

        return {
            ...projectData,
            id,
            projectInfo,
            project: projectInfo.project,
            client: projectInfo.client,
            location: projectInfo.location,
            items: projectData.items || [],
            lastModified: projectData.lastModified || now,
            createdAt: projectData.createdAt || now
        };
    }

    static toProjectListItem(projectData) {
        const normalized = this.normalizeProject(projectData);
        const items = normalized.items || [];
        const total = items.reduce((sum, item) => {
            return sum + ((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0));
        }, 0);

        return {
            ...normalized,
            project: normalized.projectInfo?.project || 'Sin Nombre',
            client: normalized.projectInfo?.client || 'Sin Cliente',
            type: normalized.projectInfo?.type || APP_CONFIG.defaultProjectType,
            location: normalized.projectInfo?.location || APP_CONFIG.defaultCountry,
            lastModified: normalized.lastModified,
            total
        };
    }

    /**
     * Save a project to local storage
     * @param {Object} projectData - Full project data
     * @returns {Object} - Saved project metadata
     */
    static saveProject(projectData) {
        try {
            const projects = this.getAllProjects();
            const now = new Date().toISOString();

            const projectToSave = this.normalizeProject({
                ...projectData,
                lastModified: now,
                createdAt: projectData.createdAt || now
            });

            // Check if exists to update, or add new
            const index = projects.findIndex(p => p.id === projectToSave.id);
            if (index >= 0) {
                projects[index] = projectToSave;
            } else {
                projects.push(projectToSave);
            }

            localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
            return projectToSave;
        } catch (error) {
            console.error('Error saving project:', error);
            throw new Error('No se pudo guardar el proyecto. Es posible que el almacenamiento esté lleno.');
        }
    }

    /**
     * Get all projects (metadata only ideally, but localstorage loads all)
     * @returns {Array} - List of projects sorted by date
     */
    static getAllProjects() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            if (!data) return [];
            const projects = JSON.parse(data);
            return projects
                .map(project => this.normalizeProject(project))
                .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
        } catch (error) {
            console.error('Error loading projects:', error);
            return [];
        }
    }

    static listProjects() {
        return this.getAllProjects().map(project => this.toProjectListItem(project));
    }

    /**
     * Get a specific project by ID
     * @param {string} id 
     * @returns {Object|null}
     */
    static getProject(id) {
        const projects = this.getAllProjects();
        return projects.find(p => p.id === id) || null;
    }

    static updateProjectName(id, newName) {
        if (!id || !newName) {
            throw new Error('Project ID and new name are required');
        }

        const projects = this.getAllProjects();
        const index = projects.findIndex(project => project.id === id);
        if (index === -1) {
            throw new Error('Proyecto no encontrado');
        }

        const project = this.normalizeProject(projects[index]);
        project.projectInfo = {
            ...project.projectInfo,
            project: newName
        };
        project.project = newName;
        project.lastModified = new Date().toISOString();
        projects[index] = project;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));

        return project;
    }

    /**
     * Delete a project by ID
     * @param {string} id 
     */
    static deleteProject(id) {
        const projects = this.getAllProjects();
        const filtered = projects.filter(p => p.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    }
}

export default StorageService;
