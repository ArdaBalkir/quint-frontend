import { useState, useEffect, useRef } from "react";
import logger from "../utils/logger.js";
import { createUser, checkAgreement, signDocument } from "../actions/createUser";

const OIDC = import.meta.env.VITE_APP_OIDC;
const TOKEN_URL = import.meta.env.VITE_APP_TOKEN_URL;
const MY_URL = import.meta.env.VITE_APP_MY_URL;

/**
 * Custom hook to manage authentication flow
 * Handles OAuth code exchange, token management, and user agreement
 * 
 * @returns {Object} Authentication state and handlers
 * @returns {boolean} isLoading - Whether auth is in progress
 * @returns {boolean} isAuthenticated - Whether user is authenticated
 * @returns {string|null} token - Access token
 * @returns {Object|null} user - User information
 * @returns {boolean} needsAgreement - Whether user needs to accept agreement
 * @returns {Function} handleLogin - Redirect to login
 * @returns {Function} handleAcceptAgreement - Accept user agreement
 */
export const useAuth = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [token, setToken] = useState(null);
    const [user, setUser] = useState(null);
    const [needsAgreement, setNeedsAgreement] = useState(false);
    const [refreshToken, setRefreshToken] = useState(null);
    const [expiresIn, setExpiresIn] = useState(null);
    const [refreshExpiresIn, setRefreshExpiresIn] = useState(null);
    const refreshTimerRef = useRef(null);

    const handleLogin = () => {
        window.location.href = `${OIDC}?response_type=code&login=true&client_id=quintweb&redirect_uri=${MY_URL}`;
    };

    const handleAcceptAgreement = async () => {
        try {
            await signDocument(token);
            const agreementSigned = await checkAgreement(user?.username, user?.email);

            if (agreementSigned) {
                logger.info("Agreement signed & verified");
                setNeedsAgreement(false);
                setIsAuthenticated(true);
            } else {
                logger.error("Agreement signature could not be verified");
                throw new Error("Agreement verification failed");
            }
        } catch (error) {
            logger.error("Error during agreement signing", error);
            throw error;
        }
    };

    const storeTokenMeta = ({ refreshTokenValue, expiresInValue, refreshExpiresInValue }) => {
        if (refreshTokenValue) {
            localStorage.setItem("refreshToken", refreshTokenValue);
        }
        if (typeof expiresInValue === "number") {
            localStorage.setItem("expiresIn", String(expiresInValue));
        }
        if (typeof refreshExpiresInValue === "number") {
            localStorage.setItem("refreshExpiresIn", String(refreshExpiresInValue));
        }
    };

    const refreshAccessToken = async () => {
        if (!refreshToken) {
            logger.warn("No refresh token available, redirecting to login");
            handleLogin();
            return;
        }

        try {
            const body = new URLSearchParams();
            body.set("grant_type", "refresh_token");
            body.set("refresh_token", refreshToken);

            const response = await fetch(TOKEN_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: body.toString(),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const nextToken = data?.token?.access_token || data?.access_token;
            const nextRefreshToken = data?.token?.refresh_token || data?.refresh_token;
            const nextExpiresIn = data?.token?.expires_in || data?.expires_in;
            const nextRefreshExpiresIn = data?.token?.refresh_expires_in || data?.refresh_expires_in;

            if (!nextToken) {
                throw new Error("Refresh response missing access token");
            }

            setToken(nextToken);
            setRefreshToken(nextRefreshToken || refreshToken);
            setExpiresIn(nextExpiresIn || null);
            setRefreshExpiresIn(nextRefreshExpiresIn || null);
            storeTokenMeta({
                refreshTokenValue: nextRefreshToken || refreshToken,
                expiresInValue: nextExpiresIn || null,
                refreshExpiresInValue: nextRefreshExpiresIn || null,
            });
            scheduleRefresh(nextExpiresIn);
            logger.info("Access token refreshed");
        } catch (error) {
            logger.error("Token refresh failed", error);
            handleLogin();
        }
    };

    const scheduleRefresh = (expiresInValue) => {
        if (!expiresInValue || typeof expiresInValue !== "number") return;
        const refreshDelayMs = Math.max((expiresInValue - 60) * 1000, 10 * 1000);
        if (refreshTimerRef.current) {
            clearTimeout(refreshTimerRef.current);
        }
        refreshTimerRef.current = setTimeout(() => {
            refreshAccessToken();
        }, refreshDelayMs);
    };

    // Handle OAuth code exchange
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get("code");

        if (code) {
            setIsLoading(true);
            fetch(`${TOKEN_URL}?code=${code}`)
                .then((response) => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .then((data) => {
                    logger.debug("Token received", { hasAccess: !!data?.access_token });
                    const accessToken = data?.token?.access_token;
                    const refreshTokenValue = data?.token?.refresh_token;
                    const expiresInValue = data?.token?.expires_in;
                    const refreshExpiresInValue = data?.token?.refresh_expires_in;

                    if (accessToken) {
                        setToken(accessToken);
                        setRefreshToken(refreshTokenValue || null);
                        setExpiresIn(expiresInValue || null);
                        setRefreshExpiresIn(refreshExpiresInValue || null);
                        storeTokenMeta({
                            refreshTokenValue,
                            expiresInValue,
                            refreshExpiresInValue,
                        });
                        scheduleRefresh(expiresInValue);
                        window.history.replaceState(null, null, window.location.pathname);
                    } else {
                        logger.error("Token data missing or invalid", data);
                        setToken(null);
                        handleLogin();
                    }
                })
                .catch((error) => {
                    logger.error("Token couldn't be retrieved", error);
                    setToken(null);
                    handleLogin();
                });
        } else {
            logger.info("No code found, redirecting to login");
            handleLogin();
        }
    }, []);

    // Fetch user info when token is available
    useEffect(() => {
        const fetchUser = async () => {
            if (!token) {
                const urlParams = new URLSearchParams(window.location.search);
                if (!urlParams.has("code")) {
                    setIsLoading(false);
                }
                return;
            }

            try {
                logger.debug("Fetching user info");
                const userInfo = await createUser(token);
                setUser(userInfo);
                logger.info("User info received", { user: userInfo?.username });
                localStorage.setItem("userInfo", JSON.stringify(userInfo));

                const agreement = await checkAgreement(userInfo["username"], userInfo["email"]);
                logger.debug("User agreement status", { agreement });

                if (!agreement) {
                    logger.info("User has not accepted the agreement");
                    setNeedsAgreement(true);
                    setIsLoading(false);
                } else {
                    logger.info("User has accepted the agreement");
                    setNeedsAgreement(false);
                    setIsAuthenticated(true);
                    setIsLoading(false);
                }
            } catch (error) {
                logger.error("User couldn't be retrieved", error);
                setIsAuthenticated(false);
                setUser(null);
                setToken(null);
                handleLogin();
            }
        };

        fetchUser();
    }, [token]);

    useEffect(() => {
        return () => {
            if (refreshTimerRef.current) {
                clearTimeout(refreshTimerRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (typeof expiresIn === "number") {
            scheduleRefresh(expiresIn);
        }
        if (typeof refreshExpiresIn === "number") {
            logger.debug("Refresh token TTL", { refreshExpiresIn });
        }
    }, [expiresIn, refreshExpiresIn]);

    return {
        isLoading,
        isAuthenticated,
        token,
        user,
        needsAgreement,
        handleLogin,
        handleAcceptAgreement,
    };
};
