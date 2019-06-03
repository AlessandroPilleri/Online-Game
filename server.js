// Dependencies
const express = require('express');
const http = require('http');
const path = require('path');
const socketIO = require('socket.io');

// Initializing server, port and websocket
var app = express();
var server = http.Server(app);
var io = socketIO(server);

app.set('port', 5000);
app.use('/static', express.static(__dirname + '/static'));

// Routing
app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
server.listen(5000, function () {
  console.log('Starting server on port 5000');
});

// Game objects
var players = {};
var bullets = {};
var enemies = {};
var spawner;
var enemySpawner = 1000;
var i = 0;
var k = 0;

// Game will increase enemies spawn each x seconds
function speedUpGame() {
  setInterval(function () {
    if (enemySpawner != 0) {
      clearInterval(spawner);
      console.log('Speed up game')
      if (enemySpawner > 100) {
        enemySpawner -= 100;
      }
      else {
        enemySpawner -= 10;
      }
      console.log('Speed: ' + enemySpawner)
      spawner = setInterval(generateEnemy, enemySpawner);
    }
  }, 5000)
}

// Create enemies object
function generateEnemy() {
  var object = {};
  // Choose spawn border
  var axis = false; // x = false / y = true
  var value = false; // 0 = false / maxValue = true
  if (Math.random() > 0.5) {
    axis = true;
  }
  if (Math.random() > 0.5) {
    value = true;
  }
  if (axis && value) {
    object = {
      x: Math.random() * 800,
      y: 600,
      velX: 0,
      velY: 0
    }
  }
  if (axis && !value) {
    object = {
      x: Math.random() * 800,
      y: 0,
      velX: 0,
      velY: 0
    }
  }
  if (!axis && value) {
    object = {
      x: 800,
      y: Math.random() * 600,
      velX: 0,
      velY: 0
    }
  }
  if (!axis && !value) {
    object = {
      x: 0,
      y: Math.random() * 600,
      velX: 0,
      velY: 0
    }
  }
  // Add normilized vector
  var v1 = {
    x: object.x - 400,
    y: object.y - 300
  }

  var len = Math.sqrt(v1.x ** 2 + v1.y ** 2);

  vNorm = {
    x: v1.x / len,
    y: v1.y / len
  }

  object.velX = vNorm.x * 5;
  object.velY = vNorm.y * 5;

  // Add enemies
  enemies[k] = object;
  k++;
}

// WebSocket handlers
io.on('connection', function (socket) {
  socket.on('new player', function () {
    players[socket.id] = {
      x: 400,
      y: 300,
      hitted: false
    };
  });
  socket.on('movement', function (data) {
    var player = players[socket.id] || {};
    if (data.left && (player.x - 5) > 0) {
      player.x -= 5;
    }
    if (data.up && (player.y - 5) > 0) {
      player.y -= 5;
    }
    if (data.right && (player.x + 5) < 800) {
      player.x += 5;
    }
    if (data.down && (player.y + 5) < 600) {
      player.y += 5;
    }
  });
  socket.on('shot', function (data) {
    console.log(socket.id)
    if (players[socket.id]) {
      // Normilize velocity of bullets
      var v1 = {
        x: players[socket.id].x - data.pageX,
        y: players[socket.id].y - data.pageY
      }

      var len = Math.sqrt(v1.x ** 2 + v1.y ** 2);

      vNorm = {
        x: v1.x / len,
        y: v1.y / len
      }

      // Create bullet object
      bullets[i] = {
        player: players[socket.id],
        end: data,
        state: {
          pageX: players[socket.id].x,
          pageY: players[socket.id].y
        },
        velX: vNorm.x * 20,
        velY: vNorm.y * 20
      }
      console.log(bullets[i])
      i++;
    }
  });
  socket.on('start', function () {
    var playerExist = false;
    for (var x in players) {
      var player = players[x];
      if (x == socket.id) {
        playerExist = true;
      }
    }
    if (!playerExist) {
      socket.emit('readd player');
    }
    bullets = {};
    enemies = {};
    if (spawner) {
      clearInterval(spawner);
    }
    enemySpawner = 1000;
    i = 0;
    k = 0;
    console.log('Game started')
    console.log('Speed: ' + enemySpawner)
    spawner = setInterval(generateEnemy, enemySpawner);
    speedUpGame();
  });
  socket.on('disconnect', function () {
    delete players[socket.id];
  })
});

setInterval(function () {
  // Move bullets
  for (var id in bullets) {
    var bullet = bullets[id];
    if (bullet.state.pageX < 0 || bullet.state.pageX > 800 || bullet.state.pageY < 0 || bullet.state.pageY > 600) {
      delete bullets[id];
    } else {
      bullet.state.pageX -= bullet.velX;
      bullet.state.pageY -= bullet.velY;
    }
  }
  // Move enemies
  for (var id in enemies) {
    var enemy = enemies[id];
    if (enemy.x > 399 && enemy.x < 401 && enemy.y > 299 && enemy.y < 301) {
      delete enemies[id];
    }
    else {
      enemy.x -= enemy.velX;
      enemy.y -= enemy.velY;
    }
  }
  // Check hitted enemies
  for (var e in enemies) {
    var enemy = enemies[e];
    for (var id in bullets) {
      var bullet = bullets[id];
      if (enemy.x >= bullet.state.pageX - 30 && enemy.x <= bullet.state.pageX + 30) {
        if (enemy.y >= bullet.state.pageY - 30 && enemy.y <= bullet.state.pageY + 30) {
          console.log('enemies at center')
          delete enemies[e];
        }
      }
    }
  }
  // Check hitted players
  for (var e in enemies) {
    var enemy = enemies[e];
    for (var e in players) {
      var player = players[e];
      if (enemy.x >= player.x - 18 && enemy.x <= player.x + 18) {
        if (enemy.y >= player.y - 18 && enemy.y <= player.y + 18) {
          delete players[e]
          console.log(players)
          console.log(Object.keys(players).length)
          if (Object.keys(players).length === 0) {
            console.log('Game ended')
            io.sockets.emit('end');
          }
        }
      }
    }
  }
  // Sending game state to all clients every 1000 / 60 millisec
  io.sockets.emit('state', players, bullets, enemies);
}, 1000 / 60);
