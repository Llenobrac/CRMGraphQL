const mongoose = require('mongoose');
require('dotenv').config({path:'variables.env'});

const conectarDB = async () => {
    try {
        await mongoose.connect(process.env.DB_MONGO, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useFindAndModify: false,
            useCreateIndex: true
        });
        console.log('*** DB Conectada ***')
    } catch (error) {
        console.error('Hubo un error', error);
        process.exit(1);//Detiene la aplicación
    }
}

module.exports = conectarDB;