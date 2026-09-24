import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

interface Surface {base:string;skin:string;accent:string}
export interface TableSequence {
  update:()=>boolean;
  resize?:(width:number,height:number)=>void;
  dispose:()=>void;
}
export type DecorateTable=(scene:THREE.Scene,camera:THREE.OrthographicCamera,renderer:THREE.WebGLRenderer)=>TableSequence;

export function mountTable(host:HTMLElement,surface:Surface,onReady:()=>void,onLost:()=>void,decorate?:DecorateTable) {
  let renderer:THREE.WebGLRenderer;
  try { renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:"low-power"}); }
  catch { onLost();return()=>{}; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=.95;
  const canvas=renderer.domElement;
  canvas.className="mindi-table-canvas";
  host.appendChild(canvas);
  const scene=new THREE.Scene();
  const camera=new THREE.OrthographicCamera(-8,8,5,-5,.1,80);
  camera.position.set(0,12,9.5);camera.lookAt(0,0,0);
  function makeEnvironment(){
    const pmrem=new THREE.PMREMGenerator(renderer);
    const room=new RoomEnvironment();
    const result=pmrem.fromScene(room,.06);
    room.dispose();pmrem.dispose();return result;
  }
  let environment=makeEnvironment();
  scene.environment=environment.texture;
  const group=new THREE.Group();scene.add(group);
  const gold=new THREE.MeshStandardMaterial({color:"#c68e32",metalness:.85,roughness:.23,envMapIntensity:1.1});
  const edgeGold=new THREE.MeshStandardMaterial({color:"#e6b65e",metalness:.85,roughness:.19,envMapIntensity:1.2});
  const bronze=new THREE.MeshStandardMaterial({color:"#75512d",metalness:.75,roughness:.34});
  const leather=new THREE.MeshStandardMaterial({color:"#080c12",metalness:0,roughness:.65});
  const structure=new THREE.MeshStandardMaterial({color:"#0c1017",metalness:.45,roughness:.32});

  // Small deterministic woven texture; no downloads, meshes, or photo assets per skin.
  const textile=document.createElement("canvas");textile.width=textile.height=512;
  const ctx=textile.getContext("2d")!;
  ctx.fillStyle=surface.base;ctx.fillRect(0,0,512,512);
  for(let y=0;y<512;y+=3)for(let x=0;x<512;x+=3){
    ctx.fillStyle=`rgba(255,255,255,${((x*17+y*31)%11)/200})`;
    ctx.fillRect(x,y,1,2);
  }
  ctx.strokeStyle="#d0d9e40b";ctx.lineWidth=.75;
  for(let y=-12;y<524;y+=12){
    ctx.beginPath();
    for(let x=0;x<=512;x+=8)ctx.lineTo(x,y+(x%16===0?0:3));
    ctx.stroke();
  }
  if(["tt_gold","tt_vip","tt_wooden","tt_ice","tt_lava"].includes(surface.skin)){
    ctx.strokeStyle=surface.accent;ctx.globalAlpha=.12;ctx.lineWidth=2;
    for(let x=-512;x<1024;x+=22){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+(surface.skin==="tt_lava"?512:surface.skin==="tt_ice"?-256:0),512);ctx.stroke();}
    ctx.globalAlpha=1;
  }
  if(surface.skin==="tt_space")for(let i=0;i<70;i++){ctx.fillStyle="#c6c4e580";ctx.fillRect((i*137)%512,(i*97)%512,1.5,1.5);}
  const texture=new THREE.CanvasTexture(textile);texture.colorSpace=THREE.SRGBColorSpace;
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(3,3);
  texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
  const felt=new THREE.MeshPhysicalMaterial({map:texture,roughness:1,metalness:0,specularIntensity:.05,bumpMap:texture,bumpScale:.07,envMapIntensity:0});
  function layer(radius:number,height:number,y:number,material:THREE.Material){
    const geometry=new THREE.CylinderGeometry(radius,radius,height,128);
    const mesh=new THREE.Mesh(geometry,material);mesh.scale.x=1.53;mesh.position.y=y;group.add(mesh);return mesh;
  }
  function ring(radius:number,tube:number,y:number,material:THREE.Material){
    const mesh=new THREE.Mesh(new THREE.TorusGeometry(radius,tube,12,160),material);
    mesh.rotation.x=-Math.PI/2;mesh.scale.set(1.53,1,1);mesh.position.y=y;group.add(mesh);
  }
  layer(4.65,.52,-.25,structure);
  layer(4.62,.19,-.02,bronze);
  layer(4.58,.10,.11,gold);
  ring(4.56,.055,.19,edgeGold);
  ring(4.3,.17,.2,leather);
  ring(4.06,.035,.24,edgeGold);
  layer(4.04,.085,.135,felt);
  ring(3.89,.008,.182,bronze);
  ring(3.77,.005,.181,bronze);
  // Engraved segments and stitching follow the same ellipse as the padded rail.
  for(let i=0;i<64;i++){
    const angle=i/64*Math.PI*2;
    const stitch=new THREE.Mesh(new THREE.BoxGeometry(.028,.012,.055),bronze);
    stitch.position.set(Math.cos(angle)*4.2*1.53,.412,Math.sin(angle)*4.2);stitch.rotation.y=-angle;group.add(stitch);
  }
  for(let i=0;i<20;i++){
    const angle=i/20*Math.PI*2;
    const seam=new THREE.Mesh(new THREE.BoxGeometry(.045,.018,.2),edgeGold);
    seam.position.set(Math.cos(angle)*4.53*1.53,.23,Math.sin(angle)*4.53);seam.rotation.y=-angle;group.add(seam);
  }
  scene.add(new THREE.HemisphereLight("#b9d4ee","#21130b",.95));
  const key=new THREE.DirectionalLight("#ffe0a3",2);key.position.set(-5,8,3);scene.add(key);
  const fill=new THREE.DirectionalLight("#a9d9f4",.6);fill.position.set(4,5,-6);scene.add(fill);
  const sequence=decorate?.(scene,camera,renderer);
  let frame=0, lost=false, dead=false;
  const reduced=window.matchMedia("(prefers-reduced-motion: reduce)");
  function paint(){
    frame=0;if(dead||lost||document.hidden)return;
    const moving=sequence?.update();renderer.render(scene,camera);onReady();
    if(moving)requestPaint();
  }
  function requestPaint(){if(!frame&&!dead)frame=requestAnimationFrame(paint);}
  function resize(){
    const {width,height}=host.getBoundingClientRect();if(!width||!height)return;
    renderer.setSize(width,height);sequence?.resize?.(width,height);requestPaint();
  }
  // Light follows the pointer slightly; no perpetual animation loop or table motion.
  function pointer(event:PointerEvent){
    if(reduced.matches||event.pointerType!=="mouse")return;
    const rect=host.getBoundingClientRect();key.position.x=-5+(event.clientX-rect.left)/rect.width*2;requestPaint();
  }
  function loss(event:Event){event.preventDefault();lost=true;onLost();}
  function restore(){
    if(dead)return;
    environment.dispose();environment=makeEnvironment();scene.environment=environment.texture;
    lost=false;requestPaint();
  }
  canvas.addEventListener("webglcontextlost",loss);canvas.addEventListener("webglcontextrestored",restore);
  host.parentElement?.addEventListener("pointermove",pointer);
  document.addEventListener("visibilitychange",requestPaint);
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(host);resize();
  return()=>{
    dead=true;cancelAnimationFrame(frame);resizeObserver.disconnect();
    host.parentElement?.removeEventListener("pointermove",pointer);
    document.removeEventListener("visibilitychange",requestPaint);
    canvas.removeEventListener("webglcontextlost",loss);canvas.removeEventListener("webglcontextrestored",restore);
    sequence?.dispose();
    const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();
    scene.traverse(object=>{if(object instanceof THREE.Mesh){geometries.add(object.geometry);(Array.isArray(object.material)?object.material:[object.material]).forEach(material=>materials.add(material));}});
    geometries.forEach(geometry=>geometry.dispose());materials.forEach(material=>material.dispose());
    texture.dispose();environment.dispose();renderer.dispose();canvas.remove();
  };
}
