import fetch from "node-fetch";
import jwt from "jsonwebtoken";

async function createPullRequest(installationId, githubAppId, privateKey, fullName) {
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

           
            const pullRequestResponse = await fetch(`https://api.github.com/repos/${fullName}/pulls`, {
                method: 'POST',
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: 'Pull Request para agregar archivos Grid Cloud a main',
                    head: 'gridBranch', 
                    base: 'main', 
                    body: 'Pull request de Grid Cloud'
                })
            });

            // Verificar si la creación del pull request fue exitosa
            if (pullRequestResponse.ok) {
                return { success: true, message: 'Pull request creado exitosamente' };
            } else {
                const errorData = await pullRequestResponse.json();
                return { success: false, error: errorData.errors };
            }
        } else {
            // La solicitud no fue exitosa, obtener el mensaje de error
            const errorData = await installationTokenResponse.json();
            return { success: false, error: errorData };
        }
    } catch (error) {
        // Capturar cualquier error que ocurra durante el proceso de solicitud
        console.error('Error:', error);
        return { success: false, error: 'Error al crear el pull request' };
    }
}

export default createPullRequest;