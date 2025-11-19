
const express = require('express');
const fs = require('fs');
const path = require('path');
const RSSParser = require('rss-parser');
const parser = new RSSParser();
const app = express();
app.use(express.json());
app.use(require('cors')());

const DATA_FILE = path.join(__dirname, '../data/articles.json');

app.get('/api/articles', (req,res)=>{
  try{
    const raw = fs.readFileSync(DATA_FILE,'utf8');
    const arr = JSON.parse(raw);
    return res.json(arr);
  }catch(e){
    return res.json([]);
  }
});

// POST /api/fetch-rss  with body { feeds: [url1,url2] }  OR set env RSS_FEEDS (comma separated)
app.post('/api/fetch-rss', async (req,res)=>{
  const feeds = (process.env.RSS_FEEDS || (req.body && (req.body.feeds||[]).join(',')) || '').split(',').map(s=>s.trim()).filter(Boolean);
  if(feeds.length===0) return res.status(400).json({error: 'No feeds configured. Send feeds in POST body or set RSS_FEEDS env var.'});
  let all = [];
  for(const url of feeds){
    try{
      const feed = await parser.parseURL(url);
      const items = (feed.items||[]).slice(0,20).map((i,idx)=>({ title: i.title, summary: i.contentSnippet||i.content||i.summary||'', datetime: i.pubDate||new Date().toISOString(), source: feed.title||url, link: i.link||'' }));
      all = all.concat(items);
    }catch(e){
      console.error('Error fetching feed', url, e.message);
    }
  }
  // normalize and persist
  const normalized = all.map((it,idx)=>({ id: String(idx+1), ...it, category: (Math.random()>0.5?'Economía Internacional':'Política Internacional') }));
  fs.writeFileSync(DATA_FILE, JSON.stringify(normalized,null,2),'utf8');
  res.json({fetched: normalized.length});
});

// Serve static built client when in production
if(process.env.NODE_ENV==='production'){
  const clientDist = path.join(__dirname,'../client/dist');
  app.use(express.static(clientDist));
  app.get('*',(req,res)=> res.sendFile(path.join(clientDist,'index.html')));
}

const PORT = process.env.PORT || 4000;
app.listen(PORT, ()=> console.log('Server running on', PORT));
