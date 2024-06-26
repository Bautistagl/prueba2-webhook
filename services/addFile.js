import fetch from "node-fetch";
import jwt from "jsonwebtoken";
import "dotenv/config";
import fs from 'fs';
import path from 'path';

async function addFileToBranch(installationId, githubAppId, privateKey,fullName) {
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
  
      if (installationTokenResponse.ok) {
        const { token } = await installationTokenResponse.json();
        const fileContent = 'Contenido del archivo GridCloud'; // Contenido de tu archivo

        // Codifica el contenido del archivo a base64
        const encodedContent = Buffer.from(fileContent).toString('base64');
      
  
        const fileAdditionResponse = await fetch(`https://api.github.com/repos/${fullName}/contents/carpetaGrid/archivoGrid.txt`, {
          method: 'PUT',
          headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: 'Este es el nuevo archivo agregado por grid',
            content: encodedContent,
            branch: 'gridBranch'
          })
        });
  
        return fileAdditionResponse;
      } else {
        throw new Error('Error obteniendo el token de acceso de instalación');
      }
    } catch (error) {
      throw new Error('Error al agregar el archivo a la nueva rama: ' + error.message);
    }
  }
  
export default addFileToBranch 