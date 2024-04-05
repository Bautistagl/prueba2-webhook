import mysql from "mysql2"

const connection = mysql.createConnection({
    host: 'localhost', // Cambia esto si el contenedor Docker no está corriendo localmente
    user: 'root',
    password: '123456789',
    database: 'grid_database',
    
});

connection.connect((err) => {
    if (err) {
        console.error('Error al conectar a la base de datos:', err);
        return;
    }
    console.log('Conexión establecida con éxito a la base de datos MySQL');
});

