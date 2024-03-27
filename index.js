import { App,Octokit,  createNodeMiddleware } from "octokit";
import "dotenv/config";
import express from "express";
import { createTokenAuth } from "@octokit/auth-token";
import fetch from "node-fetch";
import jwt from "jsonwebtoken";
import fs from 'fs';
import getInstallationToken from './services/installationService.js'

const userTokens = {};
const privateKeyPath = './private.pem';
const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
const githubAppId = process.env.APP_ID;



const ghApp = new App({
  appId: process.env.APP_ID,
  privateKey: process.env.PRIVATE_KEY,
  webhooks: {
    secret: process.env.WEBHOOK_SECRET,
  },
  oauth: { clientId: null, clientSecret: null },
});



const app = express();

app.use(express.json());

app.get('/add-file-to-branch', async (req, res) => {
  const installationId = req.query.installation_id
  try {
    // Obtener el tiempo de expiración del token (10 minutos)
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + 400;
 
    // Crear el payload del JWT
    const payload = {
      iat: now, // Tiempo de emisión del token (en segundos)
      exp: expiresAt, // Tiempo de expiración del token (1 hora después del tiempo de emisión)
      iss: githubAppId // Identificador de tu aplicación de GitHub (como un número entero)
    };

    // Firmar el JWT
    const token = jwt.sign(payload, privateKey, { algorithm: 'RS256' });

    // Realizar la solicitud para obtener el token de acceso de instalación
    const installationTokenResponse = await fetch(`https://api.github.com/app/installations/${installationId}/access_tokens`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28' 
      }
    });
     
    // Verificar si la solicitud fue exitosa
    if (installationTokenResponse.ok) {
      // La solicitud fue exitosa, obtener el token de acceso de instalación
      const { token } = await installationTokenResponse.json();
      console.log(token)
      const contenidoArchivo = fs.readFileSync('./archivo.txt');
      const contenidoBase64 = Buffer.from(contenidoArchivo).toString('base64');

      // Agregar un archivo a la nueva rama
      const fileAdditionResponse = await fetch(`https://api.github.com/repos/UsuarioGrid/clienteGrid/contents/carpeta2/archivo`, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: 'Agregando nuevo archivo',
          content: contenidoBase64,
          branch: 'nuevaBranch2'
        })
      });

      // Verificar si la adición del archivo fue exitosa
      if (fileAdditionResponse.ok) {
        res.redirect(`/create-pull-request?installation_id=${installationId}`);
      } else {
        const errorData = await fileAdditionResponse.json();
        res.status(fileAdditionResponse.status).json({ error: errorData });
      }
    } else {
      // La solicitud no fue exitosa, enviar un mensaje de error
      const errorData = await installationTokenResponse.json();
      res.status(installationTokenResponse.status).json({ error: errorData });
    }
  } catch (error) {
    // Capturar cualquier error que ocurra durante el proceso de solicitud
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al agregar el archivo a la nueva rama' });
  }
});

app.get('/create-branch', async (req, res) => {
  const installationId = req.query.installation_id
  try {
    // Obtener el tiempo de expiración del token (10 minutos)
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + 400;
 
    // Crear el payload del JWT
    const payload = {
      iat: now, // Tiempo de emisión del token (en segundos)
      exp: expiresAt, // Tiempo de expiración del token (1 hora después del tiempo de emisión)
      iss: githubAppId // Identificador de tu aplicación de GitHub (como un número entero)
    };

    // Firmar el JWT
    const token = jwt.sign(payload, privateKey, { algorithm: 'RS256' });

    // Realizar la solicitud para obtener el token de acceso de instalación
    const installationTokenResponse = await fetch(`https://api.github.com/app/installations/${installationId}/access_tokens`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28' 
      }
    });
     
    // Verificar si la solicitud fue exitosa
    if (installationTokenResponse.ok) {
      // La solicitud fue exitosa, obtener el token de acceso de instalación
      const { token } = await installationTokenResponse.json();
      

      // Obtener el SHA del commit de la rama base
      const baseBranchResponse = await fetch(`https://api.github.com/repos/UsuarioGrid/clienteGrid/branches/main`, {
        method: 'GET',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        }
      });


      // Verificar si la solicitud fue exitosa
      if (baseBranchResponse.ok) {
        const { commit } = await baseBranchResponse.json();
        const baseCommitSHA = commit.sha;

        // Crear una nueva rama
        const branchCreationResponse = await fetch(`https://api.github.com/repos/UsuarioGrid/clienteGrid/git/refs`, {
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

        // Verificar si la creación de la rama fue exitosa
        if (branchCreationResponse.ok) {
          res.redirect(`/add-file-to-branch?installation_id=${installationId}`);
        } else {
          const errorData = await branchCreationResponse.json();
          res.status(branchCreationResponse.status).json({ error: errorData });
        }
      } else {
        const errorData = await baseBranchResponse.json();
        res.status(baseBranchResponse.status).json({ error: errorData });
      }
    
    } else {
      // La solicitud no fue exitosa, enviar un mensaje de error
      const errorData = await installationTokenResponse.json();
      res.status(installationTokenResponse.status).json({ error: errorData });
    }
  } catch (error) {
    // Capturar cualquier error que ocurra durante el proceso de solicitud
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al crear la nueva rama' });
  }
});

