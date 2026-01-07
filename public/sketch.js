let audioFiles = [];
let players = [];
let moveInterval = 10000;
let lastMoveTime = 0;
let flock;

let connections = [];
let draggingFrom = null;
let draggingCircle = null;
let offsetX = 0;
let offsetY = 0;


let tagLog = {}; // { audioName: [tags] }

let bgImage;

function preload() {
  // Replace with your image path (local or URL)
  bgImage = loadImage('funny.png');
}
// --- AUDIO CIRCLES --- //
class AudioCircle {
  constructor(file) {
    this.fileUrl = file.url;
    this.name = file.name;
    this.tags = tagLog[this.name] || [];

    this.audio = createAudio(this.fileUrl);
    this.audio.hide();

    this.div = createDiv(`<span>${this.name}</span>`);
    this.div.addClass('audio-circle');
    this.div.style('cursor', 'grab');
    this.div.style('user-select', 'none');
    this.div.style('z-index', '2');
    this.div.style('padding', '0px 0px');
    this.div.style('border-radius', '0px');
    this.div.style('width', '100px');
    this.div.style('height', '100px');
    this.div.style('background', '#ffffffff');
    this.div.style('color', '#fff');
    this.div.style('transition', 'background 0.5s, transform 0.5s');

    this.x = random(100, windowWidth - 100);
    this.y = random(100, windowHeight - 100);
    this.tx = this.x;
    this.ty = this.y;
    this.div.position(this.x, this.y);

    // click & drag
    this.div.mousePressed((e) => {
      if (keyIsDown(SHIFT)) {
        draggingFrom = this;
      } else {
        draggingCircle = this;
        offsetX = e.offsetX;
        offsetY = e.offsetY;
        this.div.style('cursor', 'grabbing');
      }
    });

    this.div.mouseClicked((e) => {
      if (e.detail === 1 && !keyIsDown(SHIFT)) {
        this.toggleAudio();
      }
      if (e.detail === 2) this.addTag();
    });
    this.div.elt.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.addTag();
    });
  }

  toggleAudio() {
    if (this.audio.elt.paused) {
      this.audio.play();
      this.div.style('background', '#ffffffff');
      this.div.style('transform', 'scale(1.1)');
    } else {
      this.audio.pause();
      this.div.style('background', '#ffea00ff');
      this.div.style('transform', 'scale(1)');
    }
  }

  addTag() {
    let tag = prompt(`Add a tag for ${this.name}:`);
    if (tag) {
      if (!this.tags.includes(tag)) this.tags.push(tag);
      if (!tagLog[this.name]) tagLog[this.name] = [];
      if (!tagLog[this.name].includes(tag)) tagLog[this.name].push(tag);
      saveState();
    }
  }

  update() {
    if (draggingCircle !== this) {
      this.x = lerp(this.x, this.tx, 0.02);
      this.y = lerp(this.y, this.ty, 0.02);
      this.div.position(this.x, this.y);
    }
  }

  moveToRandom() {
    this.tx = random(100, windowWidth - 100);
    this.ty = random(100, windowHeight - 100);
  }
}

// --- CONNECTION --- //
class Connection {
  constructor(from, to, label) {
    this.from = from;
    this.to = to;
    this.label = label;
  }

  draw() {
    stroke(200);
    strokeWeight(0.8);
    line(this.from.x, this.from.y, this.to.x, this.to.y);
    noStroke();
    fill(255);
    textAlign(CENTER, CENTER);
    text(this.label, (this.from.x + this.to.x) / 2, (this.from.y + this.to.y) / 2 - 10);
  }
}

// --- FLOCK SYSTEM --- //
class Flock {
  constructor() { this.boids = []; }
  run() { for (let b of this.boids) b.run(this.boids); }
  addBoid(b) { this.boids.push(b); }
}

class Boid {
  constructor(x, y) {
    this.acceleration = createVector(0, 0);
    this.velocity = createVector(random(-1, 1), random(-1, 1));
    this.position = createVector(x, y);
    this.size = 1.0;
    this.maxSpeed = 2;
    this.maxForce = 0.02;
  }

