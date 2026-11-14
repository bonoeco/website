const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
export async function onRequestGet({env}){
  if(!env.ORDERS_DB)return json({error:'Order database is not configured.'},503);
  try{const result=await env.ORDERS_DB.prepare('SELECT id,created_at,customer_email,market,status,specification_json FROM custom_orders ORDER BY created_at DESC LIMIT 500').all();return json({orders:(result.results||[]).map(row=>({...row,specification:JSON.parse(row.specification_json)}))})}
  catch(error){console.error('custom orders read failed',error);return json({error:'Could not load custom orders.'},500)}
}