app.get('/create-pull-request', async (req, res) => {
  const installationId = req.query.installation_id
  try {
    
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + 400;
 
    // Crear el payload del JWT
    const payload = {
      iat: now, 
      exp: expiresAt, 
      iss: githubAppId 
    };

    // Firmar el JWT
    const token = jwt.sign(payload, privateKey, { algorithm: 'RS256' });

    // Realizar la solicitud para obtener el token de acceso de instalación
    const installationTokenResponse = await fetch(`https://api.github.com/app/installations/${installationId}/access_tokens`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28' 
      }
    });
     
    // Verificar si la solicitud fue exitosa
    if (installationTokenResponse.ok) {

      const { token } = await installationTokenResponse.json();

      // Crear el pull request
      const pullRequestResponse = await fetch(`https://api.github.com/repos/UsuarioGrid/clienteGrid/pulls`, {
        method: 'POST',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Pull Request para los cambios en la nueva rama',
          head: 'nuevaBranch', // Nombre de la rama que contiene los cambios
          base: 'main', // Nombre de la rama a la que se dirige el pull request (rama principal)
          body: 'Descripción del pull request'
        })
      });

      // Verificar si la creación del pull request fue exitosa
      if (pullRequestResponse.ok) {
        res.status(200).json({ message: 'Pull request creado exitosamente' });
      } else {
        const errorData = await pullRequestResponse.json();
        res.status(pullRequestResponse.status).json({ error: errorData });
      }
    } else {
      // La solicitud no fue exitosa, enviar un mensaje de error
      const errorData = await installationTokenResponse.json();
      res.status(installationTokenResponse.status).json({ error: errorData });
    }
  } catch (error) {
    // Capturar cualquier error que ocurra durante el proceso de solicitud
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al crear el pull request' });
  }
});








app.post('/api/github/webhooks', async (req, res) => {
  try {
    const eventType = req.headers['x-github-event'];
    const payload = req.body;


    
    if ( payload.action === 'created') {
      const installationId = payload.installation.id;
      const repositories = payload.repositories;
      const username = payload.sender.login;


      // Obtener el nombre del primer repositorio con permisos
      const firstRepoName = repositories.length > 0 ? repositories[0].name : '';
      const installationTokenResponse = await getInstallationToken(installationId, githubAppId, privateKey);
      console.log(installationTokenResponse,'ESTO ES REPOSEEEEEEE')
      // Redirigir al usuario a la ruta '/installation-token' con los parámetros en la URL
      return res.redirect(`/installation-token?installation_id=${installationId}&repo_name=${firstRepoName}&username=${username}`);
    }

    res.sendStatus(200); // Enviar una respuesta de estado 200 solo si no se cumple ninguna condición
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
});






app.use(createNodeMiddleware(ghApp));
app.get('/', (req, res) => {
  const githubAuthUrl = 'https://github.com/login/oauth/authorize';
  const clientId = process.env.APP_SECRET;
  const redirectUri = 'http://localhost:3000/oauth/callback'; 
  const scope = 'repo';
 
  const authUrl = `${githubAuthUrl}?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
  
  // Check if the user is already authenticated
 
  if (req.headers.authorization) {
    res.send('You are already authenticated.');
  } else {
    // Redirect the user to the GitHub authorization page
    res.redirect('https://github.com/apps/prueba-grid/installations/new');
  }
});

app.get('/oauth/callback', async (req, res) => {
  const code = req.query.code;
  const installationId = req.query.installation_id
  

  try {
    const accessTokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        client_id: process.env.APP_SECRET,
        client_secret: process.env.CLIENT_SECRET,
        code: code
      })
    });

    const accessTokenData = await accessTokenResponse.json();
    
 

    res.redirect(`/installation-token?installation_id=${installationId}`);
  } catch (error) {
    console.error('Error exchanging authorization code for access token:', error);
    res.status(500).send('Error exchanging authorization code for access token');
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});