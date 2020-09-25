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
    } 

    next();
});

app.get('/', (request, response) => {
    response.send(`Worker ${cluster.worker.id} handle request`);    
});

if(cluster.isMaster) {

    for(let i = 0; i < 2; i++) {
        let worker = cluster.fork();
        // Получать сообщения от этого воркера и обрабатывать их в главном процессе.
        recievedToMaster(worker);
        // Отправьте сообщение от главного процесса воркеру.
        sendToWorker(worker);        
    }

    cluster.on('exit', (worker, code) => {
        app.listen(PORT, HOST, () => console.log(`-- Worker ${cluster.worker.id} launched`));
    });

} else {
    console.log('\n- Worker ' + process.pid + ' has started.');
    // Отправить сообщение главному процессу.
    sendToMaster();
    // Получать сообщения от главного процесса.
    recievedToWorker();
    
    app.listen(PORT, HOST, () => console.log(`- Worker ${cluster.worker.id} launched`));
}

function generateData() {
    return Math.random(100);
}

function recievedToMaster(worker) {
    return worker.on('message', function(msg) {
        console.log(`\n-- Master (${process.pid})\n-- received message from worker (${worker.process.pid}):\n  `, msg, '\n')
    });
}
function sendToWorker(worker) {
    let message = {
        masterId: process.pid,
        toWorker: worker.id,
        message: generateData()
    };

    console.log(`Generate new message from master node`, message.message)

    return worker.send(message);
}


function sendToMaster() {
    process.send({message: 'This is from worker ' + process.pid + '.'})
}

function recievedToWorker() {
    process.on('message', function(msg) {
        console.log('- Worker ' + process.pid + ' received message from master ' + msg.masterId, msg.message);
    });
}
