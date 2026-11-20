const recentByClient=new Map();
const activityNames=new Set(['Пицца','Кино','Игры','18+']);
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});

export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(url.pathname==='/api/choice'){
      if(request.method!=='POST')return json({error:'Method not allowed'},405);
      const origin=request.headers.get('Origin');if(origin&&origin!==url.origin)return json({error:'Forbidden'},403);
      if(!env.NTFY_TOPIC||!/^[A-Za-z0-9_-]{20,64}$/.test(env.NTFY_TOPIC))return json({error:'Notifications are not configured'},503);
      const client=request.headers.get('CF-Connecting-IP')||'unknown',now=Date.now(),recent=(recentByClient.get(client)||[]).filter(time=>now-time<60_000);
      if(recent.length>=5){recentByClient.set(client,recent);return json({error:'Too many requests'},429)}recent.push(now);recentByClient.set(client,recent);
      let choice;try{if(Number(request.headers.get('Content-Length')||0)>3000)return json({error:'Request too large'},413);choice=await request.json()}catch{return json({error:'Invalid request'},400)}
      if(!/^\d{4}-\d{2}-\d{2}$/.test(choice.date||'')||!/^\d{2}:\d{2}$/.test(choice.time||'')||!activityNames.has(choice.activity))return json({error:'Invalid choice'},400);
      const day=new Date(choice.date+'T12:00:00Z').toLocaleDateString('ru-RU',{day:'numeric',month:'long',timeZone:'UTC'});
      try{
        const sent=await fetch(`https://ntfy.sh/${env.NTFY_TOPIC}`,{method:'POST',headers:{Title:'Выбрали свидание 💌',Tags:'heart',Priority:'default'},body:`Дата: ${day}\nВремя: ${choice.time}\nЗанятие: ${choice.activity}`,signal:AbortSignal.timeout(8000)});
        if(!sent.ok)return json({error:'Notification service failed'},502);
        return json({sent:1});
      }catch{return json({error:'Notification service unavailable'},502)}
    }
    if(url.pathname.startsWith('/api/'))return json({error:'Not found'},404);
    return env.ASSETS.fetch(request);
  }
};
