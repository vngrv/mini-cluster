const express = require('express');
const app = express();
const os = require('os');
const cluster = require('cluster');
const { response } = require('express');

const HOST = '127.0.0.1';
const PORT = 7000;

app.use((request, response, next) => {

    if(cluster.isWorker) {
        console.log(`Worker ${cluster.worker.id} handle request`);
    };

    next();
});

app.get('/', (request, response) => {
    // response.send('Cluster mode.');
    response.send(`Worker ${cluster.worker.id} handle request`);
});

if(cluster.isMaster) {
    let cpus = os.cpus().length;

    for(let i = 0; i < cpus; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code) => {
        console.log(`Worker ${worker.id} finished. Exit code: ${code}`);

        app.listen(PORT, HOST, () => console.log(`Worker ${cluster.worker.id} launched`));
    });
} else {
    app.listen(PORT, HOST, () => console.log(`Worker ${cluster.worker.id} launched`));
}