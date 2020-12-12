const express = require('express');
const app = express();
const cluster = require('cluster');
const redis = require('redis');
const config = require('./config.json');


const HOST = config.host;
const PORT = config.port;
const REDIS_PORT = config.redis_port;

const client = redis.createClient(REDIS_PORT);



app.use((request, response, next) => {
    
    if(cluster.isWorker) {
        console.log(`Worker ${cluster.worker.id} handle request`);
    }

    next();
});

app.get('/', (request, response) => {
    response.send(`Worker ${cluster.worker.id} handle request`);    
});

app.get('/list', (request, response) => {
    response.send(`Worker ${cluster.worker.id} handle request`);   
});

app.get('/history', (request, response) => {  
    cache(request, response)
})


if(cluster.isMaster) {
    
    for(let i = 0; i < config.number_of_workers; i++) {
        let worker = cluster.fork();
        // Получать сообщения от этого воркера и обрабатывать их в главном процессе.
        recievedToMaster(worker);
        // Отправьте сообщение от главного процесса воркеру.
        sendToWorker(worker);        
    }

    cluster.on('exit', (worker, code) => {
        console.log(`-- Master ${worker.id} finished. Exit code: ${code}`);
        app.listen(PORT, HOST, () => console.log(`-- Master ${cluster.worker.id} launched`));
    });

} else {
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

    console.log(`-- Master Generate new message from master node`, message.message)

    return worker.send(message);
}


function sendToMaster() {
    process.send({message: 'This is from worker ' + process.pid + '.'})
}

function recievedToWorker() {
    process.on('message', function(msg) {
        let message = '- Worker ' + process.pid + ' received message from master ' + msg.masterId;
        
        client.setex(process.pid, 3600, 'worker');
        // console.log(message);
    });
}


function cache(req, res, next) {
  
    client.multi().keys("*", (err, data) => {
      if (err) throw err;
  
      console.log(data)
      if (data !== null) {
        res.send(data);
        
      } else {
        next();
      }
    });
  }