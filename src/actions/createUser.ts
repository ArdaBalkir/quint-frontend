import logger from "../utils/logger.js";
const API = import.meta.env.VITE_APP_API;
interface UserInfo {
  username: string;
  fullname: string;
  email: string;
  sub?: string;
  iss?: string;
  aud?: string | string[];
  scope?: string | string[];
  exp?: number;
  iat?: number;
  [key: string]: any;
}

function decodeJwtPayload(token: string): Record<string, any> {
  const payloadBase64Url = token.split(".")[1];
  if (!payloadBase64Url) {
    throw new Error("Invalid JWT: missing payload");
  }

  const base64 = payloadBase64Url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "=",
  );
  const decodedPayload = atob(padded);
  return JSON.parse(decodedPayload);
}

function createUser(token: string): UserInfo {
  try {
    const payload = decodeJwtPayload(token);

    // Map the JWT fields to our UserInfo structure
    const userInfo: UserInfo = {
      username: payload.preferred_username || "",
      fullname: payload.name || "",
      email: payload.email || "",
      sub: payload.sub,
      iss: payload.iss,
      aud: payload.aud,
      scope: payload.scope || payload.scp,
      exp: payload.exp,
      iat: payload.iat,
    };

    logger.info("User created", { sub: userInfo.sub });
    localStorage.setItem("userInfo", JSON.stringify(userInfo));

    return userInfo;
  } catch (error) {
    logger.error("Error parsing JWT token", error);
    throw error;
  }
}

async function checkAgreement(
  username: string,
  email: string,
): Promise<boolean> {
  try {
    // Normalize using NFC for consistent character representation
    const normalizedUsername = username.normalize("NFC").trim();
    const normalizedEmail = email.trim().toLowerCase();

    const url = new URL(`${API}/check-signature`);
    url.searchParams.set("email", normalizedEmail);
    url.searchParams.set("username", normalizedUsername);

    logger.debug("Checking agreement for", {
      originalUsername: username,
      normalizedUsername,
      email: normalizedEmail,
      finalUrl: url.toString(),
    });

    const response = await fetch(url.toString(), {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(
        `Network response was not ok: ${response.status} ${response.statusText}`,
      );
    }
    logger.debug("Agreement response status", {
      status: response.status,
      url: url.toString(),
    });
    const data = await response.json();
    return data.signed;
  } catch (error) {
    logger.error("Error checking agreement", { error, username, email });
    return false;
  }
}

async function signDocument(token: string): Promise<void> {
  try {
    const url = new URL(`${API}/sign-document`);

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token: token }),
    });

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    logger.info("Document signed successfully");
  } catch (error) {
    logger.error("Error signing document", error);
    throw error; // Re-throw to allow caller to handle the error
  }
}

export { createUser, checkAgreement, signDocument };
