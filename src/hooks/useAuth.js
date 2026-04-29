import { useState, useEffect } from "react";
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

                    if (accessToken) {
                        setToken(accessToken);
                        localStorage.setItem("token", accessToken);
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
