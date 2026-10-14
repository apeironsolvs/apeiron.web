/* ==========================================================================
   Apeiron Solutions — 3D Particle Constellation & WebGL Scene Engine
   Three.js r128 WebGL visualization with shape morphing & edge topology
   ========================================================================== */

const TAU = Math.PI * 2;
const wrapPI = a => ((a + Math.PI) % TAU + TAU) % TAU - Math.PI;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const isMobile = () => innerWidth < 820;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;

function mulberry(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* FNV-1a string hash (also used by main.js; kept local so the module is self-contained) */
function hash(s){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}

export function initScene({ state, secs, intakeSec }) {
  const st = state;
  const $ = (s, r = document) => r.querySelector(s);

function initGL(){
  if(!window.THREE)throw new Error('three missing');
  const mobile=isMobile()||coarse,cores=navigator.hardwareConcurrency||4;
  const N=mobile?1200:(cores<=4?1900:2800),NN=mobile?160:270;
  const canvas=$('#gl');
  const renderer=new THREE.WebGLRenderer({canvas,antialias:false,alpha:true,powerPreference:'high-performance'});
  renderer.setClearColor(0x000000,0);
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(42,1,.1,50);camera.position.z=7.2;
  const group=new THREE.Group();scene.add(group);

  /* shapes */
  const T={x:0,y:0};
  const sph=(r,R,o)=>{const u=r()*2-1,t=r()*TAU,s=Math.sqrt(1-u*u);o.x=R*s*Math.cos(t);o.y=R*u;o.z=R*s*Math.sin(t)};
  const rectPt=(r,x0,y0,x1,y1,edge,o)=>{
    if(r()<edge){
      const w=x1-x0,h=y1-y0;let d=r()*2*(w+h);
      if(d<w){o.x=x0+d;o.y=y0}else{d-=w;if(d<h){o.x=x1;o.y=y0+d}else{d-=h;if(d<w){o.x=x1-d;o.y=y1}else{d-=w;o.x=x0;o.y=y1-d}}}
    }else{o.x=x0+r()*(x1-x0);o.y=y0+r()*(y1-y0)}
  };
  const disc=(r,R,edge,o)=>{const t=r()*TAU,q=r()<edge?R:R*Math.sqrt(r());o.x=q*Math.cos(t);o.y=q*Math.sin(t)};
  const knot=(p,q,R,rr,jit,groups)=>(i,r,o)=>{
    const t=r()*TAU,k=R+rr*Math.cos(q*t);
    o.x=k*Math.cos(p*t)+(r()-.5)*jit;o.y=rr*1.3*Math.sin(q*t)+(r()-.5)*jit;o.z=k*Math.sin(p*t)+(r()-.5)*jit;o.g=Math.floor(t/TAU*groups);
  };
  const C7=[[-2.5,1.25,.2],[-.3,1.9,-.5],[2.2,1.1,.3],[-2.0,-.9,-.3],[.2,-.2,.9],[2.5,-1.1,-.2],[.6,-1.8,-.6]];
  const SY=[1.4,.7,0,-.7,-1.4];
  const WR=[[-1.9,.95,1.9,1.3],[-1.9,-1.3,-.65,.8],[-.5,.05,1.9,.8],[-.5,-.95,1.9,-.15],[-.5,-1.3,1.9,-1.05]];
  const chain=k=>{
    const pt=j=>[-2.3+4.6*j/(k-1),(j%2?.5:-.5)*.9,Math.sin(j*1.7)*.4];
    return(i,r,o)=>{
      const j=i%k;
      if(r()<.5){const c=pt(j);sph(r,.2*Math.cbrt(r()),o);o.x+=c[0];o.y+=c[1];o.z+=c[2];o.g=j}
      else{const jj=Math.min(j,k-2),a=pt(jj),b=pt(jj+1),t=r();o.x=lerp(a[0],b[0],t);o.y=lerp(a[1],b[1],t);o.z=lerp(a[2],b[2],t);o.g=jj}
    };
  };
  const knotA=knot(2,3,1.1,.5,.06,6),knotC=knot(3,4,1.0,.6,.14,4);
  const SH={
    point:(i,r,o)=>{sph(r,.035*r(),o);o.g=0},
    nebula:(i,r,o)=>{sph(r,1.5*Math.pow(r(),.55),o);o.y*=.8;o.g=i%4},
    fragments:(i,r,o)=>{const k=i%7,c=C7[k];sph(r,.4*Math.cbrt(r()),o);o.x+=c[0];o.y+=c[1];o.z+=c[2];o.g=k},
    lattice:(i,r,o)=>{
      const ax=Math.floor(r()*3),a=(Math.floor(r()*7)-3)*.5,b=(Math.floor(r()*7)-3)*.5,c=(r()*2-1)*1.5;
      if(ax===0){o.x=c;o.y=a;o.z=b}else if(ax===1){o.x=a;o.y=c;o.z=b}else{o.x=a;o.y=b;o.z=c}o.g=ax;
    },
    stack:(i,r,o)=>{
      const k=i%5;o.g=k;
      if(r()<.1){o.x=(r()<.5?-1:1)*1.4;o.z=(r()<.5?-1:1)*.8;o.y=(r()*2-1)*1.4;o.g=clamp(Math.round((1.4-o.y)/.7),0,4);return}
      if(k<3){rectPt(r,-1.5,-.9,1.5,.9,.55,T);o.x=T.x;o.z=T.y;o.y=SY[k]}
      else if(k===3){disc(r,1,.6,T);o.x=T.x;o.z=T.y;o.y=SY[3]+(Math.floor(r()*3)-1)*.14}
      else{o.x=(Math.floor(r()*7)-3)*.45;o.z=(Math.floor(r()*5)-2)*.45;o.y=SY[4]+(r()-.5)*.04}
    },
    columns:(i,r,o)=>{
      const ix=Math.floor(r()*6),iz=Math.floor(r()*6),h=.3+((ix*7+iz*13)%9)/9*2;
      o.x=(ix-2.5)*.5;o.z=(iz-2.5)*.5;o.y=-1.2+r()*h;
      if(r()<.2){o.x+=(r()-.5)*.25;o.z+=(r()-.5)*.25;o.y=-1.2+h}
      o.g=(ix+iz)%5;
    },
    knot:knotA,
    sphere:(i,r,o)=>{
      const m=i%10;
      if(m<6){sph(r,1.7+(r()-.5)*.06,o);o.g=0}
      else if(m<8){sph(r,.55*Math.cbrt(r()),o);o.g=1}
      else{const t=r()*TAU,a=[0,.9,-.9][i%3];o.x=2.1*Math.cos(t);o.y=2.1*Math.sin(t)*Math.cos(a);o.z=2.1*Math.sin(t)*Math.sin(a);o.g=2}
    },
    expand:(i,r,o)=>{
      if(i%5===0){const t=r()*TAU;o.x=3*Math.cos(t);o.y=(r()-.5)*.1;o.z=3*Math.sin(t);o.g=1}
      else{sph(r,1.1+Math.pow(r(),.7)*1.9,o);o.g=0}
    },
    web:(i,r,o)=>{const k=i%5,q=WR[k];rectPt(r,q[0],q[1],q[2],q[3],k===2?.5:.7,T);o.x=T.x;o.y=T.y;o.z=k*.08+(r()-.5)*.04;o.g=k},
    mobile:(i,r,o)=>{
      const k=i%4;o.g=k;
      if(k<2){
        if(r()<.45)rectPt(r,-.7,-1.4,.7,1.4,.9,T);else rectPt(r,-.58,-1.1,.58,1.1,0,T);
        o.x=(k?.62:-.62)+T.x;o.y=T.y+(k?.1:-.1);o.z=k?-.15:.15;
      }else if(k===2){const t=r()*TAU;o.x=2.1*Math.cos(t);o.z=1.4*Math.sin(t);o.y=.25*Math.sin(3*t)}
      else{o.x=-.62+(Math.floor(r()*4)-1.5)*.28;o.y=-.1+(Math.floor(r()*5)-2)*.3;o.z=.3}
    },
    ai:(()=>{
      const R=mulberry(77),L=[-1.8,-.6,.6,1.8],cnt=[4,6,6,3];
      const nodes=L.map((x,l)=>Array.from({length:cnt[l]},(_,j)=>[x,(j-(cnt[l]-1)/2)*.45,(R()-.5)*.5]));
      return(i,r,o)=>{
        const l=i%4;
        if(r()<.55){const n=nodes[l][Math.floor(r()*nodes[l].length)];sph(r,.1*Math.cbrt(r()),o);o.x+=n[0];o.y+=n[1];o.z+=n[2];o.g=l}
        else{const l2=Math.min(l,2),a=nodes[l2][Math.floor(r()*nodes[l2].length)],b=nodes[l2+1][Math.floor(r()*nodes[l2+1].length)],t=r();
          o.x=lerp(a[0],b[0],t);o.y=lerp(a[1],b[1],t);o.z=lerp(a[2],b[2],t);o.g=l2}
      };
    })(),
    cloud:(i,r,o)=>{
      const k=i%10;
      if(k<5){const B=[[-.7,.9,0,.6],[0,1.2,.1,.8],[.8,.9,0,.6],[.1,.8,.4,.6]],b=B[Math.floor(r()*4)];sph(r,b[3],o);o.x+=b[0];o.y+=b[1];o.z+=b[2];o.g=0}
      else if(k<7){o.x=(Math.floor(r()*5)-2)*.6;o.y=.45-r()*1.1;o.z=0;o.g=1}
      else{const b=Math.floor(r()*3),y0=-.9-b*.4;rectPt(r,-1.5,y0,1.5,y0+.28,.7,T);o.x=T.x;o.y=T.y;o.z=(r()-.5)*.6;o.g=2}
    },
    data:(i,r,o)=>{
      const k=i%3;o.g=k;
      if(k===0){
        if(r()<.25){const t=r()*TAU;o.x=.9*Math.cos(t);o.z=.72*Math.sin(t);o.y=(r()*2-1)*.55}
        else{disc(r,.9,.55,T);o.x=T.x;o.z=T.y*.8;o.y=(Math.floor(r()*3)-1)*.55}
      }else if(k===1){const t=r(),a=t*TAU*2.5;o.x=-2.3+t*1.3;o.y=Math.sin(a)*.35;o.z=Math.cos(a)*.35}
      else{const b=Math.floor(r()*5),h=.3+((b*5+2)%5)*.3;o.x=1.4+b*.22;o.y=-1+r()*h;o.z=(r()-.5)*.1}
    },
    automation:(i,r,o)=>{
      const k=i%3,t=r()*TAU,a=k*Math.PI/3,x=1.5*Math.cos(t),y=1.35*Math.sin(t),z=(r()-.5)*.05;
      o.x=x*Math.cos(a)+z*Math.sin(a);o.y=y;o.z=-x*Math.sin(a)+z*Math.cos(a);o.g=k;
    },
    custom:(i,r,o)=>{if(r()<.15){sph(r,2.4*Math.cbrt(r())+.4,o);o.g=3}else knotC(i,r,o)},
    team:(i,r,o)=>{
      const k=i%8;o.g=k;
      switch(k){
        case 0:sph(r,.4*Math.cbrt(r()),o);break;
        case 1:rectPt(r,-1.2,-.8,1.2,.8,.6,T);o.x=T.x;o.y=T.y;o.z=1.3;break;
        case 2:{const t=r()*TAU,q=1.3*(r()<.5?1:Math.sqrt(r()));o.x=q*Math.cos(t);o.z=q*Math.sin(t);o.y=1.0;break}
        case 3:{const a=r()<.5?-.55:.55,b=r()<.5?-.55:.55,c=(r()*2-1)*.55,ax=Math.floor(r()*3);
          if(ax===0){o.x=c;o.y=a;o.z=b}else if(ax===1){o.x=a;o.y=c;o.z=b}else{o.x=a;o.y=b;o.z=c}break}
        case 4:sph(r,.7,o);o.x+=1.5;o.y+=.2;o.z-=.4;break;
        case 5:disc(r,.5,.6,T);o.x=T.x-1.5;o.z=T.y;o.y=-.7+(Math.floor(r()*3)-1)*.28;break;
        case 6:{const t=r()*TAU;o.x=1.9*Math.cos(t);o.z=1.9*Math.sin(t);o.y=1.75+.2*Math.sin(2*t);break}
        default:sph(r,2.35,o);
      }
    },
    chain5:chain(5),chain6:chain(6),
    blueprint:(i,r,o)=>{
      const k=i%8;o.g=k;
      if(k===7){sph(r,.3*Math.cbrt(r()),o);return}
      const a=k/7*TAU,cx=1.6*Math.cos(a),cy=1.6*Math.sin(a)*.8,cz=k%2?.4:-.4;
      if(r()<.7){sph(r,.3*Math.cbrt(r()),o);o.x+=cx;o.y+=cy;o.z+=cz}
      else{const t=r();o.x=cx*t;o.y=cy*t;o.z=cz*t}
    }
  };
  const FLAT=new Set(['web','mobile','ai','stack','cloud','data','team','blueprint','chain5','chain6']);
  const TILT={stack:.35,team:.25,cloud:.1,data:.15,blueprint:.1};
  const cache={};
  function getShape(key){
    if(cache[key])return cache[key];
    const P=new Float32Array(N*3),G=new Uint8Array(N),r=mulberry(hash(key)),o={x:0,y:0,z:0,g:0},f=SH[key];
    for(let i=0;i<N;i++){o.x=o.y=o.z=0;o.g=0;f(i,r,o);P[i*3]=o.x;P[i*3+1]=o.y;P[i*3+2]=o.z;G[i]=o.g}
    return cache[key]={P,G};
  }

  /* points */
  const pos=new Float32Array(N*3),cur=new Float32Array(N*3),hotA=new Float32Array(N),alA=new Float32Array(N),sz=new Float32Array(N);
  for(let i=0;i<N;i++)sz[i]=i<NN?5.2+Math.random()*2.6:2.4+Math.random()*1.6;
  cur.set(getShape('point').P);pos.set(cur);alA.fill(.9);
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  geo.setAttribute('aHot',new THREE.BufferAttribute(hotA,1));
  geo.setAttribute('aAlpha',new THREE.BufferAttribute(alA,1));
  geo.setAttribute('aSize',new THREE.BufferAttribute(sz,1));
  const mat=new THREE.ShaderMaterial({
    uniforms:{uPR:{value:1},uCyan:{value:new THREE.Color(0x38d5ff)}},
    vertexShader:`attribute float aHot;attribute float aAlpha;attribute float aSize;uniform float uPR;varying float vHot;varying float vA;
      void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*mv;
      gl_PointSize=aSize*(1.0+aHot*0.85)*uPR*(7.2/-mv.z);vHot=aHot;vA=aAlpha*(0.5+0.5*clamp(1.0-(-mv.z-5.0)/6.0,0.0,1.0));}`,
    fragmentShader:`uniform vec3 uCyan;varying float vHot;varying float vA;
      void main(){float d=length(gl_PointCoord-0.5);if(d>0.5)discard;
      float core=smoothstep(0.18,0.0,d);float halo=smoothstep(0.5,0.04,d);float glow=pow(max(0.0,1.0-d*2.0),2.0);
      float a=(halo*0.65+glow*0.35);
      vec3 electricBlue=vec3(0.06,0.65,1.0);vec3 brightCyan=uCyan;
      vec3 baseColor=mix(electricBlue,brightCyan,clamp(vHot*0.7+0.4,0.0,1.0));
      vec3 finalColor=mix(baseColor,vec3(1.0,1.0,1.0),core*0.88);
      float brightness=0.85+0.45*clamp(vHot,0.0,1.0);
      gl_FragColor=vec4(finalColor,clamp(a*vA*brightness,0.0,1.0));}`,
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending
  });
  const points=new THREE.Points(geo,mat);points.frustumCulled=false;group.add(points);

  /* lines between nearby nodes */
  const ME=NN*2,lp=new Float32Array(ME*6),lc=new Float32Array(ME*6),E=new Int16Array(ME*2);
  const lgeo=new THREE.BufferGeometry();
  lgeo.setAttribute('position',new THREE.BufferAttribute(lp,3));
  lgeo.setAttribute('color',new THREE.BufferAttribute(lc,3));
  lgeo.setDrawRange(0,0);
  const lines=new THREE.LineSegments(lgeo,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
  lines.frustumCulled=false;group.add(lines);
  let ne=0;const MAXD=1.2,MAXD2=MAXD*MAXD;
  function rebuildEdges(){
    ne=0;
    for(let a=0;a<NN;a++){
      let b1=-1,b2=-1,d1=1e9,d2=1e9;const ax=pos[a*3],ay=pos[a*3+1],az=pos[a*3+2];
      for(let b=0;b<NN;b++){
        if(b===a)continue;
        const dx=ax-pos[b*3],dy=ay-pos[b*3+1],dz=az-pos[b*3+2],d=dx*dx+dy*dy+dz*dz;
        if(d<d1){d2=d1;b2=b1;d1=d;b1=b}else if(d<d2){d2=d;b2=b}
      }
      if(b1>=0&&d1<MAXD2){E[ne++]=a;E[ne++]=b1}
      if(b2>=0&&d2<MAXD2){E[ne++]=a;E[ne++]=b2}
    }
  }

  /* pointer */
  let px=0,py=0,spx=0,spy=0,pulseT=-1,moved=false;
  addEventListener('pointermove',e=>{moved=true;px=e.clientX/innerWidth*2-1;py=e.clientY/innerHeight*2-1},{passive:true});
  addEventListener('pointerdown',e=>{if(!e.target.closest('button,a,input,textarea,label,.intake'))pulseT=0},{passive:true});
  const mv=new THREE.Vector3();
  let gx=0,gy=0,gs=1,spin=0,frame=0,lastSpec='point';
  const ht=new Float32Array(16),at=new Float32Array(16);

  function resize(){
    const w=innerWidth,h=innerHeight,pr=Math.min(devicePixelRatio||1,mobile?1.5:1.75);
    renderer.setPixelRatio(pr);renderer.setSize(w,h,false);
    camera.aspect=w/h;camera.updateProjectionMatrix();mat.uniforms.uPR.value=pr;
  }
  let lw=innerWidth,lh=innerHeight;resize();
  addEventListener('resize',()=>{if(innerWidth!==lw||Math.abs(innerHeight-lh)>140){lw=innerWidth;lh=innerHeight;resize()}});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();document.body.classList.add('no-gl');GL=null});

  function render(sc,dt,t){
    const {s,spec,pspec,enter,act,aspec}=sc;
    const A=getShape(spec.a).P,B=getShape(spec.b||spec.a).P,C=getShape(pspec.a).P,D=getShape(pspec.b||pspec.a).P;
    const su=spec.u||0,pu=pspec.u||0;
    const gKey=(aspec.u||0)>.5?(aspec.b||aspec.a):aspec.a,GS=getShape(gKey).G;
    const k=reduce?1:1-Math.exp(-dt*3),k2=reduce?1:1-Math.exp(-dt*6),k3=1-Math.exp(-dt*3);

    /* camera & group transform */
    const mob=isMobile(),vH=2*Math.tan(21*Math.PI/180)*7.2,vW=vH*camera.aspect;
    const fit=Math.min(1,(vW+3)/9);
    const link=lerp(pspec.link??1,spec.link??1,enter),scl=lerp(pspec.scale??1,spec.scale??1,enter)*fit*(mob?1.1:1.2);
    const ox=mob?0:lerp((secs[secs.indexOf(s)-1]||s).ox??0,s.ox,enter),oy=mob?vH*.2:0;
    const useOx=st.intake.open&&!mob?intakeSec.ox:ox;
    spx+=(px-spx)*k3;spy+=(py-spy)*k3;
    camera.position.x=spx*.25;camera.position.y=-spy*.18;camera.lookAt(0,0,0);
    gx+=((st.intake.open&&!mob?intakeSec.ox:useOx)*vW-gx)*k3;gy+=(oy-gy)*k3;gs+=(scl-gs)*k3;
    group.position.set(gx,gy,0);group.scale.setScalar(gs);
    const flat=FLAT.has(aspec.a);
    if(!reduce)spin+=dt*.09;
    const ty=flat?(reduce?0:Math.sin(t*.35)*.5)+spx*.3:spin+spx*.3;
    group.rotation.y=wrapPI(group.rotation.y);
    group.rotation.y+=wrapPI(ty-group.rotation.y)*(1-Math.exp(-dt*2.5));
    group.rotation.x+=((TILT[aspec.a]||.06)+spy*.15-group.rotation.x)*k3;
    group.updateMatrixWorld(true);

    /* pointer in local space */
    const mon=!coarse&&!reduce&&moved;
    if(mon){mv.set(spx*Math.tan(21*Math.PI/180)*7.2*camera.aspect,-spy*Math.tan(21*Math.PI/180)*7.2,0);group.worldToLocal(mv)}
    const R=1.15/Math.max(.3,gs),R2=R*R;

    /* group targets */
    for(let g=0;g<16;g++){ht[g]=act.hot(g,t);at[g]=act.alive?act.alive(g,t):1}
    if(pulseT>=0){pulseT+=dt;if(pulseT>1.6)pulseT=-1}

    for(let i=0,j=0;i<N;i++,j+=3){
      for(let c=0;c<3;c++){
        const q=j+c,cc=C[q]+(D[q]-C[q])*pu,aa=A[q]+(B[q]-A[q])*su;
        cur[q]+=(cc+(aa-cc)*enter-cur[q])*k;
      }
      let x=cur[j],y=cur[j+1],z=cur[j+2];
      if(mon){
        const dx=x-mv.x,dy=y-mv.y,dz=z-mv.z,d2=dx*dx+dy*dy+dz*dz*.3;
        if(d2<R2){const f=1-d2/R2,inv=f*f*.4/(Math.sqrt(d2)+.08);x+=dx*inv;y+=dy*inv;z+=dz*inv*.5}
      }
      pos[j]=x;pos[j+1]=y;pos[j+2]=z;
      const g=GS[i]&15;
      let th=ht[g]+(i<NN?.3:0);
      if(pulseT>=0){const rad=Math.sqrt(x*x+y*y+z*z),w=Math.exp(-Math.pow((rad-pulseT*3.4)*1.5,2));th+=w*1.2*(1-pulseT/1.6)}
      hotA[i]+=(th-hotA[i])*k2;alA[i]+=(at[g]*.9-alA[i])*k2;
    }
    geo.attributes.position.needsUpdate=true;geo.attributes.aHot.needsUpdate=true;geo.attributes.aAlpha.needsUpdate=true;

    /* lines */
    if(frame%8===0)rebuildEdges();
    frame++;
    const amt=clamp(link)*.5;
    for(let e=0,v=0;e<ne;e+=2,v+=6){
      const a=E[e]*3,b=E[e+1]*3;
      lp[v]=pos[a];lp[v+1]=pos[a+1];lp[v+2]=pos[a+2];lp[v+3]=pos[b];lp[v+4]=pos[b+1];lp[v+5]=pos[b+2];
      const dx=pos[a]-pos[b],dy=pos[a+1]-pos[b+1],dz=pos[a+2]-pos[b+2];
      const fade=clamp(1-Math.sqrt(dx*dx+dy*dy+dz*dz)/MAXD)*amt*(.45+.55*clamp((hotA[E[e]]+hotA[E[e+1]])*.5));
      lc[v]=lc[v+3]=.20*fade;lc[v+1]=lc[v+4]=.86*fade;lc[v+2]=lc[v+5]=fade;
    }
    lgeo.setDrawRange(0,ne);lgeo.attributes.position.needsUpdate=true;lgeo.attributes.color.needsUpdate=true;
    renderer.render(scene,camera);
  }
  return{render};
}


  try {
    return initGL();
  } catch (err) {
    document.body.classList.add('no-gl');
    console.warn('3D disabled:', err && err.message);
    return null;
  }
}