  run(boids) {
    this.flock(boids);
    this.update();
    this.borders();
    this.render();
  }

  applyForce(force) { this.acceleration.add(force); }

  flock(boids) {
    let sep = this.separate(boids);
    let ali = this.align(boids);
    let coh = this.cohesion(boids);
    sep.mult(2.5); ali.mult(2.0); coh.mult(2.0);
    this.applyForce(sep); this.applyForce(ali); this.applyForce(coh);
  }

  update() {
    this.velocity.add(this.acceleration);
    this.velocity.limit(this.maxSpeed);
    this.position.add(this.velocity);
    this.acceleration.mult(0);
  }

  seek(target) {
    let desired = p5.Vector.sub(target, this.position);
    desired.normalize(); desired.mult(this.maxSpeed);
    let steer = p5.Vector.sub(desired, this.velocity);
    steer.limit(this.maxForce);
    return steer;
  }

  render() {
    fill(60, 255, 255, 0.5);
    noStroke();
    square(this.position.x, this.position.y, this.size * 30);
  }

  borders() {
    if (this.position.x < -this.size) this.position.x = width + this.size;
    if (this.position.y < -this.size) this.position.y = height + this.size;
    if (this.position.x > width + this.size) this.position.x = -this.size;
    if (this.position.y > height + this.size) this.position.y = -this.size;
  }

  separate(boids) {
    let desiredSeparation = 80.0;
    let steer = createVector(0, 0);
    let count = 20;
    for (let boid of boids) {
      let d = p5.Vector.dist(this.position, boid.position);
      if (d > 0 && d < desiredSeparation) {
        let diff = p5.Vector.sub(this.position, boid.position);
        diff.normalize(); diff.div(d);
        steer.add(diff); count++;
      }
    }
    if (count > 0) steer.div(count);
    if (steer.mag() > 0) {
      steer.normalize(); steer.mult(this.maxSpeed);
      steer.sub(this.velocity); steer.limit(this.maxForce);
    }
    return steer;
  }

  align(boids) {
    let neighborDist = 100;
    let sum = createVector(0, 0);
    let count = 0;
    for (let other of boids) {
      let d = p5.Vector.dist(this.position, other.position);
      if (d > 0 && d < neighborDist) {
        sum.add(other.velocity);
        count++;
      }
    }
    if (count > 0) {
      sum.div(count); sum.normalize(); sum.mult(this.maxSpeed);
      let steer = p5.Vector.sub(sum, this.velocity);
      steer.limit(this.maxForce); return steer;
    }
    return createVector(0, 0);
  }

  cohesion(boids) {
    let neighborDist = 50;
    let sum = createVector(0, 0);
    let count = 0;
    for (let other of boids) {
      let d = p5.Vector.dist(this.position, other.position);
      if (d > 0 && d < neighborDist) {
        sum.add(other.position); count++;
      }
    }
    if (count > 0) { sum.div(count); return this.seek(sum); }
    return createVector(0, 0);
  }
}

// --- LOAD AUDIO FILES --- //
async function loadAudios() {
  try {
    const response = await fetch('/api/videos');
    audioFiles = await response.json();

    players.forEach(p => p.div.remove());
    players.forEach(p => p.audio.remove());
    players = [];

    audioFiles.forEach(file => players.push(new AudioCircle(file)));
    restoreConnections();
    lastMoveTime = millis();
  } catch (err) {
    console.error(err);
  }
}

// --- MAIN SKETCH --- //
function setup() {
  let cnv = createCanvas(windowWidth, windowHeight);
  cnv.position(0, 0);
  cnv.style('z-index', '0');

  colorMode(HSB, 10, 10);
  textFont('font8');
  textSize(16);
  fill(255);

  // --- TOOLBAR --- //
  let toolbar = createDiv();
  toolbar.addClass('toolbar');

  // RESET
  let resetButton = createButton('Reset Connections');
  resetButton.parent(toolbar);
  resetButton.addClass('save');
  // styleBtn(resetButton);
  resetButton.mousePressed(() => {
    connections = [];
    localStorage.removeItem('connections');
  });

  // SAVE
  let saveButton = createButton('Save State');
  saveButton.addClass('save');
  saveButton.parent(toolbar);
  // styleBtn(saveButton);
  saveButton.mousePressed(() => {
    saveState();
    flashButton(saveButton);
  });

  // RECALL HISTORY
  let recallButton = createButton('Recall History');
  recallButton.parent(toolbar);
  toolbar.addClass('recall');
  styleBtn(recallButton);
  recallButton.mousePressed(() => openRecallModal());

  // FLOCK INIT
  flock = new Flock();
  for (let i = 0; i < 100; i++) flock.addBoid(new Boid(random(width), random(height)));

  loadState();
  loadAudios();
}

