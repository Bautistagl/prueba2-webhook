import "dotenv/config";
import express, { response } from "express";
import cors from "cors"
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
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());


 
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL, // URL de conexión a tu base de datos PostgreSQL
});

pool.connect((err) => {
    if (err) throw err
    console.log("Connect to PostgreSQL successfuSlly!")
})

const CLIENT_ID = "Iv1.dc11b1e22135af26"
const CLIENT_SECRET = "c640ddfd4d07be575ee5c9e069daf218a9ea0e34"



// app.post('/api/github/pullRequest', async (req, res) => {
//   try {

//     const payload = req.body;
//     const installationId = payload.payload.installation.id;

//     // const installationId = req.body.installation_id;
//     if (!installationId) {
//       return res.status(400).send('Installation ID missing');
//     } 
//     const query = 'INSERT INTO grid_installations (id) VALUES ($1) RETURNING *';
//     const values = [installationId];
//     const result = await pool.query(query, values);

//     // Devuelve la nueva fila insertada como respuesta
//     res.status(201).json(result.rows[0]);
//   } catch (error) {
//     console.error('Error:', error);
//     res.status(500).send('Internal Server Error');
//   }
// })

// app.get('/api/github/repositories/:installationId', async (req, res) => {
//   try {
//     const installationId = req.params.installationId;

   
//     const query = `
//       SELECT * 
//       FROM repositories 
//       WHERE installation_id = $1`;
//     const { rows } = await pool.query(query, [installationId]);

    
//     res.json(rows);
//   } catch (error) {
//     console.error('Error:', error);
//     res.status(500).send('Internal Server Error');
//   }
// });

app.get('/api/github/check', async (req, res) => {
  try {
    // Obtener el string a buscar desde los parámetros de la solicitud
    const searchString = req.query.owner;

    // Verificar si se proporcionó un string para buscar
    if (!searchString) {
      return res.status(400).json({ error: 'Missing search string in query parameters' });
    }

    // Realizar la consulta a la base de datos para verificar si existe alguna fila
    const query = `
      SELECT COUNT(*) AS count 
      FROM grid_installations 
      WHERE owner LIKE $1`;
    const values = [`%${searchString}%`];
    const result = await pool.query(query, values);

    // Obtener el resultado de la consulta
    const rowCount = parseInt(result.rows[0].count);

    // Determinar si se encontraron filas que coincidan con la búsqueda
    const exists = rowCount > 0;

    // Enviar la respuesta al cliente
    res.json({ exists });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/github/webhooks', async (req, res) => {
  try {
    const eventType = req.headers['x-github-event'];
    const payload = req.body;
  
    if (payload.action === 'created') {
      // Insertar datos de la instalación en la tabla `installations`
      const installationQuery = `
        INSERT INTO grid_installations (id, user_id, owner, created_at, updated_at, deleted_at)
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
        console.log(repository)
        const repositoryQuery = `
          INSERT INTO repositories (id, installation_id, node_id, name, fullname, owner)
          VALUES ($1, $2, $3, $4, $5, $6)`;
        const repositoryValues = [
          repository.id,
          installationId,
          repository.node_id,
          repository.name,
          repository.full_name,
          repository.owner
        ];
        await pool.query(repositoryQuery, repositoryValues);
      }

      // Redirigir a otra ruta después de insertar los datos si es necesario
      return  res.sendStatus(201);
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
  const redirectUri = 'http://localhost:3000'; 
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



const port = 4000;
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});