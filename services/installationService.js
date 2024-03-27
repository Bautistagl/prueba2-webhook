import fetch from "node-fetch";
import jwt from "jsonwebtoken";
import "dotenv/config";
import fs from 'fs';



async function getInstallationToken(installationId,githubAppId,privateKey ) {
   
  try {
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + 400;

    const payload = {
      iat: now,
      exp: expiresAt,
      iss: githubAppId
    };

    const token = jwt.sign(payload, privateKey, { algorithm: 'RS256' });

    const installationTokenResponse = await fetch(`https://api.github.com/app/installations/${installationId}/access_tokens`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    return installationTokenResponse;
  } catch (error) {
    throw new Error('Error obteniendo el token de acceso de instalación');
  }
}

export default getInstallationToken