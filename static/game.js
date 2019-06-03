var socket = io();

var movement = {
  up: false,
  down: false,
  left: false,
  right: false
}

document.addEventListener('keydown', function (event) {
  switch (event.keyCode) {
    case 65: // A
      movement.left = true;
      break;
    case 87: // W
      movement.up = true;
      break;
    case 68: // D
      movement.right = true;
      break;
    case 83: // S
      movement.down = true;
      break;
  }
});

document.addEventListener('keyup', function (event) {
  switch (event.keyCode) {
    case 65: // A
      movement.left = false;
      break;
    case 87: // W
      movement.up = false;
      break;
    case 68: // D
      movement.right = false;
      break;
    case 83: // S
      movement.down = false;
      break;
  }
});

socket.emit('new player');
var moves = setInterval(function () {
  socket.emit('movement', movement);
}, 1000 / 60);

var canvas = document.getElementById('canvas');
canvas.width = 800;
canvas.height = 600;
var context = canvas.getContext('2d');
socket.on('state', function (players, bullets, enemies) {
  context.clearRect(0, 0, 800, 600);
  for (var id in players) {
    context.fillStyle = 'green';
    var player = players[id];
    context.beginPath();
    context.arc(player.x, player.y, 10, 0, 2 * Math.PI);
    context.fill();
  }
  for (var id in bullets) {
    context.fillStyle = 'orange';
    var bullet = bullets[id];
    context.beginPath();
    context.arc(bullet.state.pageX, bullet.state.pageY, 5, 0, 2 * Math.PI)
    context.fill();
  }
  for (var id in enemies) {
    context.fillStyle = 'red';
    var enemy = enemies[id];
    context.beginPath();
    context.arc(enemy.x, enemy.y, 15, 0, 2 * Math.PI);
    context.fill();
  }
});

function handler(e) {
  e = e || window.event;

  var pageX = e.pageX;
  var pageY = e.pageY;

  if (pageX === undefined) {
    pageX = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft - 2;
    pageY = e.clientY + document.body.scrollTop + document.documentElement.scrollTop - 2;
  }

  console.log(pageX, pageY);
  socket.emit('shot', {pageX, pageY});
}

if (document.attachEvent) {
  document.attachEvent('onclick', handler)
} else {
  document.addEventListener('click', handler)
}

document.getElementById('start').addEventListener('click', function () {
  socket.emit('start');
  document.getElementById('start').disabled = true;
})

socket.on('readd player', function () {
  socket.emit('new player');
  clearInterval(moves)
  moves = setInterval(function () {
    socket.emit('movement', movement);
  }, 1000 / 60);
})

socket.on('end', function () {
  document.getElementById('start').disabled = false;
});
