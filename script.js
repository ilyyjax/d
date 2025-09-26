// ------------------ START SCREEN ------------------
const startScreen = document.getElementById('startScreen');
const playBtn = document.getElementById('playBtn');
const hotbar = document.getElementById('hotbar');
const crafting = document.getElementById('crafting');
const stats = document.getElementById('stats');
const minimap = document.getElementById('minimap');
const healthEl = document.getElementById('health');
const hungerEl = document.getElementById('hunger');

playBtn.addEventListener('click', () => {
  startScreen.style.display = 'none';
  hotbar.style.display = 'block';
  crafting.style.display = 'block';
  stats.style.display = 'block';
  minimap.style.display = 'block';
  controls.lock();
});

// ------------------ THREE.JS SETUP ------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.set(0,5,0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth,window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new THREE.PointerLockControls(camera,document.body);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff,0.6);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff,0.6);
dirLight.position.set(10,50,10);
scene.add(dirLight);

// ------------------ TEXTURES ------------------
const loader = new THREE.TextureLoader();
const textures = {
  grass: loader.load('https://i.imgur.com/3g5lK0W.png'),
  dirt: loader.load('https://i.imgur.com/3u0VZxv.png'),
  stone: loader.load('https://i.imgur.com/zyB17Qo.png'),
  sand: loader.load('https://i.imgur.com/Vv0Oq3t.png'),
  snow: loader.load('https://i.imgur.com/H9bEohR.png'),
  water: loader.load('https://i.imgur.com/dqVRv1U.png'),
  wood: loader.load('https://i.imgur.com/NnZyySx.png'),
  leaves: loader.load('https://i.imgur.com/oXl5mPb.png'),
  iron: loader.load('https://i.imgur.com/0Zq5nGv.png'),
  coal: loader.load('https://i.imgur.com/wtxWZHP.png'),
  gold: loader.load('https://i.imgur.com/bu4X7Tt.png')
};

const materials = {};
for(const key in textures){ materials[key] = new THREE.MeshStandardMaterial({map:textures[key]}); }

// ------------------ BLOCK GEOMETRY ------------------
const blockSize = 1;
const blockGeo = new THREE.BoxGeometry(blockSize, blockSize, blockSize);

// ------------------ CHUNK SYSTEM ------------------
const chunkSize = 16;
const chunks = new Map();
function getChunkKey(x,z){ return `${x},${z}`; }

// ------------------ TERRAIN GENERATION ------------------
function generateChunk(cx, cz){
  const group = new THREE.Group();
  for(let x=0;x<chunkSize;x++){
    for(let z=0;z<chunkSize;z++){
      const worldX = cx*chunkSize + x;
      const worldZ = cz*chunkSize + z;
      const height = Math.floor(Math.abs(Math.sin(worldX/5)*3 + Math.random()*2));

      for(let y=0;y<height;y++){
        let type;
        if(y===height-1){ type=(height>4)? 'snow':'grass'; }
        else if(y>=height-3){ type='dirt'; }
        else{ type='stone'; }

        // Random ores
        if(type==='stone'){
          const r = Math.random();
          if(r<0.05) type='iron';
          else if(r<0.08) type='coal';
          else if(r<0.09) type='gold';
        }

        const block = new THREE.Mesh(blockGeo, materials[type]);
        block.position.set(worldX, y, worldZ);
        block.userData.type = type;
        group.add(block);
      }

      // Water
      if(height<2){
        const water = new THREE.Mesh(blockGeo, materials['water']);
        water.position.set(worldX,1,worldZ);
        water.userData.type='water';
        group.add(water);
      }

      // Trees on grass
      if(height>1 && Math.random()<0.05){
        const trunkHeight = 2+Math.floor(Math.random()*2);
        for(let t=0;t<trunkHeight;t++){
          const wood = new THREE.Mesh(blockGeo, materials['wood']);
          wood.position.set(worldX, height+t, worldZ);
          wood.userData.type='wood';
          group.add(wood);
        }
        // Leaves
        for(let lx=-1;lx<=1;lx++){
          for(let lz=-1;lz<=1;lz++){
            const leaf = new THREE.Mesh(blockGeo, materials['leaves']);
            leaf.position.set(worldX+lx,height+trunkHeight,worldZ+lz);
            leaf.userData.type='leaves';
            group.add(leaf);
          }
        }
      }
    }
  }
  scene.add(group);
  chunks.set(getChunkKey(cx, cz), group);
}

