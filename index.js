import "dotenv/config";
import express, { response } from "express";
import cors from "cors"
import fs from 'fs';
import createBranch from "./services/createBranch.js";
import addFileToBranch from "./services/addFile.js";
import createPullRequest from "./services/createPull.js";
import pkg from 'pg';
const { Pool } = pkg;


// const privateKeyPath = './private.pem';
// const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
const githubAppId = process.env.APP_ID;


const app = express();
app.use(cors({ origin: 'https://git-integrator-front.vercel.app' }));
app.use(express.json());


 
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL, 
  ssl: {
    rejectUnauthorized: false,
  },
});

pool.connect((err) => {
    if (err) throw err
    console.log("Conectado a postgres")
})


app.post('/api/github/webhooks', async (req, res) => {
  try {
    const eventType = req.headers['x-github-event'];
    const payload = req.body;
  
    if (payload.action === 'created') {
      // Insertar datos de la instalación en la tabla `installations`
      const installationQuery = `
        INSERT INTO installations (id, user_id, owner, created_at, updated_at, deleted_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id`;
      const installationValues = [
        payload.installation.id,
        payload.installation.account.id,
        payload.installation.account.login,
        payload.installation.created_at,
        payload.installation.updated_at,
        payload.installation.deleted_at
        // Agrega los valores correspondientes para las otras columnas
      ];
      const installationResult = await pool.query(installationQuery, installationValues);

      const installationId = installationResult.rows[0].id;

      // Insertar datos de los repositorios asociados en la tabla `repositories`
      const repositories = payload.repositories;
      for (const repository of repositories) {
       
        const repositoryQuery = `
          INSERT INTO repositories (id, installation_id, node_id, name, fullname, owner)
          VALUES ($1, $2, $3, $4, $5, $6)`;
        const repositoryValues = [
          repository.id,
          installationId,
          repository.node_id,
          repository.name,
          repository.full_name,
          payload.installation.account.login,
        ];
        await pool.query(repositoryQuery, repositoryValues);
      }

    
      return  res.sendStatus(201);
    }

    res.sendStatus(200); 
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/api/github/modifyRepo', async (req, res) => {
  try {
     
      const { installationId, fullName} = req.body;
     
    
      const branchCreationResponse = await createBranch(installationId, githubAppId, privateKey, fullName);
      if (!branchCreationResponse.ok) {
          throw new Error('Error al crear la rama');
      }

      // Agrega el archivo a la rama si la creación de la rama fue exitosa
      const fileAdditionResponse = await addFileToBranch(installationId, githubAppId, privateKey, fullName);
      if (!fileAdditionResponse.ok) {
          throw new Error('Error al agregar el archivo a la rama');
      }

      // Crea el pull request si la adición del archivo fue exitosa
      const pullRequestResponse = await createPullRequest(installationId, githubAppId, privateKey, fullName);
      if (!pullRequestResponse.success) {
          throw new Error('Error al crear el pull request');
      }

      res.json({ success: true, message: 'Modificaciones completadas' });
  } catch (error) {
    
      console.error(error);
      res.status(500).json({ error: error.message });
  }
});


app.get('/', async (req, res) => {
    res.sendStatus(200)
});



const port = 4000;
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});