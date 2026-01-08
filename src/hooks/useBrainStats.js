import { useState, useEffect, useRef } from "react";
import logger from "../utils/logger.js";
import { fetchBrainStatsNormalized } from "../actions/handleCollabs.ts";

/**
 * Custom hook to manage brain statistics fetching
 * Handles abort controllers and loading states
 * 
 * @param {string} token - Authentication token
 * @param {string} bucketName - Bucket name
 * @param {Object} selectedBrain - Selected brain object
 * @returns {Object} Brain stats state
 * @returns {Object|null} stats - Brain statistics (normalized)
 * @returns {boolean} isLoading - Whether stats are loading
 * @returns {Error|null} error - Error if fetch failed
 * @returns {Function} refresh - Function to refresh stats
 */
export const useBrainStats = (token, bucketName, selectedBrain) => {
    const [stats, setStats] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const abortControllerRef = useRef(null);

    const fetchStats = async () => {
        if (!token || !bucketName || !selectedBrain) {
            return;
        }

        setIsLoading(true);
        setError(null);

        // Abort previous request if exists
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            logger.debug("Fetching brain stats", { brain: selectedBrain.name });
            const brainStats = await fetchBrainStatsNormalized(
                token,
                bucketName,
                selectedBrain.name,
                selectedBrain.path,
                { signal: controller.signal }
            );

            setStats(brainStats);
            setIsLoading(false);
            logger.debug("Brain stats loaded", { brain: selectedBrain.name });
        } catch (err) {
            if (err.name === "AbortError") {
                logger.debug("Brain stats fetch aborted");
                return;
            }
            logger.error("Error fetching brain stats", err);
            setError(err);
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (selectedBrain) {
            fetchStats();
        } else {
            setStats(null);
            setIsLoading(false);
            setError(null);
        }

        // Cleanup on unmount
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [token, bucketName, selectedBrain]);

    return {
        stats,
        isLoading,
        error,
        refresh: fetchStats,
    };
};
