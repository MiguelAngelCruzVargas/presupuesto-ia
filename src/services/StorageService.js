/**
 * StorageService
 * Handles local persistence of projects using LocalStorage
 */

import { generateId } from '../utils/helpers';

const STORAGE_KEY = 'presupuesto_ia_projects';

export class StorageService {
    /**
     * Save a project to local storage
     * @param {Object} projectData - Full project data
     * @returns {Object} - Saved project metadata
     */
    static saveProject(projectData) {
        try {
            const projects = this.getAllProjects();
            const now = new Date().toISOString();

            const projectToSave = {
                ...projectData,
                id: projectData.id || generateId(),
                lastModified: now,
                createdAt: projectData.createdAt || now
            };

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
            return projects.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
        } catch (error) {
            console.error('Error loading projects:', error);
            return [];
        }
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
