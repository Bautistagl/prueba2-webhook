import "dotenv/config";
import express from "express";
import fetch from "node-fetch";
import fs from 'fs';
import getInstallationToken from './services/installationService.js'
import createBranch from "./services/createBranch.js";
import addFileToBranch from "./services/addFile.js";
import createPullRequest from "./services/createPull.js";
import pkg from 'pg';
const { Pool } = pkg;


const privateKeyPath = './private.pem';
const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
const githubAppId = process.env.APP_ID;


const app = express();

app.use(express.json());


 
// const pool = new Pool({
//   connectionString: process.env.POSTGRES_URL, // URL de conexión a tu base de datos PostgreSQL
// });

// pool.connect((err) => {
//     if (err) throw err
//     console.log("Connect to PostgreSQL successfuSlly!")
// })





app.post('/api/github/pullRequest', async (req, res) => {
  try {

    const payload = req.body;
    const installationId = payload.payload.installation.id;

    // const installationId = req.body.installation_id;
    if (!installationId) {
      return res.status(400).send('Installation ID missing');
    } 
    const query = 'INSERT INTO grid_installations (id) VALUES ($1) RETURNING *';
    const values = [installationId];
    const result = await pool.query(query, values);

    // Devuelve la nueva fila insertada como respuesta
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
})



app.post('/api/github/webhooks', async (req, res) => {
  try {
    const eventType = req.headers['x-github-event'];
    const payload = req.body;


    
    if ( payload.action === 'created') {
      console.log(payload.repositories)
      // const installationId = payload.installation.id;
      // const repositories = payload.repositories;
      // const username = payload.sender.login;


      // // Obtener el nombre del primer repositorio con permisos
      // const firstRepoName = repositories.length > 0 ? repositories[0].name : '';
      // const installationTokenResponse = await getInstallationToken(installationId, githubAppId, privateKey);
      // if (installationTokenResponse.ok) {
      //   const branchResponse = await createBranch(installationId,githubAppId,privateKey,username,firstRepoName)
      //   if(branchResponse.ok) {
      //     const addFileResponse = await addFileToBranch(installationId,githubAppId,privateKey,username,firstRepoName)
      //       if(addFileResponse.ok) {
      //         const createPullResponse = await createPullRequest(installationId,githubAppId,privateKey,username,firstRepoName)
      //         console.log(createPullResponse)
      //       }
      //       else{
      //         console.log('No se pudo anadir el archivo a la branch')
      //       }

      //   }
      //   else{
      //     console.log('No se pudo crear el branch correspondiente')
      //   }
      // } 
      // else{
      //   console.log('No se pudo obtener el token de instalacion')
      // }
      // Redirigir al usuario a la ruta '/installation-token' con los parámetros en la URL
      return res.redirect(`/installation-token?installation_id=${installationId}&repo_name=${firstRepoName}&username=${username}`);
    }

    res.sendStatus(200); // Enviar una respuesta de estado 200 solo si no se cumple ninguna condición
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
});







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