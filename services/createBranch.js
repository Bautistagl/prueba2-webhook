import fetch from "node-fetch";
import jwt from "jsonwebtoken";
import "dotenv/config";



async function createBranch(installationId, githubAppId, privateKey,githubUser,githubRepository) {
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
  
        const baseBranchResponse = await fetch(`https://api.github.com/repos/${githubUser}/${githubRepository}/branches/main`, {
          method: 'GET',
          headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json',
          }
        });
  
        if (baseBranchResponse.ok) {
          const { commit } = await baseBranchResponse.json();
          const baseCommitSHA = commit.sha;
  
          const branchCreationResponse = await fetch(`https://api.github.com/repos/${githubUser}/${githubRepository}/git/refs`, {
            method: 'POST',
            headers: {
              'Authorization': `token ${token}`,
              'Accept': 'application/vnd.github.v3+json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              ref: 'refs/heads/nuevaBranch2',
              sha: baseCommitSHA
            })
          });
  
          return branchCreationResponse;
        } else {
          throw new Error('Error obteniendo el SHA del commit de la rama base');
        }
      } else {
        throw new Error('Error obteniendo el token de acceso de instalación');
      }
    } catch (error) {
      throw new Error('Error al crear la nueva rama: ' + error.message);
    }
  }
  
 export default createBranch