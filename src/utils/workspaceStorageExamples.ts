// Example usage patterns for workspaceStorage utility
// This file shows how to replace localStorage calls throughout your components

import { workspaceStorage } from "./workspaceStorage.js";

// ================================
// USAGE PATTERNS
// ================================

// ❌ Old way (direct localStorage):
// const bucketName = localStorage.getItem("bucketName");
// const brainEntries = JSON.parse(localStorage.getItem("projectBrainEntries") || "[]");

// ✅ New way (typed utility):
// const bucketName = workspaceStorage.getBucketName();
// const brainEntries = workspaceStorage.getProjectBrainEntries();

// ================================
// EXAMPLES FOR YOUR COMPONENTS
// ================================

/*
// In QuintTable.jsx - replace these patterns:

// Old:
localStorage.setItem("bucketName", collabName);
localStorage.setItem("selectedProject", JSON.stringify(project));

// New:
workspaceStorage.setBucketName(collabName);
workspaceStorage.setSelectedProject(project);

// --------------------------------

// In Nutil.jsx - replace these patterns:

// Old:
const storedBrainEntries = localStorage.getItem("projectBrainEntries");
const parsedEntries = storedBrainEntries ? JSON.parse(storedBrainEntries) : [];

// New:
const parsedEntries = workspaceStorage.getProjectBrainEntries();

// --------------------------------

// In QuickActions.jsx - replace these patterns:

// Old:
const userInfo = JSON.parse(localStorage.getItem("userInfo"));

// New:
const userInfo = workspaceStorage.getUserInfo();

// --------------------------------

// Debug helper (useful during development):
console.log("Current workspace state:", workspaceStorage.getAll());

// Clean slate (useful for testing):
workspaceStorage.clear();
*/
