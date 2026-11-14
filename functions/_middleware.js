let cachedKeys=null,cachedAt=0;
const json=(body,status)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
function decodePart(part){return JSON.parse(atob(part.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(part.length/4)*4,'=')))}
async function accessKeys(team){if(cachedKeys&&Date.now()-cachedAt<3600000)return cachedKeys;const response=await fetch(`${team}/cdn-cgi/access/certs`);if(!response.ok)throw new Error('Cannot retrieve Access signing keys');const data=await response.json();cachedKeys=data.keys||[];cachedAt=Date.now();return cachedKeys}
async function verifiedEmail(request,env){
  if(!env.CF_ACCESS_TEAM_DOMAIN||!env.CF_ACCESS_AUD||!env.ADMIN_EMAIL)return null;
  const token=request.headers.get('cf-access-jwt-assertion');if(!token)return null;
  try{
    const [head,payload,signature]=token.split('.');if(!head||!payload||!signature)return null;
    const header=decodePart(head),claims=decodePart(payload);if(header.alg!=='RS256')return null;
    const team=String(env.CF_ACCESS_TEAM_DOMAIN).replace(/\/$/,'');
    if(claims.iss!==team||!Array.isArray(claims.aud)&&claims.aud!==env.CF_ACCESS_AUD||Array.isArray(claims.aud)&&!claims.aud.includes(env.CF_ACCESS_AUD)||!claims.exp||claims.exp<=Math.floor(Date.now()/1000))return null;
    const jwk=(await accessKeys(team)).find(key=>key.kid===header.kid&&key.kty==='RSA');if(!jwk)return null;
    const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
    const signed=new TextEncoder().encode(`${head}.${payload}`),sig=Uint8Array.from(atob(signature.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(signature.length/4)*4,'=')),c=>c.charCodeAt(0));
    if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,sig,signed))return null;
    const email=String(claims.email||'').toLowerCase();return email===String(env.ADMIN_EMAIL).toLowerCase()?email:null;
  }catch(error){console.error('Access JWT validation failed',error);return null}
}
export async function onRequest(context){
  const path=new URL(context.request.url).pathname;
  if(!path.startsWith('/admin')&&!path.startsWith('/api/admin/'))return context.next();
  const email=await verifiedEmail(context.request,context.env);
  if(!email){if(path.startsWith('/api/'))return json({error:'Administrator access required.'},401);return new Response('Administrator access is not configured or your account is not allowed.',{status:403,headers:{'content-type':'text/plain; charset=utf-8','cache-control':'no-store'}})}
  context.data.adminEmail=email;return context.next();
}