function styleBtn(btn) {
  btn.style('background', 'transparent');
  btn.style('margin', '10px');
  btn.style('width', '120px');
  btn.style('height','50px');
  btn.style('line-height','20px');
  btn.style('letter-spacing','-1.2px');
  btn.style('border', '0.5px solid #ffffffff');
  btn.style('border-radius', '10px');
  btn.style('font-size','20px');
  btn.style('cursor', 'pointer');
  btn.style ('font-family','font8');
  btn.style('color', '#fff');
}

// --- DRAW LOOP --- //
function draw() {
  image(bgImage, 0, 0, width, height);
  flock.run();
  for (let conn of connections) conn.draw();

  if (draggingFrom) {
    stroke(100, 200, 255);
    strokeWeight(2);
    line(draggingFrom.x, draggingFrom.y, mouseX, mouseY);
  }

  if (draggingCircle) {
    draggingCircle.x = mouseX - offsetX;
    draggingCircle.y = mouseY - offsetY;
    draggingCircle.tx = draggingCircle.x;
    draggingCircle.ty = draggingCircle.y;
    draggingCircle.div.position(draggingCircle.x, draggingCircle.y);
  }

  players.forEach(p => p.update());

  if (millis() - lastMoveTime > moveInterval) {
    players.forEach(p => p.moveToRandom());
    lastMoveTime = millis();
  }
}

function mouseReleased() {
  if (draggingFrom) {
    for (let other of players) {
      if (other !== draggingFrom) {
        let d = dist(mouseX, mouseY, other.x, other.y);
        if (d < 50) {
          let label = prompt('Enter label for this connection:');
          if (label) {
            connections.push(new Connection(draggingFrom, other, label));
            saveState();
          }
          break;
        }
      }
    }
    draggingFrom = null;
  }
  if (draggingCircle) {
    draggingCircle.div.style('cursor', 'grab');
    draggingCircle = null;
  }
}

// --- STATE MANAGEMENT --- //
function saveState() {
  const connData = connections.map(c => ({
    from: c.from.name,
    to: c.to.name,
    label: c.label,
    timestamp: Date.now()
  }));
  localStorage.setItem('tagLog', JSON.stringify(tagLog));
  localStorage.setItem('connections', JSON.stringify(connData));

  // append to history
  let history = JSON.parse(localStorage.getItem('connectionsHistory') || '[]');
  for (let c of connData) {
    const exists = history.some(
      h => h.from === c.from && h.to === c.to && h.label === c.label
    );
    if (!exists) history.push(c);
  }
  localStorage.setItem('connectionsHistory', JSON.stringify(history));
}

function loadState() {
  const savedTags = localStorage.getItem('tagLog');
  const savedConnections = localStorage.getItem('connections');
  if (savedTags) tagLog = JSON.parse(savedTags);
  if (savedConnections) window.savedConnections = JSON.parse(savedConnections);
}

function restoreConnections() {
  if (!window.savedConnections) return;
  for (let c of window.savedConnections) {
    const from = players.find(p => p.name === c.from);
    const to = players.find(p => p.name === c.to);
    if (from && to) connections.push(new Connection(from, to, c.label));
  }
}

