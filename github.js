/* Repository-backed JSON storage. Token stays in memory for the current tab. */
(function(root){
  'use strict';
  const decode=s=>new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g,'')),c=>c.charCodeAt(0)));
  const encode=s=>{const a=new TextEncoder().encode(s);let t='';for(let i=0;i<a.length;i+=8192)t+=String.fromCharCode(...a.subarray(i,i+8192));return btoa(t);};
  class Repository {
    constructor(config){this.config=config;this.token='';this.sha=null;this.busy=false;}
    url(){const c=this.config;return `https://api.github.com/repos/${encodeURIComponent(c.owner)}/${encodeURIComponent(c.repo)}/contents/docs/data/workbook.json`;}
    async request(url,options={}){const res=await fetch(url,{cache:'no-store',...options,headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',...(this.token?{Authorization:`Bearer ${this.token}`} : {}),...options.headers},signal:AbortSignal.timeout(30000)});if(!res.ok){const e=new Error(res.status===409?'Another device has saved changes. Back up your draft, then refresh before editing again.':res.status===401?'GitHub token is invalid or expired. Reconnect in Data & setup.':res.status===403?'GitHub refused access. Check token permissions, branch rules, and API rate limits.':res.status===404?'Repository, branch, or data file not found. Upload the site files first and check setup.':`GitHub could not complete the request (${res.status}). Your local draft is safe.`);e.status=res.status;throw e;}return res;}
    async read(){const suffix=this.config.branch?`?ref=${encodeURIComponent(this.config.branch)}`:'';const meta=await (await this.request(this.url()+suffix)).json();let text;if(meta.encoding==='base64'&&meta.content)text=decode(meta.content);else {const pinned=`?ref=${encodeURIComponent(meta.sha)}`; // Read the immutable blob to avoid a metadata/content race.
        const blob=await (await this.request(`https://api.github.com/repos/${encodeURIComponent(this.config.owner)}/${encodeURIComponent(this.config.repo)}/git/blobs/${encodeURIComponent(meta.sha)}`)).json();text=decode(blob.content);}
      return {sha:meta.sha,state:BO.validate(JSON.parse(text))};}
    async write(state){if(this.busy)throw Error('A GitHub save is already running.');if(!this.token)throw Error('Connect a GitHub token in Data & setup to save.');if(!this.sha)throw Error('Refresh from GitHub before your first save.');this.busy=true;try{const body={message:'Update Brick & Olive workbook',content:encode(JSON.stringify(state,null,2)+'\n'),sha:this.sha,...(this.config.branch?{branch:this.config.branch}:{})};const result=await (await this.request(this.url(),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})).json();this.sha=result.content.sha;return this.sha;}finally{this.busy=false;}}
  }
  root.BORepository=Repository;
})(globalThis);
