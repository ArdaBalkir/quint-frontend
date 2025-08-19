import type {
  BrainEntry,
  ProjectEntry,
  User,
} from "../interfaces/projectstructure.ts";

/**
 * Lightweight localStorage utility for workspace data
 * Simple get/set methods with type safety and error handling
 */
export const workspaceStorage = {
  // Basic string values
  getBucketName: (): string | null => localStorage.getItem("bucketName"),
  setBucketName: (name: string): void =>
    localStorage.setItem("bucketName", name),

  getAlignment: (): string | null => localStorage.getItem("alignment"),
  setAlignment: (alignment: string): void =>
    localStorage.setItem("alignment", alignment),

  // JSON objects with error handling
  getSelectedBrain: (): (BrainEntry & { project?: string }) | null => {
    try {
      const item = localStorage.getItem("selectedBrain");
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error("Error parsing selectedBrain from localStorage:", error);
      return null;
    }
  },

  setSelectedBrain: (brain: BrainEntry & { project?: string }): void => {
    try {
      localStorage.setItem("selectedBrain", JSON.stringify(brain));
    } catch (error) {
      console.error("Error saving selectedBrain to localStorage:", error);
    }
  },

  getSelectedProject: (): ProjectEntry | null => {
    try {
      const item = localStorage.getItem("selectedProject");
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error("Error parsing selectedProject from localStorage:", error);
      return null;
    }
  },

  setSelectedProject: (project: ProjectEntry): void => {
    try {
      localStorage.setItem("selectedProject", JSON.stringify(project));
    } catch (error) {
      console.error("Error saving selectedProject to localStorage:", error);
    }
  },

  getProjectBrainEntries: (): BrainEntry[] => {
    try {
      const item = localStorage.getItem("projectBrainEntries");
      return item ? JSON.parse(item) : [];
    } catch (error) {
      console.error(
        "Error parsing projectBrainEntries from localStorage:",
        error
      );
      return [];
    }
  },

  setProjectBrainEntries: (entries: BrainEntry[]): void => {
    try {
      localStorage.setItem("projectBrainEntries", JSON.stringify(entries));
    } catch (error) {
      console.error("Error saving projectBrainEntries to localStorage:", error);
    }
  },

  getUserInfo: (): User | null => {
    try {
      const item = localStorage.getItem("userInfo");
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error("Error parsing userInfo from localStorage:", error);
      return null;
    }
  },

  setUserInfo: (user: User): void => {
    try {
      localStorage.setItem("userInfo", JSON.stringify(user));
    } catch (error) {
      console.error("Error saving userInfo to localStorage:", error);
    }
  },

  // Utility methods
  clear: (): void => {
    const keys = [
      "bucketName",
      "selectedBrain",
      "selectedProject",
      "projectBrainEntries",
      "alignment",
      "userInfo",
    ];
    keys.forEach((key) => localStorage.removeItem(key));
  },

  // Debug helper
  getAll: (): Record<string, any> => {
    return {
      bucketName: workspaceStorage.getBucketName(),
      selectedBrain: workspaceStorage.getSelectedBrain(),
      selectedProject: workspaceStorage.getSelectedProject(),
      projectBrainEntries: workspaceStorage.getProjectBrainEntries(),
      alignment: workspaceStorage.getAlignment(),
      userInfo: workspaceStorage.getUserInfo(),
    };
  },
};