// --- RECALL MODAL --- //
function openRecallModal() {
  const history = JSON.parse(localStorage.getItem('connectionsHistory') || '[]');
  if (history.length === 0) {
    alert('No past connections found.');
    return;
  }



  let overlay = createDiv();
  overlay.id('recall-overlay');
  overlay.style('position', 'fixed');
  overlay.style('top', '0');
  overlay.style('left', '0');
  overlay.style('width', '100vw');
  overlay.style('height', '100vh');
  overlay.style('background', '#transparent');
  overlay.style('z-index', '999');
  overlay.style('display', 'flex');
  overlay.style('align-items', 'center');
  overlay.style('justify-content', 'center');

  let modal = createDiv();
  modal.id('recall-modal');
  modal.style('background', '#transparent');
  modal.style('color', '#fff');
  modal.style('padding', '20px');
  modal.style('border-radius', '12px');
  modal.style('width', '500px');
  modal.style('max-height', '70vh');
  modal.style('overflow-y', 'auto');
  modal.style('text-align', 'center');
  modal.style('text-font', 'center');
  modal.style('font-family', 'font8');
  modal.style('color', '#fff');
  modal.style('margin','10px');
  modal.style('line-height','20px');
  modal.style('letter-spacing','-1.2px');
  modal.style('margin','10px');
  modal.style('0.5px','solid','white');
  modal.parent(overlay);

let title = createP('Past Connections');
title.parent(modal);
title.addClass('recall-title');

  // Recall all button
  const recallAllBtn = createButton('Recall All');
  recallAllBtn.parent(modal);
  recallAllBtn.style('margin-bottom', '10px');
  recallAllBtn.style('margin-top', '10px');
  recallAllBtn.style('width','120px');
  recallAllBtn.style('height','30px');
  recallAllBtn.style('font-family', 'font8');
  recallAllBtn.style('font-size', '20px');
  recallAllBtn.style('background', 'transparent');
  recallAllBtn.style('color', '#fff');
  recallAllBtn.style('border-radius', '10px');
  recallAllBtn.style('border', '0.5px solid #ffffffff');
  recallAllBtn.style('overflow-y', 'auto');
  recallAllBtn.mousePressed(() => {
    recallAllConnections();
    overlay.remove();
  });

  history.forEach((c) => {
    const item = createDiv(`${c.from} ➜ ${c.to} <br><i>${c.label}</i>`);
    item.parent(modal);
    item.style('margin', '6px 0');
    item.style('padding', '8px');
    // item.style('border', '0.5px solid #444');
    item.style('border-radius', '8px');
    item.style('cursor', 'pointer');
    // item.mouseOver(() => item.style('background', '#eeff0068'));
    // item.mouseOut(() => item.style('background', '#transparent'));
    item.mousePressed(() => {
      addConnectionFromHistory(c);
      overlay.remove();
    });
  });

  const closeBtn = createButton('Close');
  closeBtn.parent(modal);
  closeBtn.style('margin-top', '10px');
  closeBtn.style('width','93px');
  closeBtn.style('height','30px');
  closeBtn.style('font-family', 'font8');
  closeBtn.style('font-size', '20px');
  closeBtn.style('background', 'transparent');
  closeBtn.style('color', '#fff');
  closeBtn.style('border-radius', '10px');
  closeBtn.style('border', '0.5px solid #ffffffff');
  closeBtn.mousePressed(() => overlay.remove());
}

function addConnectionFromHistory(c) {
  if (!players || players.length === 0) {
    alert('Audio players not loaded yet.');
    return;
  }
  const from = players.find(p => p.name === c.from);
  const to = players.find(p => p.name === c.to);
  if (from && to) {
    connections.push(new Connection(from, to, c.label));
    saveState();
    alert(`Re-added: ${c.label}`);
  } else {
    alert(`Cannot find audio: ${c.from} or ${c.to}`);
  }
}

function recallAllConnections() {
  const history = JSON.parse(localStorage.getItem('connectionsHistory') || '[]');
  if (!players || players.length === 0) {
    setTimeout(recallAllConnections, 500);
    return;
  }
  connections = [];
  for (let c of history) {
    const from = players.find(p => p.name === c.from);
    const to = players.find(p => p.name === c.to);
    if (from && to) connections.push(new Connection(from, to, c.label));
  }
  saveState();
  alert(`Recalled ${connections.length} total connections!`);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  players.forEach(p => p.moveToRandom());
}