// Initial chunks
for(let cx=-2;cx<=2;cx++){
  for(let cz=-2;cz<=2;cz++){
    generateChunk(cx, cz);
  }
}

// ------------------ INVENTORY & HOTBAR ------------------
let currentBlock = 'grass';
document.querySelectorAll('#hotbar button').forEach(btn=>btn.addEventListener('click',()=>currentBlock=btn.dataset.block));
document.addEventListener('keydown', e=>{
  if(['1','2','3','4','5','6'].includes(e.key)){
    const keys=['grass','dirt','stone','sand','snow','wood'];
    currentBlock=keys[parseInt(e.key)-1];
  }
});

// ------------------ RAYCASTING ------------------
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function interact(event){
  if(startScreen.style.display!=='none') return;
  event.preventDefault();
  mouse.x=0; mouse.y=0;
  raycaster.setFromCamera(mouse,camera);
  const intersects=raycaster.intersectObjects(scene.children,true);
  if(intersects.length){
    const intersect = intersects[0];
    if(event.button===0 && intersect.object.userData.type!=='water'){
      scene.remove(intersect.object);
    } else if(event.button===2 && currentBlock!=='water'){
      const newBlock = new THREE.Mesh(blockGeo, materials[currentBlock]);
      const pos = intersect.point.clone().add(intersect.face.normal);
      newBlock.position.set(Math.round(pos.x), Math.round(pos.y), Math.round(pos.z));
      newBlock.userData.type = currentBlock;
      scene.add(newBlock);
    }
  }
}
window.addEventListener('mousedown', interact);
window.addEventListener('contextmenu', e=>e.preventDefault());

// ------------------ MOVEMENT & PHYSICS ------------------
const keys = {};
document.addEventListener('keydown', e=>keys[e.key.toLowerCase()]=true);
document.addEventListener('keyup', e=>keys[e.key.toLowerCase()]=false);

let velocityY=0, gravity=0.02, jumpPower=0.3, onGround=false;
let playerHealth=20, playerHunger=20;
const speed=0.15;

function checkCollision(x,y,z){
  for(const obj of scene.children){
    if(obj.position && obj.userData.type!=='water'){
      if(Math.abs(x-obj.position.x)<0.5 && Math.abs(y-obj.position.y)<1 && Math.abs(z-obj.position.z)<0.5){
        return true;
      }
    }
  }
  return false;
}

// ------------------ ANIMATE ------------------
function animate(){
  requestAnimationFrame(animate);

  if(startScreen.style.display!=='none') return;

  if(controls.isLocked){
    const dir=new THREE.Vector3();
    if(keys['w']) dir.z-=speed;
    if(keys['s']) dir.z+=speed;
    if(keys['a']) dir.x-=speed;
    if(keys['d']) dir.x+=speed;

    controls.moveRight(dir.x);
    controls.moveForward(dir.z);

    // Gravity & jumping
    velocityY-=gravity;
    camera.position.y+=velocityY;

    if(camera.position.y<1.5 || checkCollision(camera.position.x,camera.position.y-1,camera.position.z)){
      camera.position.y=1.5;
      velocityY=0;
      onGround=true;
    } else { onGround=false; }

    if(keys[' '] && onGround){ velocityY=jumpPower; onGround=false; }

    // Falling damage
    if(velocityY<-0.5 && !onGround){
      playerHealth -= 0.02;
      if(playerHealth<0) playerHealth=0;
      healthEl.innerText = Math.floor(playerHealth);
    }

    // Hunger decay
    playerHunger -= 0.001;
    if(playerHunger<0) playerHunger=0;
    hungerEl.innerText = Math.floor(playerHunger);

    // Load nearby chunks
    const px = Math.floor(camera.position.x/chunkSize);
    const pz = Math.floor(camera.position.z/chunkSize);
    for(let dx=-2;dx<=2;dx++){
      for(let dz=-2;dz<=2;dz++){
        const key=getChunkKey(px+dx,pz+dz);
        if(!chunks.has(key)) generateChunk(px+dx,pz+dz);
      }
    }
  }

  renderer.render(scene, camera);
}
animate();

// ------------------ WINDOW RESIZE ------------------
window.addEventListener('resize', ()=>{
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
