const JSON_HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'no-store'};
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:JSON_HEADERS});
const text=(value,max=500)=>typeof value==='string'?value.trim().slice(0,max):'';

export async function onRequestPost({request,env}){
  if(!env.ORDERS_DB)return reply({error:'Order service is not configured yet.'},503);
  const origin=request.headers.get('origin');
  if(!origin)return reply({error:'Origin is required.'},403);
  try{if(new URL(origin).host!==new URL(request.url).host)return reply({error:'Cross-origin submission is not allowed.'},403)}catch{return reply({error:'Invalid origin.'},403)}
  const length=Number(request.headers.get('content-length')||0);if(length>16000)return reply({error:'Specification is too large.'},413);
  let input;try{const raw=await request.text();if(raw.length>16000)return reply({error:'Specification is too large.'},413);input=JSON.parse(raw)}catch{return reply({error:'Invalid request body.'},400)}
  if(text(input.honeypot,200))return reply({ok:true,orderId:'received'});
  const email=text(input.email,254),market=text(input.market,120);
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return reply({error:'Enter a valid email address.'},422);
  if(!market)return reply({error:'Delivery market is required.'},422);
  if(input.consent!==true)return reply({error:'Consent is required to store this request.'},422);
  const partKeys=['shell','palm','web','laces','binding','welting','lining','stitching','logo','leather1','leather2','leather3','leather4','leather5','leather6','leather7','leather8'];
  const parts=Object.fromEntries(partKeys.map(key=>{const part=input.parts?.[key];return [key,{color:text(part?.color,40),material:text(part?.material,80)}]}));
  const record={sport:text(input.sport,40),position:text(input.position,80),fit:text(input.fit,40),size:text(input.size,40),throwingHand:text(input.throwingHand,50),series:text(input.series,80),webStyle:text(input.webStyle,80),parts,quantity:text(input.quantity,80),personalization:text(input.personalization,800),market,email,notes:text(input.notes,1200)};
  if(!record.sport||!record.position||!record.fit||!record.size||!record.throwingHand||!record.series)return reply({error:'The glove base specification is incomplete.'},422);
  const id=crypto.randomUUID(),createdAt=new Date().toISOString();
  try{await env.ORDERS_DB.prepare('INSERT INTO custom_orders (id,created_at,customer_email,market,status,specification_json) VALUES (?,?,?,?,?,?)').bind(id,createdAt,email,market,'new',JSON.stringify(record)).run()}
  catch(error){console.error('custom order insert failed',error);return reply({error:'Could not save the specification. Please try again.'},500)}
  return reply({ok:true,orderId:id,createdAt},201);
}

export async function onRequestOptions(){return new Response(null,{status:204,headers:{'allow':'POST, OPTIONS','cache-control':'no-store'}})}
